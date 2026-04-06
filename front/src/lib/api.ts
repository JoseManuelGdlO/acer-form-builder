import type { FinanceGranularity, FinanceOverviewResponse } from '@/types/finance';

function getApiBaseURL(): string {
  const configured = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  if (typeof window === 'undefined') return configured;
  try {
    const apiUrl = new URL(configured);
    const apiIsLocalhost = apiUrl.hostname === 'localhost' || apiUrl.hostname === '127.0.0.1';
    const pageIsLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (apiIsLocalhost && !pageIsLocalhost) {
      return `${window.location.protocol}//${window.location.hostname}:${apiUrl.port}${apiUrl.pathname}`;
    }
  } catch {
    // ignore
  }
  return configured;
}

const API_URL = getApiBaseURL();
const TOKEN_KEY = 'auth_token';

/** Map trip response so seat_assignments have seatId (camelCase) from backend seat_id */
function mapTripSeatAssignmentsToCamel(obj: any): any {
  if (!obj) return obj;
  const list = obj.seatAssignments ?? obj.seat_assignments;
  if (Array.isArray(list)) {
    const out = { ...obj };
    out.seatAssignments = list.map((a: any) => ({
      ...a,
      seatId: a.seatId ?? a.seat_id ?? null,
      seatNumber: a.seatNumber ?? a.seat_number ?? null,
    }));
    delete (out as any).seat_assignments;
    return out;
  }
  return obj;
}

interface RequestOptions extends RequestInit {
  token?: string | null;
  requireAuth?: boolean;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private handleAuthError(): void {
    localStorage.removeItem(TOKEN_KEY);
    // Redirect to login if not already there
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { token, requireAuth = false, ...fetchOptions } = options;

    const isFormData = fetchOptions.body instanceof FormData;

    const headers: HeadersInit = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...fetchOptions.headers,
    };

    // Automatically get token from localStorage if not provided and auth is required
    const authToken = token !== undefined ? token : (requireAuth ? this.getToken() : null);
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      if (!response.ok) {
        // Handle 401 Unauthorized
        if (response.status === 401) {
          this.handleAuthError();
          const error = await response.json().catch(() => ({ error: 'Unauthorized' }));
          throw new Error(error.error || 'Authentication required');
        }

        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth
  async login(email: string, password: string) {
    return this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email: string, password: string, name: string, companySlug?: string) {
    return this.request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, ...(companySlug && { companySlug }) }),
    });
  }

  async getMe(token?: string | null) {
    return this.request<{ user: any }>('/auth/me', {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async getTenant(domain: string) {
    return this.request<{ company: { id: string; name: string; slug: string; logoUrl: string | null; faviconUrl: string | null }; theme: Record<string, string> | null }>(
      `/public/tenant?domain=${encodeURIComponent(domain)}`,
      { method: 'GET' }
    );
  }

  async getMyCompany(token?: string | null) {
    return this.request<{ id: string; name: string; slug: string; logoUrl: string | null; faviconUrl: string | null; domain: string | null; theme: Record<string, string> | null }>('/companies/me', {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async updateMyCompany(data: { domain?: string | null; logoUrl?: string | null; faviconUrl?: string | null; theme?: Record<string, string> | null }, token?: string | null) {
    return this.request<{ id: string; name: string; slug: string; logoUrl: string | null; faviconUrl: string | null; domain: string | null; theme: Record<string, string> | null }>('/companies/me', {
      method: 'PATCH',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(data),
    });
  }

  // Users
  async getUsers(token?: string | null) {
    return this.request<any[]>('/users', {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async createUser(userData: any, token?: string | null) {
    return this.request<any>('/users', {
      method: 'POST',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, userData: any, token?: string | null) {
    return this.request<any>(`/users/${id}`, {
      method: 'PUT',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: string, token?: string | null) {
    return this.request<{ message: string }>(`/users/${id}`, {
      method: 'DELETE',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  // Clients
  async getClients(
    params?: {
      q?: string;
      assignedUserId?: string;
      productId?: string;
      visaStatusTemplateId?: string;
      checklistTemplateId?: string;
      page?: number;
      limit?: number;
    },
    token?: string | null
  ) {
    const normalizedParams = Object.fromEntries(
      Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );
    const queryParams = new URLSearchParams(normalizedParams as Record<string, string>).toString();
    return this.request<{
      data: any[];
      meta: { page: number; limit: number; total: number; totalPages: number };
      templates?: any[];
      visaStatusTemplates?: any[];
    }>(`/clients${queryParams ? `?${queryParams}` : ''}`, {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async getClientStats(token?: string | null) {
    return this.request<any>('/clients/stats', {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async getClient(id: string, token?: string | null) {
    return this.request<any>(`/clients/${id}`, {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async getClientAmountDueHistory(clientId: string, token?: string | null) {
    return this.request<any[]>(`/clients/${clientId}/amount-due-history`, {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async getClientPaymentDeletedHistory(clientId: string, token?: string | null) {
    return this.request<any[]>(`/clients/${clientId}/payment-deleted-history`, {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async getClientAcquiredPackages(clientId: string, token?: string | null) {
    return this.request<any[]>(`/clients/${clientId}/acquired-packages`, {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async createClientAcquiredPackage(
    clientId: string,
    data: { productId: string; beneficiaryClientId?: string | null },
    token?: string | null
  ) {
    return this.request<any>(`/clients/${clientId}/acquired-packages`, {
      method: 'POST',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(data),
    });
  }

  async deleteClientAcquiredPackage(clientId: string, packageId: string, token?: string | null) {
    return this.request<{ message: string }>(`/clients/${clientId}/acquired-packages/${packageId}`, {
      method: 'DELETE',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async createClient(clientData: any, token?: string | null) {
    return this.request<any>('/clients', {
      method: 'POST',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(clientData),
    });
  }

  async updateClient(id: string, clientData: any, token?: string | null) {
    return this.request<any>(`/clients/${id}`, {
      method: 'PUT',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(clientData),
    });
  }

  async deleteClient(id: string, token?: string | null) {
    return this.request<{ message: string }>(`/clients/${id}`, {
      method: 'DELETE',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  // Groups
  async getGroups(token?: string | null) {
    return this.request<any[]>('/groups', {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async getGroup(id: string, token?: string | null) {
    return this.request<any>(`/groups/${id}`, {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async createGroup(data: { title: string; clientIds?: string[] }, token?: string | null) {
    return this.request<any>('/groups', {
      method: 'POST',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(data),
    });
  }

  async updateGroup(id: string, data: { title?: string; clientIds?: string[] }, token?: string | null) {
    return this.request<any>(`/groups/${id}`, {
      method: 'PUT',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(data),
    });
  }

  async deleteGroup(id: string, token?: string | null) {
    return this.request<{ message: string }>(`/groups/${id}`, {
      method: 'DELETE',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  // Companies (for trip invite dropdown)
  async getCompaniesForTripShare(token?: string | null) {
    return this.request<{ id: string; name: string }[]>('/companies/for-trip-share', {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  // Trips
  async getTrips(token?: string | null) {
    return this.request<any[]>('/trips', {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async getTrip(id: string, token?: string | null) {
    const res = await this.request<any>(`/trips/${id}`, {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
    return mapTripSeatAssignmentsToCamel(res);
  }

  async getTripInvitations(token?: string | null) {
    return this.request<any[]>('/trips/invitations', {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async acceptTripInvitation(invitationId: string, token?: string | null) {
    return this.request<{ message: string }>(`/trips/invitations/${invitationId}/accept`, {
      method: 'POST',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async rejectTripInvitation(invitationId: string, token?: string | null) {
    return this.request<{ message: string }>(`/trips/invitations/${invitationId}/reject`, {
      method: 'POST',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async getTripChangeLog(tripId: string, token?: string | null) {
    return this.request<any[]>(`/trips/${tripId}/change-log`, {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async getBusTemplates(token?: string | null) {
    return this.request<any[]>('/bus-templates', {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async getBusTemplate(id: string, token?: string | null) {
    return this.request<any>(`/bus-templates/${id}`, {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async createBusTemplate(
    data: {
      name: string;
      totalSeats?: number;
      rows?: number;
      bathroomPosition?: 'front' | 'middle' | 'back';
      floors?: number;
      stairsPosition?: string | null;
      seatLabels?: string[] | null;
      layout?: import('@/types/form').BusLayout | null;
    },
    token?: string | null
  ) {
    return this.request<any>('/bus-templates', {
      method: 'POST',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(data),
    });
  }

  async updateBusTemplate(
    id: string,
    data: {
      name?: string;
      totalSeats?: number;
      rows?: number;
      bathroomPosition?: 'front' | 'middle' | 'back';
      floors?: number;
      stairsPosition?: string | null;
      seatLabels?: string[] | null;
      layout?: import('@/types/form').BusLayout | null;
    },
    token?: string | null
  ) {
    return this.request<any>(`/bus-templates/${id}`, {
      method: 'PUT',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(data),
    });
  }

  async deleteBusTemplate(id: string, token?: string | null) {
    return this.request<void>(`/bus-templates/${id}`, {
      method: 'DELETE',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async createTrip(data: {
    title: string;
    departureDate: string;
    returnDate: string;
    totalSeats: number;
    destination?: string;
    notes?: string;
    busTemplateId?: string | null;
    invitedCompanyIds?: string[];
  }, token?: string | null) {
    return this.request<any>('/trips', {
      method: 'POST',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(data),
    });
  }

  async updateTrip(
    id: string,
    data: {
      title?: string;
      departureDate?: string;
      returnDate?: string;
      totalSeats?: number;
      destination?: string;
      notes?: string;
      busTemplateId?: string | null;
      invitedCompanyIds?: string[];
    },
    token?: string | null
  ) {
    return this.request<any>(`/trips/${id}`, {
      method: 'PUT',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(data),
    });
  }

  async deleteTrip(id: string, token?: string | null) {
    return this.request<{ message: string }>(`/trips/${id}`, {
      method: 'DELETE',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async addTripParticipants(
    tripId: string,
    data: { clientIds?: string[] },
    token?: string | null
  ) {
    return this.request<any>(`/trips/${tripId}/participants`, {
      method: 'POST',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(data),
    });
  }

  async removeTripParticipant(tripId: string, clientId: string, token?: string | null) {
    return this.request<{ message: string }>(`/trips/${tripId}/participants/${clientId}`, {
      method: 'DELETE',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async setTripSeatAssignment(
    tripId: string,
    data: { clientId: string; seatNumber?: number; seatId?: string },
    token?: string | null
  ) {
    const res = await this.request<any>(`/trips/${tripId}/seat-assignments`, {
      method: 'POST',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(data),
    });
    return mapTripSeatAssignmentsToCamel(res);
  }

  async resetTripSeatAssignments(tripId: string, token?: string | null) {
    return this.request<{ message: string }>(`/trips/${tripId}/seat-assignments`, {
      method: 'DELETE',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async clearTripSeatAssignment(
    tripId: string,
    optsOrClientId: { clientId?: string; seatId?: string } | string,
    token?: string | null
  ) {
    const opts = typeof optsOrClientId === 'string' ? { clientId: optsOrClientId } : optsOrClientId;
    if (opts.seatId) {
      return this.request<{ message: string }>(
        `/trips/${tripId}/seat-assignments/by-seat?seatId=${encodeURIComponent(opts.seatId)}`,
        {
          method: 'DELETE',
          token: token ?? this.getToken(),
          requireAuth: true,
        }
      );
    }
    if (!opts.clientId) throw new Error('clientId or seatId required');
    return this.request<{ message: string }>(`/trips/${tripId}/seat-assignments/${opts.clientId}`, {
      method: 'DELETE',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async getTripFinance(tripId: string, token?: string | null) {
    return this.request<{
      summary: { totalIncome: number; totalExpense: number; net: number };
      incomes: any[];
      expenses: any[];
    }>(`/trips/${tripId}/finance`, {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async createTripIncome(
    tripId: string,
    data: {
      clientId: string;
      amount: number;
      paymentDate: string;
      paymentType?: 'tarjeta' | 'transferencia' | 'efectivo';
      referenceNumber?: string;
      note?: string;
    },
    token?: string | null
  ) {
    return this.request<any>(`/trips/${tripId}/finance/incomes`, {
      method: 'POST',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(data),
    });
  }

  async deleteTripIncome(tripId: string, paymentId: string, token?: string | null) {
    return this.request<{ message: string }>(`/trips/${tripId}/finance/incomes/${paymentId}`, {
      method: 'DELETE',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async createTripExpense(
    tripId: string,
    data: {
      amount: number;
      expenseDate: string;
      category?: string;
      referenceNumber?: string;
      note?: string;
    },
    token?: string | null
  ) {
    return this.request<any>(`/trips/${tripId}/finance/expenses`, {
      method: 'POST',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(data),
    });
  }

  async deleteTripExpense(tripId: string, expenseId: string, token?: string | null) {
    return this.request<{ message: string }>(`/trips/${tripId}/finance/expenses/${expenseId}`, {
      method: 'DELETE',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  // Forms
  async getForms() {
    return this.request<any[]>('/forms', {
      method: 'GET',
      requireAuth: true,
    });
  }

  async getForm(id: string, token?: string | null) {
    return this.request<any>(`/forms/${id}`, {
      method: 'GET',
      token: token ?? this.getToken(),
    });
  }

  async createForm(formData: any, token?: string | null) {
    return this.request<any>('/forms', {
      method: 'POST',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(formData),
    });
  }

  async updateForm(id: string, formData: any, token?: string | null) {
    return this.request<any>(`/forms/${id}`, {
      method: 'PUT',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(formData),
    });
  }

  async deleteForm(id: string, token?: string | null) {
    return this.request<{ message: string }>(`/forms/${id}`, {
      method: 'DELETE',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  // Form sessions (unique link + progress in DB)
  async createFormSession(formId: string, token?: string | null, clientId?: string) {
    return this.request<{ sessionId: string }>(`/forms/${formId}/sessions`, {
      method: 'POST',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(clientId ? { clientId } : {}),
    });
  }

  async getClientFormSessions(clientId: string, token?: string | null) {
    return this.request<any[]>(`/forms/sessions/client/${clientId}`, {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async getFormSessionProgress(formId: string, sessionId: string) {
    return this.request<{ progress: any; status: string; clientInfo?: { id: string; name: string } | null }>(`/forms/${formId}/sessions/${sessionId}`, {
      method: 'GET',
    });
  }

  async updateFormSessionProgress(formId: string, sessionId: string, progress: object) {
    return this.request<{ progress: any }>(`/forms/${formId}/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ progress }),
    });
  }

  async completeFormSession(formId: string, sessionId: string) {
    return this.request<{ status: string }>(`/forms/${formId}/sessions/${sessionId}/complete`, {
      method: 'POST',
    });
  }

  // Form session submissions (public - no auth required)
  async getSubmissionBySession(formId: string, sessionId: string) {
    return this.request<any>(`/forms/${formId}/sessions/${sessionId}/submission`, {
      method: 'GET',
    });
  }

  async createSubmissionFromSession(formId: string, sessionId: string, clientInfo: any) {
    return this.request<any>(`/forms/${formId}/sessions/${sessionId}/submission`, {
      method: 'POST',
      body: JSON.stringify({ clientInfo }),
    });
  }

  async updateSubmissionFromSession(formId: string, sessionId: string, answers: any, options?: { status?: string }) {
    return this.request<any>(`/forms/${formId}/sessions/${sessionId}/submission`, {
      method: 'PATCH',
      body: JSON.stringify({ answers, status: options?.status }),
    });
  }

  // Conversations (bot)
  async getClientConversations(clientId: string, token?: string | null) {
    return this.request<any[]>(`/addChat/clients/${encodeURIComponent(clientId)}`, {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  /**
   * Pause conversation with the agent for the given phone (baja lógica).
   * Phone must be the same format as fkid_clients in Conversations (e.g. 10 digits).
   * No auth required; used when user starts filling the public form.
   */
  async pauseConversationByPhone(phone: string, bajaLogica = true) {
    return this.request<any>(`/addChat/${encodeURIComponent(phone)}/baja`, {
      method: 'PATCH',
      body: JSON.stringify({ baja_logica: bajaLogica }),
    });
  }

  // Submissions
  async getSubmissions(params?: { formId?: string; clientId?: string; status?: string }, token?: string | null) {
    const queryParams = new URLSearchParams(params as any).toString();
    return this.request<any[]>(`/submissions${queryParams ? `?${queryParams}` : ''}`, {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async getSubmissionStats(token?: string | null) {
    return this.request<any>('/submissions/stats', {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async getSubmission(id: string, token?: string | null) {
    return this.request<any>(`/submissions/${id}`, {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async createSubmission(submissionData: any, token?: string | null) {
    return this.request<any>('/submissions', {
      method: 'POST',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(submissionData),
    });
  }

  async updateSubmission(id: string, submissionData: any, token?: string | null) {
    return this.request<any>(`/submissions/${id}`, {
      method: 'PUT',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(submissionData),
    });
  }

  async deleteSubmission(id: string, token?: string | null) {
    return this.request<{ message: string }>(`/submissions/${id}`, {
      method: 'DELETE',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  // Checklist
  async getChecklistTemplates(token?: string | null) {
    return this.request<any[]>('/checklist/templates', {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async createChecklistTemplate(templateData: any, token?: string | null) {
    return this.request<any>('/checklist/templates', {
      method: 'POST',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(templateData),
    });
  }

  async updateChecklistTemplate(id: string, templateData: any, token?: string | null) {
    return this.request<any>(`/checklist/templates/${id}`, {
      method: 'PUT',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(templateData),
    });
  }

  async deleteChecklistTemplate(id: string, token?: string | null) {
    return this.request<{ message: string }>(`/checklist/templates/${id}`, {
      method: 'DELETE',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  // Visa status templates
  async getVisaStatusTemplates(token?: string | null) {
    return this.request<any[]>('/visa-status-templates', {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async createVisaStatusTemplate(templateData: any, token?: string | null) {
    return this.request<any>('/visa-status-templates', {
      method: 'POST',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(templateData),
    });
  }

  async updateVisaStatusTemplate(id: string, templateData: any, token?: string | null) {
    return this.request<any>(`/visa-status-templates/${id}`, {
      method: 'PUT',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(templateData),
    });
  }

  async deleteVisaStatusTemplate(id: string, token?: string | null) {
    return this.request<{ message: string }>(`/visa-status-templates/${id}`, {
      method: 'DELETE',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  // Branches (sucursales)
  async getBranches(token?: string | null) {
    return this.request<any[]>('/branches', {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async createBranch(data: { name: string; isActive?: boolean }, token?: string | null) {
    return this.request<any>('/branches', {
      method: 'POST',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(data),
    });
  }

  async updateBranch(id: string, data: { name?: string; isActive?: boolean }, token?: string | null) {
    return this.request<any>(`/branches/${id}`, {
      method: 'PUT',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(data),
    });
  }

  async deleteBranch(id: string, token?: string | null) {
    return this.request<{ message: string }>(`/branches/${id}`, {
      method: 'DELETE',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async getClientChecklist(clientId: string, token?: string | null) {
    return this.request<any[]>(`/checklist/clients/${clientId}`, {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async updateChecklistItem(clientId: string, itemId: string, data: any, token?: string | null) {
    return this.request<any>(`/checklist/clients/${clientId}/items/${itemId}`, {
      method: 'PUT',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(data),
    });
  }

  // Notes
  async getClientNotes(clientId: string, token?: string | null) {
    return this.request<any[]>(`/notes/clients/${clientId}`, {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async createNote(clientId: string, content: string, token?: string | null) {
    return this.request<any>(`/notes/clients/${clientId}`, {
      method: 'POST',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify({ content }),
    });
  }

  async updateNote(id: string, content: string, token?: string | null) {
    return this.request<any>(`/notes/${id}`, {
      method: 'PUT',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify({ content }),
    });
  }

  async deleteNote(id: string, token?: string | null) {
    return this.request<{ message: string }>(`/notes/${id}`, {
      method: 'DELETE',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  // Payments
  async getCompanyPayments(token?: string | null) {
    return this.request<any[]>(`/payments`, {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async getFinanceOverview(
    params?: {
      from?: string;
      to?: string;
      granularity?: FinanceGranularity;
      paymentType?: 'tarjeta' | 'transferencia' | 'efectivo';
      productId?: string;
      assignedUserId?: string;
      branchId?: string;
    },
    token?: string | null
  ) {
    const queryParams = new URLSearchParams(
      Object.entries(params || {}).reduce<Record<string, string>>((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          acc[key] = String(value);
        }
        return acc;
      }, {})
    ).toString();

    return this.request<FinanceOverviewResponse>(`/finance/overview${queryParams ? `?${queryParams}` : ''}`, {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async getClientPayments(clientId: string, token?: string | null) {
    return this.request<any[]>(`/payments/clients/${clientId}`, {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async createPayment(
    clientId: string,
    data: {
      amount: number;
      paymentDate: string;
      paymentType?: 'tarjeta' | 'transferencia' | 'efectivo';
      referenceNumber?: string;
      note?: string;
      acquiredPackageId?: string | null;
    },
    token?: string | null
  ) {
    return this.request<any>(`/payments/clients/${clientId}`, {
      method: 'POST',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(data),
    });
  }

  async deletePayment(id: string, token?: string | null) {
    return this.request<{ message: string }>(`/payments/${id}`, {
      method: 'DELETE',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  // Messages
  async getClientMessages(clientId: string, token?: string | null) {
    return this.request<any[]>(`/messages/clients/${clientId}`, {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async createMessage(clientId: string, content: string, sender: 'user' | 'client', token?: string | null) {
    return this.request<any>(`/messages/clients/${clientId}`, {
      method: 'POST',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify({ content, sender }),
    });
  }

  async deleteMessage(id: string, token?: string | null) {
    return this.request<{ message: string }>(`/messages/${id}`, {
      method: 'DELETE',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  // FAQs
  async getFAQs(params?: { isActive?: string }, token?: string | null) {
    const queryParams = new URLSearchParams(params as any).toString();
    return this.request<any[]>(`/faqs${queryParams ? `?${queryParams}` : ''}`, {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async getFAQ(id: string, token?: string | null) {
    return this.request<any>(`/faqs/${id}`, {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async createFAQ(faqData: any, token?: string | null) {
    return this.request<any>('/faqs', {
      method: 'POST',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(faqData),
    });
  }

  async updateFAQ(id: string, faqData: any, token?: string | null) {
    return this.request<any>(`/faqs/${id}`, {
      method: 'PUT',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(faqData),
    });
  }

  async deleteFAQ(id: string, token?: string | null) {
    return this.request<{ message: string }>(`/faqs/${id}`, {
      method: 'DELETE',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  // Bot
  async getBotBehavior(token?: string | null) {
    return this.request<any>('/bot', {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async updateBotBehavior(botData: any, token?: string | null) {
    return this.request<any>('/bot', {
      method: 'PUT',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(botData),
    });
  }

  // Products (visas)
  async getProducts(token?: string | null) {
    return this.request<any[]>('/products', {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async getProduct(id: string, token?: string | null) {
    return this.request<any>(`/products/${id}`, {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async createProduct(
    data: {
      title: string;
      includes: string;
      price: number;
      description?: string;
      requirements?: string;
      categories?: string[];
      imageFile?: File | null;
    },
    token?: string | null
  ) {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('includes', data.includes);
    formData.append('price', String(data.price));
    formData.append('description', data.description ?? '');
    formData.append('requirements', data.requirements ?? '');
    if (data.categories !== undefined) {
      if (data.categories.length === 0) {
        // Permite vaciar categorías (backend interpretará esto como [] por validación/normalización)
        formData.append('categories', '');
      } else {
        for (const cat of data.categories) {
          formData.append('categories', cat);
        }
      }
    }
    if (data.imageFile) {
      formData.append('image', data.imageFile);
    }

    return this.request<any>('/products', {
      method: 'POST',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: formData as unknown as BodyInit,
      headers: {},
    });
  }

  async updateProduct(
    id: string,
    data: {
      title?: string;
      includes?: string;
      price?: number;
      description?: string;
      requirements?: string;
      categories?: string[];
      imageFile?: File | null;
    },
    token?: string | null
  ) {
    const formData = new FormData();
    if (data.title !== undefined) formData.append('title', data.title);
    if (data.includes !== undefined) formData.append('includes', data.includes);
    if (data.price !== undefined) formData.append('price', String(data.price));
    if (data.description !== undefined) formData.append('description', String(data.description));
    if (data.requirements !== undefined) formData.append('requirements', String(data.requirements));
    if (data.categories !== undefined) {
      if (data.categories.length === 0) {
        formData.append('categories', '');
      } else {
        for (const cat of data.categories) {
          formData.append('categories', cat);
        }
      }
    }
    if (data.imageFile) {
      formData.append('image', data.imageFile);
    }

    return this.request<any>(`/products/${id}`, {
      method: 'PUT',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: formData as unknown as BodyInit,
      headers: {},
    });
  }

  async getProductsByCategories(categories: string[], token?: string | null) {
    const query = new URLSearchParams({ categories: categories.join(',') }).toString();
    return this.request<any[]>(`/products/by-category?${query}`, {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  // Categories (product tags)
  async getCategories(token?: string | null) {
    return this.request<any[]>('/categories', {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async createCategory(
    data: {
      name: string;
      color?: string;
      key?: string;
    },
    token?: string | null
  ) {
    return this.request<any>('/categories', {
      method: 'POST',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(data),
    });
  }

  async updateCategory(
    id: string,
    data: {
      name?: string;
      color?: string | null;
    },
    token?: string | null
  ) {
    return this.request<any>(`/categories/${id}`, {
      method: 'PUT',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id: string, token?: string | null) {
    return this.request<{ message: string }>(`/categories/${id}`, {
      method: 'DELETE',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async deleteProduct(id: string, token?: string | null) {
    return this.request<{ message: string }>(`/products/${id}`, {
      method: 'DELETE',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  // Notifications
  async getVapidPublicKey() {
    return this.request<{ publicKey: string }>(`/notifications/vapid-public-key`, {
      method: 'GET',
    });
  }

  async registerPushSubscription(subscription: any, token?: string | null) {
    return this.request<{ id: string; updated: boolean }>(`/notifications/push-subscriptions`, {
      method: 'POST',
      token: token ?? this.getToken(),
      requireAuth: true,
      body: JSON.stringify({ subscription }),
    });
  }

  async getNotifications(token?: string | null) {
    return this.request<any[]>(`/notifications`, {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async markNotificationRead(notificationId: string, token?: string | null) {
    return this.request<any>(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async dismissNotification(notificationId: string, token?: string | null) {
    return this.request<any>(`/notifications/${notificationId}`, {
      method: 'DELETE',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async dismissAllNotifications(token?: string | null) {
    return this.request<{ dismissed: number }>(`/notifications`, {
      method: 'DELETE',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }
}

export const api = new ApiClient(API_URL);
