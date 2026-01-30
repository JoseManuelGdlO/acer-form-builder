import { useState, useEffect } from 'react';
import { useChatbotStore } from '@/hooks/useChatbotStore';
import { FAQ } from '@/types/chatbot';
import { FAQCard } from './FAQCard';
import { FAQFormModal } from './FAQFormModal';
import { BotBehaviorSettings } from './BotBehaviorSettings';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bot, 
  MessageCircleQuestion, 
  Plus, 
  Search, 
  Settings2,
  HelpCircle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export const ChatbotSettings = () => {
  const { 
    faqs, 
    faqsLoading,
    botBehavior, 
    fetchFAQs,
    addFAQ, 
    updateFAQ, 
    deleteFAQ, 
    toggleFAQStatus,
    updateBotBehavior,
    getFAQStats 
  } = useChatbotStore();

  useEffect(() => {
    fetchFAQs();
  }, [fetchFAQs]);
  
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

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total FAQs</p>
                <p className="text-3xl font-bold text-primary">{stats.total}</p>
              </div>
              <HelpCircle className="w-10 h-10 text-primary/60" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Activas</p>
                <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500/60" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Inactivas</p>
                <p className="text-3xl font-bold text-orange-600">{stats.inactive}</p>
              </div>
              <XCircle className="w-10 h-10 text-orange-500/60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="faqs" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="faqs" className="gap-2">
            <MessageCircleQuestion className="w-4 h-4" />
            Preguntas Frecuentes
          </TabsTrigger>
          <TabsTrigger value="behavior" className="gap-2">
            <Settings2 className="w-4 h-4" />
            Comportamiento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="faqs" className="mt-6">
          {/* Search and Add */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar preguntas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => setIsModalOpen(true)} className="gap-2" disabled={faqsLoading}>
              <Plus className="w-4 h-4" />
              Nueva FAQ
            </Button>
          </div>

          {/* FAQ List */}
          {faqsLoading ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-10 h-10 text-muted-foreground animate-spin mb-4" />
                <p className="text-muted-foreground">Cargando preguntas frecuentes...</p>
              </CardContent>
            </Card>
          ) : filteredFAQs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bot className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay preguntas frecuentes</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Agrega preguntas y respuestas para que el bot pueda ayudar a tus clientes.
                </p>
                <Button onClick={() => setIsModalOpen(true)} variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Agregar primera FAQ
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredFAQs.map((faq) => (
                <FAQCard
                  key={faq.id}
                  faq={faq}
                  onEdit={() => handleEdit(faq)}
                  onDelete={() => handleDelete(faq.id)}
                  onToggleStatus={() => handleToggleStatus(faq.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="behavior" className="mt-6">
          <BotBehaviorSettings 
            behavior={botBehavior} 
            onUpdate={updateBotBehavior} 
          />
        </TabsContent>
      </Tabs>

      {/* Modal */}
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
