import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md overflow-hidden shadow-card">
        <div className="h-1.5 bg-secondary" aria-hidden />
        <CardContent className="p-8 text-center">
          <p className="font-display text-7xl font-bold text-primary">404</p>
          <h1 className="mt-4 font-display text-xl font-semibold">Página no encontrada</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            La página que buscas no existe o se ha movido.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Volver al inicio</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
