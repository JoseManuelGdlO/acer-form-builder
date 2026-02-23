const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const TOKEN_KEY = 'auth_token';

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

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
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
    return this.request<{ company: { id: string; name: string; slug: string; logoUrl: string | null }; theme: Record<string, string> | null }>(
      `/public/tenant?domain=${encodeURIComponent(domain)}`,
      { method: 'GET' }
    );
  }

  async getMyCompany(token?: string | null) {
    return this.request<{ id: string; name: string; slug: string; logoUrl: string | null; domain: string | null; theme: Record<string, string> | null }>('/companies/me', {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async updateMyCompany(data: { domain?: string | null; theme?: Record<string, string> | null }, token?: string | null) {
    return this.request<{ id: string; name: string; slug: string; logoUrl: string | null; domain: string | null; theme: Record<string, string> | null }>('/companies/me', {
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
  async getClients(params?: { status?: string; assignedUserId?: string }, token?: string | null) {
    const queryParams = new URLSearchParams(params as any).toString();
    return this.request<any[]>(`/clients${queryParams ? `?${queryParams}` : ''}`, {
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
  async createFormSession(formId: string, token?: string | null) {
    return this.request<{ sessionId: string }>(`/forms/${formId}/sessions`, {
      method: 'POST',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async getFormSessionProgress(formId: string, sessionId: string) {
    return this.request<{ progress: any; status: string }>(`/forms/${formId}/sessions/${sessionId}`, {
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

  async getClientPayments(clientId: string, token?: string | null) {
    return this.request<any[]>(`/payments/clients/${clientId}`, {
      method: 'GET',
      token: token ?? this.getToken(),
      requireAuth: true,
    });
  }

  async createPayment(
    clientId: string,
    data: { amount: number; paymentDate: string; paymentType?: 'tarjeta' | 'transferencia' | 'efectivo'; note?: string },
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
}

export const api = new ApiClient(API_URL);
