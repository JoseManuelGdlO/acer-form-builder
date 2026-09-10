import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function DomainNotConfigured() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md overflow-hidden shadow-card">
        <div className="h-1.5 bg-secondary" aria-hidden />
        <CardHeader>
          <div className="mb-2 flex justify-center">
            <div className="grid size-14 place-items-center rounded-full bg-muted">
              <AlertCircle className="h-7 w-7 text-muted-foreground" />
            </div>
          </div>
          <CardTitle className="text-center font-display text-xl font-semibold">
            Dominio no configurado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            Este dominio no está asociado a ninguna empresa. Por favor, contacte al administrador o acceda desde la URL correcta.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
