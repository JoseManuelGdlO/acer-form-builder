import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function DomainNotConfigured() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-2">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle className="text-center text-xl">Dominio no configurado</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            Este dominio no está asociado a ninguna empresa. Por favor, contacte al administrador o acceda desde la URL correcta.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
