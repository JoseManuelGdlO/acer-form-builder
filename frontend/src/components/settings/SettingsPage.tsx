import { ChecklistCatalog } from './ChecklistCatalog';
import { BranchesCatalog } from './BranchesCatalog';
import { CompanyBrandingSettings } from './CompanyBrandingSettings';
import { Settings } from 'lucide-react';

export const SettingsPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <Settings className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Configuración</h2>
          <p className="text-muted-foreground">Gestiona la configuración del sistema</p>
        </div>
      </div>

      <CompanyBrandingSettings />
      <BranchesCatalog />
      <ChecklistCatalog />
    </div>
  );
};
