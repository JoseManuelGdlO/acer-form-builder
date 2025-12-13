import saruLogo from '@/assets/saru-logo.png';

interface AppHeaderProps {
  children?: React.ReactNode;
}

export function AppHeader({ children }: AppHeaderProps) {
  return (
    <div className="border-b border-border/50 bg-card shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <img 
              src={saruLogo} 
              alt="Saru Visas" 
              className="h-10 w-auto"
            />
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-primary leading-none">SARU</h1>
              <p className="text-xs text-muted-foreground">Visa y Pasaporte</p>
            </div>
          </div>
          
          {/* Navigation */}
          <div className="flex items-center gap-2">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
