import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { getCompanyBrandLogo } from '@/lib/theme';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setAuthFromLoginResponse } = useAuth();
  const { tenant } = useTenant();
  const navigate = useNavigate();

  const companyName = tenant?.company?.name || 'Sistema';
  const logoUrl = getCompanyBrandLogo(tenant?.theme, tenant?.company?.logoUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.login(email, password);
      if (tenant?.company && response.user?.company?.id && response.user.company.id !== tenant.company.id) {
        toast.error('No puedes iniciar sesión en este dominio con una cuenta de otra empresa.');
        setIsLoading(false);
        return;
      }
      setAuthFromLoginResponse(response);
      toast.success('Inicio de sesión exitoso');
      navigate('/');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al iniciar sesión';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center px-4 sm:h-20 sm:px-6 lg:px-8">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={companyName}
              className="h-10 w-auto max-w-40 shrink-0 object-contain object-left sm:h-11"
            />
          ) : (
            <span className="truncate font-display text-lg font-bold">{companyName}</span>
          )}
        </div>
        <div className="h-1 bg-secondary" aria-hidden />
      </header>

      <main className="flex flex-1 flex-col lg:flex-row">
        <section className="relative bg-sidebar px-6 py-8 text-sidebar-foreground sm:px-10 sm:py-10 lg:flex lg:w-[46%] lg:flex-col lg:justify-center lg:px-14 xl:px-20">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div className="absolute -right-24 -top-16 size-72 rounded-full bg-sidebar-accent" />
            <div className="absolute -bottom-28 -left-20 size-80 rounded-full bg-primary/20" />
            <span className="absolute bottom-14 right-12 size-2 rounded-full bg-secondary" />
            <span className="absolute right-28 top-20 size-1.5 rounded-full bg-secondary" />
          </div>

          <div className="relative min-w-0 max-w-md space-y-5 sm:space-y-6">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt=""
                className="hidden h-20 w-auto max-w-[280px] object-contain lg:block xl:h-24"
              />
            ) : null}
            <div className="h-1 w-12 rounded-full bg-secondary" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-sidebar-foreground/60">
              Centro de operación
            </p>
            <h1 className="break-words font-display text-2xl font-semibold leading-tight sm:text-3xl lg:text-4xl">
              Bienvenido al panel de {companyName}
            </h1>
            <p className="max-w-sm text-sm leading-relaxed text-sidebar-foreground/70">
              Accede con tu cuenta para continuar con clientes, viajes y la operación del día.
            </p>
            <p className="text-xs text-sidebar-foreground/50">
              {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
            </p>
          </div>
        </section>

        <section className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
          <Card className="w-full max-w-md p-6 shadow-card sm:p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Acceso
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold">Iniciar sesión</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ingresa tus credenciales para continuar.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium">
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-medium">
                  Contraseña
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="h-11"
                />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                <LogIn />
                {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </Button>
            </form>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default Login;
