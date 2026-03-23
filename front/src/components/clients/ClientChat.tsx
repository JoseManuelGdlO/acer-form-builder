import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, PauseCircle, PlayCircle, Send, User } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'client' | 'agent';
  timestamp: Date;
}

interface ClientChatProps {
  clientId: string;
  clientName: string;
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  isConversationPaused: boolean;
  onToggleConversationPause: () => void | Promise<void>;
  isTogglingConversationPause: boolean;
  canToggleConversationPause: boolean;
}

export const ClientChat = ({
  clientId,
  clientName,
  messages,
  onSendMessage,
  isConversationPaused,
  onToggleConversationPause,
  isTogglingConversationPause,
  canToggleConversationPause,
}: ClientChatProps) => {
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null;
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="border-border/50 flex flex-col h-full">
      <CardHeader className="px-6 py-4 border-b border-border/50 flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          Chat con {clientName}
        </CardTitle>
        <Button
          type="button"
          size="sm"
          variant={isConversationPaused ? 'secondary' : 'outline'}
          onClick={onToggleConversationPause}
          disabled={isTogglingConversationPause || !canToggleConversationPause}
          className="shrink-0 self-center"
        >
          {isConversationPaused ? (
            <PlayCircle className="w-4 h-4 mr-1.5" />
          ) : (
            <PauseCircle className="w-4 h-4 mr-1.5" />
          )}
          {isTogglingConversationPause
            ? 'Actualizando...'
            : isConversationPaused
              ? 'Reanudar'
              : 'Pausar'}
        </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <MessageCircle className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">
                No hay mensajes aún
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                Inicia una conversación con el cliente
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.sender === 'agent' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.sender === 'agent' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    <User className="w-4 h-4" />
                  </div>
                  <div className={`flex-1 max-w-[75%] ${
                    message.sender === 'agent' ? 'flex flex-col items-end' : ''
                  }`}>
                    <div className={`rounded-2xl px-4 py-2.5 ${
                      message.sender === 'agent'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1 px-1">
                      {format(message.timestamp, 'HH:mm', { locale: es })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="p-4 border-t border-border/50">
          <div className="flex gap-2">
            <Input
              placeholder="Escribe un mensaje..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button 
              onClick={handleSend} 
              size="icon"
              disabled={!newMessage.trim()}
              className="shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
