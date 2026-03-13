import { BotBehavior } from '@/types/chatbot';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Bot, MessageSquare, Sparkles, Clock, AlertCircle, Power } from 'lucide-react';

interface BotBehaviorSettingsProps {
  behavior: BotBehavior;
  onUpdate: (updates: Partial<BotBehavior>) => void;
}

export const BotBehaviorSettings = ({ behavior, onUpdate }: BotBehaviorSettingsProps) => {
  return (
    <div className="space-y-6">
      {/* Estado del Bot */}
      <Card className="border-2 border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${behavior.isActive ? 'bg-green-100' : 'bg-muted'}`}>
                <Power className={`w-5 h-5 ${behavior.isActive ? 'text-green-600' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <h3 className="font-medium">Estado del Bot</h3>
                <p className="text-sm text-muted-foreground">
                  {behavior.isActive ? 'El bot está activo y respondiendo' : 'El bot está desactivado'}
                </p>
              </div>
            </div>
            <Switch
              checked={behavior.isActive}
              onCheckedChange={(checked) => onUpdate({ isActive: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Identidad del Bot */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="w-5 h-5 text-primary" />
            Identidad del Bot
          </CardTitle>
          <CardDescription>Define el nombre y personalidad de tu asistente virtual</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bot-name">Nombre del Bot</Label>
            <Input
              id="bot-name"
              value={behavior.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="Ej: Asistente virtual"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="personality" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
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

          <div className="space-y-2">
            <Label htmlFor="tone">Tono de Comunicación</Label>
            <Select
              value={behavior.tone}
              onValueChange={(value: 'formal' | 'friendly' | 'professional') => onUpdate({ tone: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un tono" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="formal">Formal - Muy respetuoso y serio</SelectItem>
                <SelectItem value="professional">Profesional - Equilibrado y cortés</SelectItem>
                <SelectItem value="friendly">Amigable - Cercano y casual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Mensajes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="w-5 h-5 text-primary" />
            Mensajes Predefinidos
          </CardTitle>
          <CardDescription>Configura los mensajes automáticos del bot</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="greeting">Mensaje de Bienvenida</Label>
            <Textarea
              id="greeting"
              value={behavior.greeting}
              onChange={(e) => onUpdate({ greeting: e.target.value })}
              placeholder="¡Hola! ¿En qué puedo ayudarte?"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fallback" className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
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
        </CardContent>
      </Card>

      {/* Comportamiento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-primary" />
            Comportamiento
          </CardTitle>
          <CardDescription>Ajusta el comportamiento del bot</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Tiempo de respuesta</Label>
              <span className="text-sm text-muted-foreground">{behavior.responseDelay}ms</span>
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
        </CardContent>
      </Card>
    </div>
  );
};
