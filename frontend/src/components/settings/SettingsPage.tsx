import { ChecklistCatalog } from './ChecklistCatalog';
import { BranchesCatalog } from './BranchesCatalog';
import { CompanyBrandingSettings } from './CompanyBrandingSettings';

export const SettingsPage = () => {
  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <CompanyBrandingSettings />
        <div className="space-y-4">
          <BranchesCatalog />
          <ChecklistCatalog />
        </div>
      </div>
    </div>
  );
};
