import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, FileText, ClipboardList, CheckCircle2, Clock, 
  TrendingUp, Activity, UserPlus, FileCheck, MessageSquare,
  ArrowUpRight, ArrowDownRight, Scale, Percent
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Form, FormSubmission, Client } from '@/types/form';
import { useTenant } from '@/contexts/TenantContext';
import {
  DASHBOARD_CENTER_LOGO_IMAGE_KEY,
  getDashboardCardOpacity,
} from '@/lib/theme';

interface DashboardProps {
  forms: Form[];
  submissions: FormSubmission[];
  clients: Client[];
  submissionStats: { total: number; pending: number; reviewed: number; completed: number };
  clientStats: { total: number; active: number; inactive: number; pending: number };
}

interface Activity {
  id: string;
  type: 'client_created' | 'form_submitted' | 'client_updated' | 'form_created';
  title: string;
  description: string;
  timestamp: Date;
  icon: typeof Users;
  color: string;
}

const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendValue,
  color = 'primary',
  cardOpacity = 100,
}: { 
  title: string; 
  value: number | string; 
  subtitle?: string;
  icon: typeof Users;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning';
  cardOpacity?: number;
}) => {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary/10 text-secondary',
    accent: 'bg-accent/10 text-accent',
    success: 'bg-green-500/10 text-green-600',
    warning: 'bg-amber-500/10 text-amber-600',
  };

  return (
    <Card
      className="border-border/50 hover:shadow-md transition-shadow"
      style={{ backgroundColor: `hsl(var(--card) / ${Math.max(0, Math.min(1, cardOpacity / 100))})` }}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && trendValue && (
              <div className={`flex items-center gap-1 text-xs ${
                trend === 'up' ? 'text-green-600' : 
                trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
              }`}>
                {trend === 'up' ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : trend === 'down' ? (
                  <ArrowDownRight className="w-3 h-3" />
                ) : null}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const Dashboard = ({ 
  forms, 
  submissions, 
  clients,
  submissionStats,
  clientStats
}: DashboardProps) => {
  const { tenant } = useTenant();
  const dashboardCardOpacity = getDashboardCardOpacity(tenant?.theme);
  const dashboardCenterLogoImage = tenant?.theme?.[DASHBOARD_CENTER_LOGO_IMAGE_KEY]?.trim() ?? '';
  const hasCenterLogo = Boolean(dashboardCenterLogoImage);

  // Generate recent activities from data
  const recentActivities = useMemo<Activity[]>(() => {
    const activities: Activity[] = [];

    // Add client activities
    clients.slice(0, 5).forEach(client => {
      activities.push({
        id: `client-${client.id}`,
        type: 'client_created',
        title: 'Nuevo cliente registrado',
        description: client.name,
        timestamp: client.createdAt,
        icon: UserPlus,
        color: 'bg-green-500',
      });
    });

    // Add submission activities
    submissions.slice(0, 5).forEach(submission => {
      activities.push({
        id: `submission-${submission.id}`,
        type: 'form_submitted',
        title: 'Formulario completado',
        description: `${submission.respondentName} - ${submission.formName}`,
        timestamp: submission.submittedAt,
        icon: FileCheck,
        color: 'bg-primary',
      });
    });

    // Add form activities
    forms.slice(0, 3).forEach(form => {
      activities.push({
        id: `form-${form.id}`,
        type: 'form_created',
        title: 'Formulario creado',
        description: form.name,
        timestamp: form.createdAt,
        icon: FileText,
        color: 'bg-accent',
      });
    });

    // Sort by timestamp, most recent first
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 8);
  }, [clients, submissions, forms]);

  // Quick stats
  const completionRate = submissionStats.total > 0 
    ? Math.round((submissionStats.completed / submissionStats.total) * 100) 
    : 0;

  const activeClientRate = clientStats.total > 0
    ? Math.round((clientStats.active / clientStats.total) * 100)
    : 0;

  const visaApprovalStats = useMemo(() => {
    const normalize = (value?: string | null) => (value || '').trim().toLowerCase();
    const approved = clients.filter((client) =>
      normalize(client.visaStatusTemplate?.label).includes('aprob')
    ).length;
    const denied = clients.filter((client) =>
      normalize(client.visaStatusTemplate?.label).includes('negad')
    ).length;
    const rate = approved + denied > 0
      ? Math.round((approved / (approved + denied)) * 100)
      : 0;

    return { approved, denied, rate };
  }, [clients]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Inicio</h1>
        <p className="text-muted-foreground mt-1">
          Resumen general del sistema • {format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: es })}
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className={hasCenterLogo ? 'grid gap-4 xl:grid-cols-5' : 'grid sm:grid-cols-2 lg:grid-cols-5 gap-4'}>
        <div className={hasCenterLogo ? 'space-y-4 xl:col-span-2' : 'contents'}>
          <StatCard
            title="Total Clientes"
            value={clientStats.total}
            subtitle={`${clientStats.active} activos`}
            icon={Users}
            color="primary"
            trend="up"
            trendValue={`${activeClientRate}% activos`}
            cardOpacity={dashboardCardOpacity}
          />
          <StatCard
            title="Respuestas"
            value={submissionStats.total}
            subtitle={`${submissionStats.pending} pendientes`}
            icon={ClipboardList}
            color="secondary"
            trend={submissionStats.pending > 0 ? 'neutral' : 'up'}
            trendValue={submissionStats.pending > 0 ? 'Requieren revisión' : 'Al día'}
            cardOpacity={dashboardCardOpacity}
          />
          {!hasCenterLogo ? (
            <StatCard
              title="Tasa de Completado"
              value={`${completionRate}%`}
              subtitle={`${submissionStats.completed} completados`}
              icon={CheckCircle2}
              color="success"
              cardOpacity={dashboardCardOpacity}
            />
          ) : null}
        </div>
        {hasCenterLogo ? (
          <Card
            className="border-border/50 xl:col-span-1 flex items-center justify-center min-h-[240px] p-6"
            style={{ backgroundColor: `hsl(var(--card) / ${Math.max(0, Math.min(1, dashboardCardOpacity / 100))})` }}
          >
            <img
              src={dashboardCenterLogoImage}
              alt="Logotipo principal del inicio"
              className="max-h-44 w-auto object-contain"
            />
          </Card>
        ) : null}
        <div className={hasCenterLogo ? 'space-y-4 xl:col-span-2' : 'contents'}>
          {hasCenterLogo ? (
            <StatCard
              title="Tasa de Completado"
              value={`${completionRate}%`}
              subtitle={`${submissionStats.completed} completados`}
              icon={CheckCircle2}
              color="success"
              cardOpacity={dashboardCardOpacity}
            />
          ) : null}
          <StatCard
            title="Visas Aprobadas vs Negadas"
            value={`${visaApprovalStats.approved} / ${visaApprovalStats.denied}`}
            subtitle="Aprobadas / Negadas"
            icon={Scale}
            color="accent"
            cardOpacity={dashboardCardOpacity}
          />
          <StatCard
            title="Tasa de Aprobación de Visas"
            value={`${visaApprovalStats.rate}%`}
            subtitle={`${visaApprovalStats.approved + visaApprovalStats.denied} casos evaluados`}
            icon={Percent}
            color="success"
            cardOpacity={dashboardCardOpacity}
          />
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card
          className="border-border/50"
          style={{ backgroundColor: `hsl(var(--card) / ${Math.max(0, Math.min(1, dashboardCardOpacity / 100))})` }}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{submissionStats.pending}</p>
                <p className="text-sm text-muted-foreground">Pendientes de revisión</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className="border-border/50"
          style={{ backgroundColor: `hsl(var(--card) / ${Math.max(0, Math.min(1, dashboardCardOpacity / 100))})` }}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{submissionStats.reviewed}</p>
                <p className="text-sm text-muted-foreground">En proceso</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className="border-border/50"
          style={{ backgroundColor: `hsl(var(--card) / ${Math.max(0, Math.min(1, dashboardCardOpacity / 100))})` }}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{clientStats.pending}</p>
                <p className="text-sm text-muted-foreground">Clientes por contactar</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed & Distribution */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card
          className="lg:col-span-2 border-border/50"
          style={{ backgroundColor: `hsl(var(--card) / ${Math.max(0, Math.min(1, dashboardCardOpacity / 100))})` }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>No hay actividad reciente</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div 
                    key={activity.id}
                    className={`flex items-start gap-4 ${
                      index !== recentActivities.length - 1 ? 'pb-4 border-b border-border/30' : ''
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg ${activity.color} bg-opacity-10 flex items-center justify-center flex-shrink-0`}>
                      <activity.icon className={`w-4 h-4 ${activity.color.replace('bg-', 'text-')}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{activity.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{activity.description}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(activity.timestamp, { addSuffix: true, locale: es })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card
          className="border-border/50"
          style={{ backgroundColor: `hsl(var(--card) / ${Math.max(0, Math.min(1, dashboardCardOpacity / 100))})` }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Estado de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm text-foreground">Activos</span>
                </div>
                <span className="text-sm font-medium text-foreground">{clientStats.active}</span>
              </div>
              <div className="w-full bg-muted/50 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${clientStats.total > 0 ? (clientStats.active / clientStats.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-sm text-foreground">Pendientes</span>
                </div>
                <span className="text-sm font-medium text-foreground">{clientStats.pending}</span>
              </div>
              <div className="w-full bg-muted/50 rounded-full h-2">
                <div 
                  className="bg-amber-500 h-2 rounded-full transition-all"
                  style={{ width: `${clientStats.total > 0 ? (clientStats.pending / clientStats.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                  <span className="text-sm text-foreground">Inactivos</span>
                </div>
                <span className="text-sm font-medium text-foreground">{clientStats.inactive}</span>
              </div>
              <div className="w-full bg-muted/50 rounded-full h-2">
                <div 
                  className="bg-gray-400 h-2 rounded-full transition-all"
                  style={{ width: `${clientStats.total > 0 ? (clientStats.inactive / clientStats.total) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border/30">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{activeClientRate}%</p>
                <p className="text-xs text-muted-foreground">Tasa de clientes activos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
