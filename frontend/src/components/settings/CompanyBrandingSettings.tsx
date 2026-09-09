import { useState, useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  applyTheme,
  hslStringToHex,
  hexToHslString,
  THEME_COLOR_KEYS,
  DEFAULT_THEME,
  APP_BACKGROUND_IMAGE_KEY,
  DASHBOARD_CARD_OPACITY_KEY,
  DASHBOARD_CENTER_LOGO_IMAGE_KEY,
  getDashboardCardOpacity,
} from '@/lib/theme';
import { applyFavicon } from '@/lib/favicon';
import { useTenant } from '@/contexts/TenantContext';
import { SectionTitle } from '@/components/layout/SectionTitle';
import {
  ChevronDown,
  ChevronRight,
  Palette,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';

const FEATURED_COLORS: { key: string; label: string }[] = [
  { key: 'primary', label: 'Azul principal' },
  { key: 'secondary', label: 'Amarillo secundario' },
  { key: 'accent', label: 'Rojo de acento' },
  { key: 'background', label: 'Fondo' },
];

const FEATURED_KEY_SET = new Set(FEATURED_COLORS.map((c) => c.key));

const COLOR_GROUPS: { title: string; keys: { key: string; label: string }[] }[] = [
  {
    title: 'Colores principales',
    keys: [
      { key: 'primary-foreground', label: 'Texto sobre primario' },
      { key: 'secondary-foreground', label: 'Texto sobre secundario' },
    ],
  },
  {
    title: 'Fondo y texto',
    keys: [{ key: 'foreground', label: 'Texto principal' }],
  },
  {
    title: 'Cards',
    keys: [
      { key: 'card', label: 'Fondo de tarjetas' },
      { key: 'card-foreground', label: 'Texto en tarjetas' },
    ],
  },
  {
    title: 'Muted y acento',
    keys: [
      { key: 'muted', label: 'Muted (fondos suaves)' },
      { key: 'muted-foreground', label: 'Texto secundario' },
    ],
  },
  {
    title: 'Bordes',
    keys: [
      { key: 'border', label: 'Borde' },
      { key: 'ring', label: 'Ring (focus)' },
    ],
  },
  {
    title: 'Cabecera y barra lateral',
    keys: [
      { key: 'sidebar-background', label: 'Fondo barra lateral' },
      { key: 'sidebar-foreground', label: 'Texto barra lateral' },
      { key: 'sidebar-primary', label: 'Elemento activo / primario' },
      { key: 'sidebar-primary-foreground', label: 'Texto sobre primario sidebar' },
      { key: 'sidebar-accent', label: 'Acento sidebar' },
      { key: 'sidebar-accent-foreground', label: 'Texto sobre acento sidebar' },
      { key: 'sidebar-border', label: 'Borde sidebar' },
      { key: 'sidebar-ring', label: 'Ring sidebar' },
    ],
  },
];

function CompactColorPicker({
  label,
  hslValue,
  onHexChange,
}: {
  label: string;
  hslValue: string;
  onHexChange: (hex: string) => void;
}) {
  const hex = hslValue ? hslStringToHex(hslValue) : hslStringToHex(DEFAULT_THEME.primary);
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border p-3">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="color"
        value={hex}
        onChange={(e) => onHexChange(e.target.value)}
        className="h-8 w-12 cursor-pointer rounded border-0 bg-transparent"
        aria-label={label}
      />
    </label>
  );
}

/** Redimensiona y exporta data URL; permite preservar transparencia con PNG/WebP. */
function compressImageFileToDataUrl(
  file: File,
  options?: { maxWidth?: number; quality?: number; outputType?: 'image/jpeg' | 'image/png' | 'image/webp' }
): Promise<string> {
  const maxWidth = options?.maxWidth ?? 1920;
  const quality = options?.quality ?? 0.85;
  const outputType = options?.outputType ?? 'image/jpeg';
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo crear el contexto del canvas'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL(outputType, quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo cargar la imagen'));
    };
    img.src = url;
  });
}

function parseSavedTheme(raw: unknown): Record<string, string> {
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return { ...(parsed as Record<string, string>) };
      }
    } catch {
      return {};
    }
  }
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  return { ...(raw as Record<string, string>) };
}

function mergeWithDefaultTheme(saved: Record<string, string>): Record<string, string> {
  return { ...DEFAULT_THEME, ...saved };
}

function getEffectiveTheme(theme: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  THEME_COLOR_KEYS.forEach((key) => {
    const v = theme[key];
    out[key] = v != null && v !== '' ? v : (DEFAULT_THEME[key] ?? '');
  });
  return out;
}

function radiusToNumber(value: string): number {
  const match = value.match(/^([\d.]+)rem$/);
  if (match) return parseFloat(match[1]) * 16;
  const num = parseFloat(value);
  return Number.isNaN(num) ? 8 : num;
}

function numberToRadius(num: number): string {
  return `${(num / 16).toFixed(2)}rem`;
}

export function CompanyBrandingSettings() {
  const { tenant, loadTenant } = useTenant();
  const [domain, setDomain] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [theme, setTheme] = useState<Record<string, string>>({});
  const [advisorClientAccessMode, setAdvisorClientAccessMode] = useState<'assigned_only' | 'company_wide'>('assigned_only');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [hslOpen, setHslOpen] = useState(false);
  const [isCompressingBg, setIsCompressingBg] = useState(false);
  const [isCompressingCenterLogo, setIsCompressingCenterLogo] = useState(false);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const centerLogoInputRef = useRef<HTMLInputElement>(null);

  const effectiveTheme = useMemo(() => getEffectiveTheme(theme), [theme]);
  const appBackgroundImage = theme[APP_BACKGROUND_IMAGE_KEY] ?? '';
  const dashboardCenterLogoImage = theme[DASHBOARD_CENTER_LOGO_IMAGE_KEY] ?? '';
  const dashboardCardOpacity = getDashboardCardOpacity(theme);
  const companyName = tenant?.company.name ?? 'Tu empresa';

  useEffect(() => {
    let cancelled = false;
    api
      .getMyCompany()
      .then((company) => {
        if (!cancelled) {
          setDomain(company.domain ?? '');
          setLogoUrl(company.logoUrl ?? '');
          setFaviconUrl(company.faviconUrl ?? '');
          setTheme(mergeWithDefaultTheme(parseSavedTheme(company.theme)));
          setAdvisorClientAccessMode(company.advisorClientAccessMode ?? 'assigned_only');
        }
      })
      .catch(() => {
        if (!cancelled) toast.error('Error al cargar la empresa');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await api.updateMyCompany({
        domain: domain.trim() || null,
        logoUrl: logoUrl.trim() || null,
        faviconUrl: faviconUrl.trim() || null,
        theme,
        advisorClientAccessMode,
      });
      const mergedAfterSave = mergeWithDefaultTheme({
        ...theme,
        ...parseSavedTheme(res.theme),
      });
      setTheme(mergedAfterSave);
      applyTheme(mergedAfterSave);
      applyFavicon(res.faviconUrl ?? res.logoUrl ?? null);
      const hostname = window.location.hostname;
      const domainToUse = hostname === 'localhost' || hostname === '127.0.0.1' ? 'aser' : hostname;
      await loadTenant(domainToUse);
      toast.success('Configuración guardada');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const updateColor = (key: string, hslValue: string) => {
    setTheme((t) => ({ ...t, [key]: hslValue }));
  };

  const handleColorPickerChange = (key: string, hex: string) => {
    updateColor(key, hexToHslString(hex));
  };

  const handleResetTheme = () => {
    setTheme({ ...DEFAULT_THEME });
    toast.success('Tema restablecido a valores por defecto');
  };

  const handleBackgroundFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Selecciona un archivo de imagen');
      return;
    }
    setIsCompressingBg(true);
    try {
      const dataUrl = await compressImageFileToDataUrl(file, { outputType: 'image/jpeg' });
      setTheme((t) => ({ ...t, [APP_BACKGROUND_IMAGE_KEY]: dataUrl }));
      toast.success('Imagen preparada; pulsa «Guardar» para persistirla');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al procesar la imagen');
    } finally {
      setIsCompressingBg(false);
    }
  };

  const clearBackgroundImage = () => {
    setTheme((t) => {
      const next = { ...t };
      delete next[APP_BACKGROUND_IMAGE_KEY];
      return next;
    });
    toast.success('Imagen eliminada del borrador; guarda para aplicar en el servidor');
  };

  const updateDashboardCardOpacity = (value: number) => {
    const safeValue = Math.min(100, Math.max(0, Math.round(value)));
    setTheme((t) => ({ ...t, [DASHBOARD_CARD_OPACITY_KEY]: String(safeValue) }));
  };

  const handleCenterLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Selecciona un archivo de imagen');
      return;
    }
    setIsCompressingCenterLogo(true);
    try {
      const supportsAlpha =
        file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif';
      const dataUrl = await compressImageFileToDataUrl(file, {
        maxWidth: 2200,
        quality: 0.92,
        outputType: supportsAlpha ? 'image/png' : 'image/jpeg',
      });
      setTheme((t) => ({ ...t, [DASHBOARD_CENTER_LOGO_IMAGE_KEY]: dataUrl }));
      toast.success('Logotipo preparado; pulsa «Guardar» para persistirlo');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al procesar la imagen');
    } finally {
      setIsCompressingCenterLogo(false);
    }
  };

  const clearCenterLogoImage = () => {
    setTheme((t) => {
      const next = { ...t };
      delete next[DASHBOARD_CENTER_LOGO_IMAGE_KEY];
      return next;
    });
    toast.success('Logotipo eliminado del borrador; guarda para aplicar en el servidor');
  };

  if (isLoading) {
    return (
      <Card className="p-5">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionTitle title="Identidad visual" />
        <div className="rounded-lg bg-sidebar p-5">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`Vista previa del logotipo ${companyName}`}
              className="h-14 w-52 object-contain object-left"
            />
          ) : (
            <p className="font-display text-lg font-bold text-sidebar-foreground">{companyName}</p>
          )}
          <p className="mt-3 text-xs text-sidebar-foreground/60">Vista previa en navegación</p>
        </div>

        <div className="mt-5 space-y-2">
          <Label htmlFor="company-domain" className="text-xs font-medium">
            Dominio
          </Label>
          <Input
            id="company-domain"
            placeholder="empresa-ejemplo.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="company-logo-url" className="text-xs font-medium">
              Logotipo (URL)
            </Label>
            <Input
              id="company-logo-url"
              placeholder="https://... o /uploads/logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-favicon-url" className="text-xs font-medium">
              Favicon (URL)
            </Label>
            <Input
              id="company-favicon-url"
              placeholder="https://... o /uploads/favicon.ico"
              value={faviconUrl}
              onChange={(e) => setFaviconUrl(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {FEATURED_COLORS.map(({ key, label }) => (
            <CompactColorPicker
              key={key}
              label={label}
              hslValue={effectiveTheme[key] ?? ''}
              onHexChange={(hex) => handleColorPickerChange(key, hex)}
            />
          ))}
        </div>

        <div
          className="mt-5 flex min-h-[140px] gap-3 rounded-lg border p-4"
          style={
            {
              '--background': effectiveTheme.background ?? undefined,
              '--foreground': effectiveTheme.foreground ?? undefined,
              '--card': effectiveTheme.card ?? undefined,
              '--card-foreground': effectiveTheme['card-foreground'] ?? undefined,
              '--dashboard-card-opacity': String(dashboardCardOpacity / 100),
              '--primary': effectiveTheme.primary ? `hsl(${effectiveTheme.primary})` : undefined,
              '--primary-foreground': effectiveTheme['primary-foreground']
                ? `hsl(${effectiveTheme['primary-foreground']})`
                : undefined,
              '--secondary': effectiveTheme.secondary ? `hsl(${effectiveTheme.secondary})` : undefined,
              '--muted': effectiveTheme.muted ? `hsl(${effectiveTheme.muted})` : undefined,
              '--muted-foreground': effectiveTheme['muted-foreground']
                ? `hsl(${effectiveTheme['muted-foreground']})`
                : undefined,
              '--accent': effectiveTheme.accent ? `hsl(${effectiveTheme.accent})` : undefined,
              '--border': effectiveTheme.border ? `hsl(${effectiveTheme.border})` : undefined,
              '--ring': effectiveTheme.ring ? `hsl(${effectiveTheme.ring})` : undefined,
              '--radius': effectiveTheme.radius ?? undefined,
              background: 'hsl(var(--background))',
              color: 'hsl(var(--foreground))',
            } as CSSProperties
          }
        >
          <div
            className="flex w-20 shrink-0 flex-col gap-2 rounded-md border p-2 text-[10px] leading-tight"
            style={{
              background: effectiveTheme['sidebar-background']
                ? `hsl(${effectiveTheme['sidebar-background']})`
                : undefined,
              color: effectiveTheme['sidebar-foreground']
                ? `hsl(${effectiveTheme['sidebar-foreground']})`
                : undefined,
              borderColor: effectiveTheme['sidebar-border']
                ? `hsl(${effectiveTheme['sidebar-border']})`
                : undefined,
              borderRadius: effectiveTheme.radius ?? DEFAULT_THEME.radius,
            }}
          >
            <span className="font-semibold">Barra</span>
            <span
              className="rounded px-1 py-0.5 text-center"
              style={{
                background: effectiveTheme['sidebar-primary']
                  ? `hsl(${effectiveTheme['sidebar-primary']})`
                  : undefined,
                color: effectiveTheme['sidebar-primary-foreground']
                  ? `hsl(${effectiveTheme['sidebar-primary-foreground']})`
                  : undefined,
              }}
            >
              Activo
            </span>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <button
              type="button"
              className="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium"
              style={{
                background: effectiveTheme.primary ? `hsl(${effectiveTheme.primary})` : undefined,
                color: effectiveTheme['primary-foreground']
                  ? `hsl(${effectiveTheme['primary-foreground']})`
                  : undefined,
                borderRadius: effectiveTheme.radius ?? DEFAULT_THEME.radius,
              }}
            >
              Botón primario
            </button>
            <div
              className="rounded-md border p-3 text-xs"
              style={{ borderRadius: effectiveTheme.radius ?? DEFAULT_THEME.radius }}
            >
              <p className="font-medium">Tarjeta de ejemplo</p>
              <p className="mt-1 text-muted-foreground">Opacidad {dashboardCardOpacity}%.</p>
            </div>
          </div>
        </div>

        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="mt-4">
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="w-full justify-between px-0">
              <span className="flex items-center gap-2">
                {advancedOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                Más tokens de marca
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-5 pt-2">
              {COLOR_GROUPS.map((group) => {
                const keys = group.keys.filter((item) => !FEATURED_KEY_SET.has(item.key));
                if (keys.length === 0) return null;
                return (
                  <div key={group.title} className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground">{group.title}</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {keys.map(({ key, label }) => (
                        <CompactColorPicker
                          key={key}
                          label={label}
                          hslValue={effectiveTheme[key] ?? ''}
                          onHexChange={(hex) => handleColorPickerChange(key, hex)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="mt-5 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Intensidad de tarjetas</h4>
          <div className="flex items-center gap-4">
            <Slider
              value={[dashboardCardOpacity]}
              onValueChange={([v]) => updateDashboardCardOpacity(v)}
              min={0}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="w-16 text-sm tabular-nums text-muted-foreground">{dashboardCardOpacity}%</span>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Radio de bordes</h4>
          <div className="flex items-center gap-4">
            <Slider
              value={[radiusToNumber(effectiveTheme.radius)]}
              onValueChange={([v]) => updateColor('radius', numberToRadius(v))}
              min={0}
              max={32}
              step={1}
              className="flex-1"
            />
            <span className="w-14 text-sm tabular-nums text-muted-foreground">
              {effectiveTheme.radius || DEFAULT_THEME.radius}
            </span>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Imagen de fondo</h4>
          <input
            ref={bgFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleBackgroundFile}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isCompressingBg}
              onClick={() => bgFileInputRef.current?.click()}
            >
              <Upload />
              {isCompressingBg ? 'Procesando…' : 'Cambiar fondo'}
            </Button>
            {appBackgroundImage ? (
              <Button type="button" variant="ghost" size="sm" onClick={clearBackgroundImage}>
                <X />
                Quitar imagen
              </Button>
            ) : null}
          </div>
          {appBackgroundImage ? (
            <div className="overflow-hidden rounded-lg border bg-muted">
              <img src={appBackgroundImage} alt="Vista previa del fondo" className="h-40 w-full object-cover" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin imagen de fondo; se usa el color de «Fondo».</p>
          )}
        </div>

        <div className="mt-5 space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Logotipo centrado en inicio</h4>
          <input
            ref={centerLogoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCenterLogoFile}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isCompressingCenterLogo}
              onClick={() => centerLogoInputRef.current?.click()}
            >
              <Upload />
              {isCompressingCenterLogo ? 'Procesando…' : 'Cambiar logotipo de inicio'}
            </Button>
            {dashboardCenterLogoImage ? (
              <Button type="button" variant="ghost" size="sm" onClick={clearCenterLogoImage}>
                <X />
                Quitar logotipo
              </Button>
            ) : null}
          </div>
          {dashboardCenterLogoImage ? (
            <div className="flex max-h-72 items-center justify-center overflow-hidden rounded-lg border bg-muted/40 p-4">
              <img
                src={dashboardCenterLogoImage}
                alt="Vista previa del logotipo centrado de inicio"
                className="max-h-64 w-auto object-contain"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sin logotipo central; el dashboard no reserva el centro.
            </p>
          )}
        </div>

        <Collapsible open={hslOpen} onOpenChange={setHslOpen} className="mt-4">
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="w-full justify-between px-0">
              <span className="flex items-center gap-2">
                {hslOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                Valores HSL manuales
              </span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid gap-2 pt-4 sm:grid-cols-2">
              {THEME_COLOR_KEYS.map((key) => (
                <div key={key} className="space-y-1">
                  <Label htmlFor={`theme-${key}`} className="text-xs">
                    {key}
                  </Label>
                  <Input
                    id={`theme-${key}`}
                    placeholder={DEFAULT_THEME[key] ?? 'ej. 203 82% 41%'}
                    value={theme[key] ?? ''}
                    onChange={(e) => setTheme((t) => ({ ...t, [key]: e.target.value }))}
                    className="font-mono text-sm"
                  />
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            <Palette />
            {isSaving ? 'Guardando...' : 'Aplicar tema'}
          </Button>
          <Button type="button" variant="outline" onClick={handleResetTheme}>
            <RotateCcw />
            Restaurar TravelUp
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle title="Visibilidad de clientes para asesores" />
        <p className="mb-3 text-xs text-muted-foreground">
          Define si los asesores ven solo sus clientes o todo el catálogo de la compañía.
        </p>
        <Label htmlFor="advisor-client-access-mode" className="text-xs font-medium">
          Modelo de acceso
        </Label>
        <Select
          value={advisorClientAccessMode}
          onValueChange={(v: 'assigned_only' | 'company_wide') => setAdvisorClientAccessMode(v)}
        >
          <SelectTrigger id="advisor-client-access-mode" className="mt-1.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border bg-popover">
            <SelectItem value="assigned_only">Asignado por asesor</SelectItem>
            <SelectItem value="company_wide">Todos los asesores ven/editan todo</SelectItem>
          </SelectContent>
        </Select>
      </Card>
    </div>
  );
}
