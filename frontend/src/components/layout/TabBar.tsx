import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type TabBarItem = {
  id: string;
  label: string;
  disabled?: boolean;
  title?: string;
};

export type TabBarProps = {
  tabs: Array<string | TabBarItem>;
  value: string;
  onChange: (id: string) => void;
  className?: string;
};

function normalizeTab(tab: string | TabBarItem): TabBarItem {
  return typeof tab === 'string' ? { id: tab, label: tab } : tab;
}

/** Pestañas visuales. El caller conserva el estado y las llamadas a API. */
export function TabBar({ tabs, value, onChange, className }: TabBarProps) {
  const items = tabs.map(normalizeTab);

  return (
    <div className={cn('mb-4 flex gap-1 overflow-x-auto rounded-md bg-muted p-1', className)}>
      {items.map((tab) => (
        <Button
          key={tab.id}
          type="button"
          size="sm"
          variant={value === tab.id ? 'default' : 'ghost'}
          disabled={tab.disabled}
          title={tab.title}
          className="shrink-0"
          onClick={() => {
            if (tab.disabled) return;
            onChange(tab.id);
          }}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}
