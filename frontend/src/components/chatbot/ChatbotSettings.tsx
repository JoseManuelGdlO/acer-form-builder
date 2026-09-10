import { useState, useEffect } from 'react';
import { useChatbotStore } from '@/hooks/useChatbotStore';
import { FAQ } from '@/types/chatbot';
import { FAQCard } from './FAQCard';
import { FAQFormModal } from './FAQFormModal';
import { BotBehaviorSettings } from './BotBehaviorSettings';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toolbar } from '@/components/layout/Toolbar';
import { TabBar } from '@/components/layout/TabBar';
import { SectionTitle } from '@/components/layout/SectionTitle';
import { Bot, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const ChatbotSettings = () => {
  const {
    faqs,
    faqsLoading,
    botBehavior,
    botBehaviorLoading,
    fetchFAQs,
    fetchBotBehavior,
    flushBotBehavior,
    addFAQ,
    updateFAQ,
    deleteFAQ,
    toggleFAQStatus,
    updateBotBehavior,
    getFAQStats,
  } = useChatbotStore();

  useEffect(() => {
    fetchFAQs();
    fetchBotBehavior();
    return () => {
      void flushBotBehavior();
    };
  }, [fetchFAQs, fetchBotBehavior, flushBotBehavior]);

  const [tab, setTab] = useState('faqs');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);

  const stats = getFAQStats();

  const filteredFAQs = faqs
    .filter(
      (faq) =>
        faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.category?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.order - b.order);

  const handleEdit = (faq: FAQ) => {
    setEditingFAQ(faq);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta pregunta frecuente?')) return;
    try {
      await deleteFAQ(id);
      toast.success('FAQ eliminada correctamente');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar la FAQ');
    }
  };

  const handleSave = async (question: string, answer: string, category?: string) => {
    try {
      await addFAQ(question, answer, category);
      toast.success('FAQ agregada correctamente');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al agregar la FAQ');
    }
  };

  const handleUpdate = async (id: string, updates: Partial<FAQ>) => {
    try {
      await updateFAQ(id, updates);
      toast.success('FAQ actualizada correctamente');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al actualizar la FAQ');
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await toggleFAQStatus(id);
      toast.success('Estado actualizado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al cambiar el estado');
    }
  };

  const handleCloseModal = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) setEditingFAQ(null);
  };

  const handleFlushBehavior = async () => {
    await flushBotBehavior();
    toast.success('Configuración guardada');
  };

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs text-muted-foreground">Total FAQs</p>
          <p className="mt-2 font-display text-2xl font-semibold">{stats.total}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground">Activas</p>
          <p className="mt-2 font-display text-2xl font-semibold text-success">{stats.active}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground">Inactivas</p>
          <p className="mt-2 font-display text-2xl font-semibold">{stats.inactive}</p>
        </Card>
      </div>

      <TabBar
        tabs={[
          { id: 'faqs', label: 'Preguntas frecuentes' },
          { id: 'behavior', label: 'Comportamiento' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'faqs' ? (
        <>
          <Toolbar
            search={searchTerm}
            onSearchChange={setSearchTerm}
            placeholder="Buscar preguntas…"
          >
            <Button type="button" onClick={() => setIsModalOpen(true)} disabled={faqsLoading}>
              <Plus />
              Nueva pregunta
            </Button>
          </Toolbar>

          {faqsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : filteredFAQs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-16 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted/50">
                <Bot className="size-8 text-muted-foreground" />
              </div>
              <h3 className="mb-1 font-display text-lg font-semibold text-foreground">
                {searchTerm ? 'Sin resultados' : 'No hay preguntas frecuentes'}
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {searchTerm
                  ? 'No se encontraron preguntas con ese término'
                  : 'Agrega preguntas y respuestas para que el bot pueda ayudar a tus clientes.'}
              </p>
              {!searchTerm ? (
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(true)}>
                  <Plus />
                  Agregar primera FAQ
                </Button>
              ) : null}
            </div>
          ) : (
            <Card className="p-5">
              <SectionTitle title="Base de respuestas" />
              {filteredFAQs.map((faq) => (
                <FAQCard
                  key={faq.id}
                  faq={faq}
                  onEdit={() => handleEdit(faq)}
                  onDelete={() => handleDelete(faq.id)}
                  onToggleStatus={() => handleToggleStatus(faq.id)}
                />
              ))}
            </Card>
          )}
        </>
      ) : botBehaviorLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : (
        <BotBehaviorSettings
          behavior={botBehavior}
          onUpdate={updateBotBehavior}
          onFlush={handleFlushBehavior}
        />
      )}

      <FAQFormModal
        open={isModalOpen}
        onOpenChange={handleCloseModal}
        faq={editingFAQ}
        onSave={handleSave}
        onUpdate={handleUpdate}
      />
    </div>
  );
};
