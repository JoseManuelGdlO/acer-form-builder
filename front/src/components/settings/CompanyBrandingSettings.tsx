import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  APP_BACKGROUND_IMAGE_KEY,
  DASHBOARD_CARD_OPACITY_KEY,
  DASHBOARD_CENTER_LOGO_IMAGE_KEY,
  DEFAULT_DASHBOARD_CARD_OPACITY,
  getDashboardCardOpacity,
} from '@/lib/theme';
import { applyFavicon } from '@/lib/favicon';
import { useTenant } from '@/contexts/TenantContext';
import {
  Globe,
  Palette,
  Eye,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Image as ImageIcon,
  Bookmark,
  Wallpaper,
  Upload,
  X,
} from 'lucide-react';

/** Valores por defecto alineados con index.css y THEME_COLOR_KEYS. */
const DEFAULT_THEME: Record<string, string> = {
  primary: '234 66% 30%',
  'primary-foreground': '0 0% 100%',
  secondary: '0 67% 47%',
  'secondary-foreground': '0 0% 100%',
  background: '0 0% 100%',
  foreground: '0 0% 18%',
  card: '0 0% 100%',
  'card-foreground': '0 0% 18%',
  muted: '234 20% 95%',
  'muted-foreground': '0 0% 45%',
  accent: '230 45% 47%',
  border: '234 20% 90%',
  ring: '234 66% 30%',
  radius: '0.75rem',
  'sidebar-background': '234 66% 30%',
  'sidebar-foreground': '0 0% 100%',
  'sidebar-primary': '0 67% 47%',
  'sidebar-primary-foreground': '0 0% 100%',
  'sidebar-accent': '230 45% 47%',
  'sidebar-accent-foreground': '0 0% 100%',
  'sidebar-border': '234 50% 40%',
  'sidebar-ring': '0 67% 47%',
};

const COLOR_GROUPS: { title: string; keys: { key: string; label: string }[] }[] = [
  {
    title: 'Colores principales',
    keys: [
      { key: 'primary', label: 'Primario (botones, enlaces)' },
      { key: 'primary-foreground', label: 'Texto sobre primario' },
      { key: 'secondary', label: 'Secundario' },
      { key: 'secondary-foreground', label: 'Texto sobre secundario' },
    ],
  },
  {
    title: 'Fondo y texto',
    keys: [
      { key: 'background', label: 'Fondo de página' },
      { key: 'foreground', label: 'Texto principal' },
    ],
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
      { key: 'accent', label: 'Acento' },
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
    title: 'Cabecera y barra lateral (tokens sidebar)',
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
  return Number.isNaN(num) ? 12 : num;
}

function numberToRadius(num: number): string {
  return `${(num / 16).toFixed(2)}rem`;
}

export function CompanyBrandingSettings() {
  const { loadTenant } = useTenant();
  const [domain, setDomain] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [theme, setTheme] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [isCompressingBg, setIsCompressingBg] = useState(false);
  const [isCompressingCenterLogo, setIsCompressingCenterLogo] = useState(false);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const centerLogoInputRef = useRef<HTMLInputElement>(null);

  const effectiveTheme = useMemo(() => getEffectiveTheme(theme), [theme]);
  const appBackgroundImage = theme[APP_BACKGROUND_IMAGE_KEY] ?? '';
  const dashboardCenterLogoImage = theme[DASHBOARD_CENTER_LOGO_IMAGE_KEY] ?? '';
  const dashboardCardOpacity = getDashboardCardOpacity(theme);

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
      });
      const mergedAfterSave = mergeWithDefaultTheme({
        ...theme,
        ...parseSavedTheme(res.theme),
      });
      setTheme(mergedAfterSave);
      applyTheme(mergedAfterSave);
      applyFavicon(res.faviconUrl ?? res.logoUrl ?? null);
      const hostname = window.location.hostname;
      const domainToUse = hostname === 'localhost' || hostname === '127.0.0.1' ? 'saru' : hostname;
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
      toast.success('Imagen preparada; pulsa «Guardar tema» para persistirla');
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
      toast.success('Logotipo preparado; pulsa «Guardar tema» para persistirlo');
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
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Cargando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <CardTitle>Dominio</CardTitle>
          </div>
          <CardDescription>
            Dominio personalizado para identificar tu empresa (ej. empresa-ejemplo.com).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            id="company-domain"
            placeholder="empresa-ejemplo.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            <CardTitle>Logotipo y favicon</CardTitle>
          </div>
          <CardDescription>
            URLs del logotipo (cabecera, login) y del favicon (pestaña del navegador). Pueden ser absolutas (https://...) o relativas (/uploads/...).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-logo-url" className="flex items-center gap-2 text-sm font-medium">
              <ImageIcon className="w-4 h-4" />
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
            <Label htmlFor="company-favicon-url" className="flex items-center gap-2 text-sm font-medium">
              <Bookmark className="w-4 h-4" />
              Favicon (URL)
            </Label>
            <Input
              id="company-favicon-url"
              placeholder="https://... o /uploads/favicon.ico"
              value={faviconUrl}
              onChange={(e) => setFaviconUrl(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wallpaper className="w-5 h-5 text-primary" />
            <CardTitle>Imagen de fondo (toda la aplicación)</CardTitle>
          </div>
          <CardDescription>
            Se guarda en la base de datos como imagen JPEG comprimida (data URL con base64). Visible en todas las pantallas tras guardar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
              <Upload className="w-4 h-4 mr-1" />
              {isCompressingBg ? 'Procesando…' : 'Elegir imagen'}
            </Button>
            {appBackgroundImage ? (
              <Button type="button" variant="ghost" size="sm" onClick={clearBackgroundImage}>
                <X className="w-4 h-4 mr-1" />
                Quitar imagen
              </Button>
            ) : null}
          </div>
          {appBackgroundImage ? (
            <div className="rounded-lg border overflow-hidden max-h-48 bg-muted">
              <img src={appBackgroundImage} alt="Vista previa del fondo" className="w-full h-40 object-cover" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin imagen de fondo; se usa solo el color de «Fondo de página».</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            <CardTitle>Logotipo centrado en inicio</CardTitle>
          </div>
          <CardDescription>
            Imagen independiente para la pantalla de inicio. Se muestra centrada y deja el contenido estadístico a los lados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
              <Upload className="w-4 h-4 mr-1" />
              {isCompressingCenterLogo ? 'Procesando…' : 'Elegir logotipo de inicio'}
            </Button>
            {dashboardCenterLogoImage ? (
              <Button type="button" variant="ghost" size="sm" onClick={clearCenterLogoImage}>
                <X className="w-4 h-4 mr-1" />
                Quitar logotipo
              </Button>
            ) : null}
          </div>
          {dashboardCenterLogoImage ? (
            <div className="rounded-lg border overflow-hidden max-h-72 p-4 flex items-center justify-center bg-transparent bg-[linear-gradient(45deg,hsl(var(--muted))_25%,transparent_25%,transparent_75%,hsl(var(--muted))_75%,hsl(var(--muted))),linear-gradient(45deg,hsl(var(--muted))_25%,transparent_25%,transparent_75%,hsl(var(--muted))_75%,hsl(var(--muted)))] bg-[length:20px_20px] bg-[position:0_0,10px_10px]">
              <img
                src={dashboardCenterLogoImage}
                alt="Vista previa del logotipo centrado de inicio"
                className="max-h-64 w-auto object-contain"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sin logotipo central; el dashboard mostrará todas las cards sin reservar el centro.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              <div>
                <CardTitle>Tema visual</CardTitle>
                <CardDescription>
                  Ajusta los colores y el radio de bordes. Los cambios se ven en la vista previa al instante.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleResetTheme}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Restablecer
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Guardando...' : 'Guardar tema'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Eye className="w-4 h-4" />
              Vista previa
            </div>
            <div
              className="rounded-xl border p-4 min-h-[200px] flex gap-3"
              style={
                {
                  '--background': effectiveTheme.background ?? undefined,
                  '--foreground': effectiveTheme.foreground ?? undefined,
                  '--card': effectiveTheme.card ?? undefined,
                  '--card-foreground': effectiveTheme['card-foreground'] ?? undefined,
                  '--dashboard-card-opacity': String(dashboardCardOpacity / 100),
                  '--primary': effectiveTheme.primary ? `hsl(${effectiveTheme.primary})` : undefined,
                  '--primary-foreground': effectiveTheme['primary-foreground'] ? `hsl(${effectiveTheme['primary-foreground']})` : undefined,
                  '--secondary': effectiveTheme.secondary ? `hsl(${effectiveTheme.secondary})` : undefined,
                  '--muted': effectiveTheme.muted ? `hsl(${effectiveTheme.muted})` : undefined,
                  '--muted-foreground': effectiveTheme['muted-foreground'] ? `hsl(${effectiveTheme['muted-foreground']})` : undefined,
                  '--accent': effectiveTheme.accent ? `hsl(${effectiveTheme.accent})` : undefined,
                  '--border': effectiveTheme.border ? `hsl(${effectiveTheme.border})` : undefined,
                  '--ring': effectiveTheme.ring ? `hsl(${effectiveTheme.ring})` : undefined,
                  '--radius': effectiveTheme.radius ?? undefined,
                  background: 'hsl(var(--background))',
                  color: 'hsl(var(--foreground))',
                } as React.CSSProperties
              }
            >
              <div
                className="w-24 shrink-0 rounded-lg border p-2 flex flex-col gap-2 text-[10px] leading-tight"
                style={{
                  background: effectiveTheme['sidebar-background'] ? `hsl(${effectiveTheme['sidebar-background']})` : undefined,
                  color: effectiveTheme['sidebar-foreground'] ? `hsl(${effectiveTheme['sidebar-foreground']})` : undefined,
                  borderColor: effectiveTheme['sidebar-border'] ? `hsl(${effectiveTheme['sidebar-border']})` : undefined,
                  borderRadius: effectiveTheme.radius ?? '0.75rem',
                }}
              >
                <span className="font-semibold">Barra</span>
                <span
                  className="rounded px-1 py-0.5 text-center"
                  style={{
                    background: effectiveTheme['sidebar-primary'] ? `hsl(${effectiveTheme['sidebar-primary']})` : undefined,
                    color: effectiveTheme['sidebar-primary-foreground']
                      ? `hsl(${effectiveTheme['sidebar-primary-foreground']})`
                      : undefined,
                  }}
                >
                  Activo
                </span>
                <span
                  className="rounded px-1 py-0.5 text-center opacity-90"
                  style={{
                    background: effectiveTheme['sidebar-accent'] ? `hsl(${effectiveTheme['sidebar-accent']})` : undefined,
                    color: effectiveTheme['sidebar-accent-foreground']
                      ? `hsl(${effectiveTheme['sidebar-accent-foreground']})`
                      : undefined,
                  }}
                >
                  Acento
                </span>
              </div>
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:opacity-90"
                    style={{
                      background: effectiveTheme.primary ? `hsl(${effectiveTheme.primary})` : undefined,
                      color: effectiveTheme['primary-foreground'] ? `hsl(${effectiveTheme['primary-foreground']})` : undefined,
                      borderRadius: effectiveTheme.radius ?? '0.75rem',
                    }}
                  >
                    Botón primario
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md border border-input bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground shadow-sm hover:bg-secondary/80"
                    style={{
                      background: effectiveTheme.secondary ? `hsl(${effectiveTheme.secondary})` : undefined,
                      color: effectiveTheme['secondary-foreground'] ? `hsl(${effectiveTheme['secondary-foreground']})` : undefined,
                      borderColor: effectiveTheme.border ? `hsl(${effectiveTheme.border})` : undefined,
                      borderRadius: effectiveTheme.radius ?? '0.75rem',
                    }}
                  >
                    Secundario
                  </button>
                </div>
                <div
                  className="rounded-lg border border-border p-4 max-w-sm bg-card text-card-foreground"
                  style={{ borderRadius: effectiveTheme.radius ?? '0.75rem' }}
                >
                  <p className="font-medium">Tarjeta de ejemplo</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Misma transparencia que en toda la app: {dashboardCardOpacity}%.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {COLOR_GROUPS.map((group) => (
              <div key={group.title} className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">{group.title}</h4>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.keys.map(({ key, label }) => {
                    const value = effectiveTheme[key] ?? '';
                    const isRadius = key === 'radius';
                    if (isRadius) return null;
                    const hex = value ? hslStringToHex(value) : '#888888';
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <input
                            type="color"
                            value={hex}
                            onChange={(e) => handleColorPickerChange(key, e.target.value)}
                            className="h-10 w-10 cursor-pointer rounded-lg border border-input bg-background p-0.5 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-0"
                            title={label}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <Label className="text-xs text-muted-foreground">{label}</Label>
                          <p className="font-mono text-xs text-foreground truncate" title={value}>
                            {value || '—'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Intensidad de tarjetas (toda la aplicación)</h4>
              <div className="flex items-center gap-4 max-w-sm">
                <Slider
                  value={[dashboardCardOpacity]}
                  onValueChange={([v]) => updateDashboardCardOpacity(v)}
                  min={0}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm tabular-nums text-muted-foreground w-16">{dashboardCardOpacity}%</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Radio de bordes</h4>
              <div className="flex items-center gap-4 max-w-sm">
                <Slider
                  value={[radiusToNumber(effectiveTheme.radius)]}
                  onValueChange={([v]) => updateColor('radius', numberToRadius(v))}
                  min={0}
                  max={32}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm tabular-nums text-muted-foreground w-14">
                  {effectiveTheme.radius || '0.75rem'}
                </span>
              </div>
            </div>
          </div>

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between px-0">
                <span className="flex items-center gap-2">
                  {advancedOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  Valores HSL manuales
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 pt-4">
                {THEME_COLOR_KEYS.map((key) => (
                  <div key={key} className="space-y-1">
                    <Label htmlFor={`theme-${key}`} className="text-xs">
                      {key}
                    </Label>
                    <Input
                      id={`theme-${key}`}
                      placeholder={DEFAULT_THEME[key] ?? 'ej. 234 66% 30%'}
                      value={theme[key] ?? ''}
                      onChange={(e) => setTheme((t) => ({ ...t, [key]: e.target.value }))}
                      className="font-mono text-sm"
                    />
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
}
