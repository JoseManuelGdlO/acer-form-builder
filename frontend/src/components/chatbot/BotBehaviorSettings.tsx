import { BotBehavior } from '@/types/chatbot';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { StatusBadge } from '@/components/layout/StatusBadge';
import { Save } from 'lucide-react';

interface BotBehaviorSettingsProps {
  behavior: BotBehavior;
  onUpdate: (updates: Partial<BotBehavior>) => void;
  onFlush?: () => Promise<void>;
}

export const BotBehaviorSettings = ({ behavior, onUpdate, onFlush }: BotBehaviorSettingsProps) => {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <h2 className="font-display text-lg font-semibold">Estado del bot</h2>
          <p className="text-xs text-muted-foreground">
            {behavior.isActive ? 'El bot está activo y respondiendo' : 'El bot está desactivado'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge tone={behavior.isActive ? 'success' : 'neutral'}>
            {behavior.isActive ? 'Activo' : 'Inactivo'}
          </StatusBadge>
          <Switch
            checked={behavior.isActive}
            onCheckedChange={(checked) => onUpdate({ isActive: checked })}
            aria-label="Activar o desactivar el bot"
          />
        </div>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="bot-name" className="text-xs font-medium">
            Nombre del asistente
          </Label>
          <Input
            id="bot-name"
            value={behavior.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Ej: Asistente virtual"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tone" className="text-xs font-medium">
            Tono
          </Label>
          <Select
            value={behavior.tone}
            onValueChange={(value: 'formal' | 'friendly' | 'professional') => onUpdate({ tone: value })}
          >
            <SelectTrigger id="tone">
              <SelectValue placeholder="Selecciona un tono" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="formal">Formal — muy respetuoso y serio</SelectItem>
              <SelectItem value="professional">Profesional — equilibrado y cortés</SelectItem>
              <SelectItem value="friendly">Amigable — cercano y casual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="personality" className="text-xs font-medium">
            Personalidad
          </Label>
          <Textarea
            id="personality"
            value={behavior.personality}
            onChange={(e) => onUpdate({ personality: e.target.value })}
            placeholder="Describe la personalidad del bot..."
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Describe cómo debe comportarse el bot, su estilo de comunicación y conocimientos.
          </p>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="greeting" className="text-xs font-medium">
            Mensaje de bienvenida
          </Label>
          <Textarea
            id="greeting"
            value={behavior.greeting}
            onChange={(e) => onUpdate({ greeting: e.target.value })}
            placeholder="¡Hola! ¿En qué puedo ayudarte?"
            className="min-h-28"
            rows={3}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="fallback" className="text-xs font-medium">
            Mensaje cuando no entiende
          </Label>
          <Textarea
            id="fallback"
            value={behavior.fallbackMessage}
            onChange={(e) => onUpdate({ fallbackMessage: e.target.value })}
            placeholder="Lo siento, no tengo información sobre esa consulta..."
            rows={2}
          />
          <p className="text-xs text-muted-foreground">
            Este mensaje se muestra cuando el bot no encuentra una respuesta en las FAQs.
          </p>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="branches-text" className="text-xs font-medium">
            Sucursales (texto)
          </Label>
          <Textarea
            id="branches-text"
            value={behavior.branchesText}
            onChange={(e) => onUpdate({ branchesText: e.target.value })}
            placeholder="Ej.: una sucursal por línea o direcciones y horarios"
            rows={4}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="social-links" className="text-xs font-medium">
            Enlaces a redes sociales
          </Label>
          <Textarea
            id="social-links"
            value={behavior.socialLinks}
            onChange={(e) => onUpdate({ socialLinks: e.target.value })}
            placeholder="Un enlace por línea (Instagram, Facebook, sitio web...)"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-phone" className="text-xs font-medium">
            Teléfono de contacto
          </Label>
          <Input
            id="contact-phone"
            type="tel"
            value={behavior.contactPhone}
            onChange={(e) => onUpdate({ contactPhone: e.target.value })}
            placeholder="Ej.: +52 55 1234 5678"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Tiempo de respuesta</Label>
            <span className="text-xs text-muted-foreground">{behavior.responseDelay} ms</span>
          </div>
          <Slider
            value={[behavior.responseDelay]}
            onValueChange={([value]) => onUpdate({ responseDelay: value })}
            min={0}
            max={3000}
            step={100}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Delay antes de mostrar la respuesta. Un pequeño delay hace que el bot se sienta más natural.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={() => {
            void onFlush?.();
          }}
        >
          <Save />
          Guardar configuración
        </Button>
        <p className="text-xs text-muted-foreground">
          Los cambios también se guardan solos tras una breve pausa.
        </p>
      </div>
    </Card>
  );
};
