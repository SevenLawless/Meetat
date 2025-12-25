class ApiService {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  // Get API base URL dynamically at request time
  // This handles cases where the build was done with localhost but deployed to production
  getApiBase() {
    const viteApiUrl = import.meta.env.VITE_API_URL;
    const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD;
    
    // Development: use relative path (Vite proxy handles it)
    if (!isProduction) {
      return '/api';
    }
    
    // Production: check if VITE_API_URL is set and valid
    if (viteApiUrl) {
      // If it's localhost, check if we're actually in production (not localhost)
      if (viteApiUrl.includes('localhost') && typeof window !== 'undefined') {
        const currentHost = window.location.hostname;
        // If we're on a real domain (not localhost), the build was misconfigured
        if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
          // Use relative path as fallback
          // Note: This assumes backend is on same domain or Railway routes /api to backend
          // For proper fix, set VITE_API_URL in Railway environment variables
          if (!this._warnedAboutLocalhost) {
            console.warn(
              '⚠️ VITE_API_URL is set to localhost but app is running in production. ' +
              'Using relative API path (/api). ' +
              'If this doesn\'t work, please set VITE_API_URL in Railway to your backend URL.'
            );
            this._warnedAboutLocalhost = true;
          }
          return '/api';
        }
        // Actually on localhost, use the localhost URL
        return `${viteApiUrl}/api`;
      }
      // Valid production URL (not localhost)
      return `${viteApiUrl}/api`;
    }
    
    // No VITE_API_URL set - use relative path
    // This will work if backend and frontend are on same domain
    // Or if Railway/proxy is configured to route /api to backend
    // For separate Railway services, you MUST set VITE_API_URL
    return '/api';
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('token');
  }

  async request(endpoint, options = {}) {
    const apiBase = this.getApiBase();
    const url = `${apiBase}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.getToken()) {
      headers['Authorization'] = `Bearer ${this.getToken()}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle connection errors gracefully
    if (!response.ok && response.status === 0) {
      // Network error - backend might be down
      throw new Error('Unable to connect to server. Please ensure the backend is running.');
    }

    // Handle non-JSON responses (like HTML error pages)
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (error) {
        throw new Error(`Failed to parse JSON response: ${response.status} ${response.statusText}`);
      }
    } else {
      const text = await response.text();
      // Detect if we got HTML instead of JSON (likely hitting static file server)
      if (text.trim().startsWith('<!DOCTYPE html>') || text.trim().startsWith('<html')) {
        const isProduction = import.meta.env.MODE === 'production' || import.meta.env.PROD;
        const apiUrl = import.meta.env.VITE_API_URL;
        const errorMsg = isProduction && !apiUrl
          ? 'API configuration error: VITE_API_URL is not set. The frontend is trying to use a relative API path, but in production it needs an absolute backend URL. Please set VITE_API_URL environment variable to your backend URL (e.g., https://your-backend.railway.app).'
          : isProduction
          ? `API configuration error: Received HTML instead of JSON from ${url}. This usually means the API request hit the static file server instead of the backend. Please verify that VITE_API_URL is set correctly (currently: ${apiUrl || 'not set'}).`
          : `API error: Received HTML instead of JSON from ${url}. The backend may not be running or the API URL is incorrect.`;
        throw new Error(errorMsg);
      }
      throw new Error(`Server error: ${response.status} ${response.statusText} - ${text.substring(0, 100)}`);
    }

    if (!response.ok) {
      const errorMessage = data?.error || data?.message || `Request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    return data;
  }

  // Auth
  async register(email, password, name) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    this.setToken(data.token);
    return data;
  }

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async getMe() {
    return this.request('/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  // Users
  async getUsers(search = '') {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request(`/users${params}`);
  }

  async getUser(id) {
    return this.request(`/users/${id}`);
  }

  // Projects
  async getProjects() {
    return this.request('/projects');
  }

  async getProject(id) {
    return this.request(`/projects/${id}`);
  }

  async createProject(name, description) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async updateProject(id, data) {
    return this.request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id) {
    return this.request(`/projects/${id}`, { method: 'DELETE' });
  }

  async addProjectMember(projectId, userId, role = 'member') {
    return this.request(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, role }),
    });
  }

  async removeProjectMember(projectId, userId) {
    return this.request(`/projects/${projectId}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  async getProjectMembers(projectId) {
    return this.request(`/projects/${projectId}/members`);
  }

  // Missions
  async getMissions(projectId) {
    return this.request(`/missions/project/${projectId}`);
  }

  async getMission(id) {
    return this.request(`/missions/${id}`);
  }

  async createMission(projectId, name, description) {
    return this.request('/missions', {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, name, description }),
    });
  }

  async updateMission(id, data) {
    return this.request(`/missions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMission(id) {
    return this.request(`/missions/${id}`, { method: 'DELETE' });
  }

  async reorderMissions(projectId, order) {
    return this.request(`/missions/reorder/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify({ order }),
    });
  }

  // Tasks
  async getTasks(missionId) {
    return this.request(`/tasks/mission/${missionId}`);
  }

  async getTask(id) {
    return this.request(`/tasks/${id}`);
  }

  async createTask(data) {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(id, data) {
    return this.request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTask(id) {
    return this.request(`/tasks/${id}`, { method: 'DELETE' });
  }

  async uploadAttachment(taskId, file) {
    const formData = new FormData();
    formData.append('file', file);

    const apiBase = this.getApiBase();
    const response = await fetch(`${apiBase}/tasks/${taskId}/attachments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.getToken()}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }
    return data;
  }

  async deleteAttachment(taskId, attachmentId) {
    return this.request(`/tasks/${taskId}/attachments/${attachmentId}`, {
      method: 'DELETE',
    });
  }

  // Comments
  async getComments(taskId) {
    return this.request(`/comments/task/${taskId}`);
  }

  async addComment(taskId, content) {
    return this.request(`/comments/task/${taskId}`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async updateComment(id, content) {
    return this.request(`/comments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }

  async deleteComment(id) {
    return this.request(`/comments/${id}`, { method: 'DELETE' });
  }

  // Notifications
  async getNotifications(unreadOnly = false) {
    const params = unreadOnly ? '?unread_only=true' : '';
    return this.request(`/notifications${params}`);
  }

  async markNotificationRead(id) {
    return this.request(`/notifications/${id}/read`, { method: 'PUT' });
  }

  async markAllNotificationsRead() {
    return this.request('/notifications/read-all', { method: 'PUT' });
  }

  async deleteNotification(id) {
    return this.request(`/notifications/${id}`, { method: 'DELETE' });
  }

  async dismissNotifications(ids) {
    return this.request('/notifications/dismiss', {
      method: 'POST',
      body: JSON.stringify({ notification_ids: ids }),
    });
  }

  // Personal Todos
  async getTodos() {
    return this.request('/todos');
  }

  async createTodo(title, notes, reminderAt) {
    return this.request('/todos', {
      method: 'POST',
      body: JSON.stringify({ title, notes, reminder_at: reminderAt }),
    });
  }

  async updateTodo(id, data) {
    return this.request(`/todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async toggleTodo(id) {
    return this.request(`/todos/${id}/toggle`, { method: 'PUT' });
  }

  async reorderTodos(order) {
    return this.request('/todos/reorder', {
      method: 'PUT',
      body: JSON.stringify({ order }),
    });
  }

  async deleteTodo(id) {
    return this.request(`/todos/${id}`, { method: 'DELETE' });
  }

  // Campaigns
  async getCampaigns(projectId) {
    return this.request(`/campaigns/project/${projectId}`);
  }

  async getCampaign(id) {
    return this.request(`/campaigns/${id}`);
  }

  async createCampaign(data) {
    return this.request('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCampaign(id, data) {
    return this.request(`/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCampaign(id) {
    return this.request(`/campaigns/${id}`, { method: 'DELETE' });
  }

  async ingestMetrics(campaignId, metrics) {
    return this.request(`/campaigns/${campaignId}/metrics`, {
      method: 'POST',
      body: JSON.stringify({ metrics }),
    });
  }

  async getAggregatedMetrics(projectId, options = {}) {
    const params = new URLSearchParams();
    if (options.startDate) params.append('start_date', options.startDate);
    if (options.endDate) params.append('end_date', options.endDate);
    if (options.groupBy) params.append('group_by', options.groupBy);
    
    return this.request(`/campaigns/project/${projectId}/aggregate?${params}`);
  }

  // Marketing Management (admin only)
  async getMarketingOverview() {
    return this.request('/marketing/overview');
  }

  async createMarketingCard(payload) {
    return this.request('/marketing/cards', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateMarketingCard(cardId, payload) {
    return this.request(`/marketing/cards/${cardId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteMarketingCard(cardId) {
    return this.request(`/marketing/cards/${cardId}`, { method: 'DELETE' });
  }

  async getMarketingCardTransactions(cardId) {
    return this.request(`/marketing/cards/${cardId}/transactions`);
  }

  async deleteMarketingTransaction(transactionId) {
    return this.request(`/marketing/transactions/${transactionId}`, { method: 'DELETE' });
  }

  async createMarketingRevenueColdToReal(payload) {
    return this.request('/marketing/transactions/revenue/cold-to-real', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async createMarketingRevenueFromOtherCardCold(payload) {
    return this.request('/marketing/transactions/revenue/from-card-cold', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async createMarketingExpenseSpend(payload) {
    return this.request('/marketing/transactions/expense/spend', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async createMarketingExpenseRealToCold(payload) {
    return this.request('/marketing/transactions/expense/real-to-cold', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async createMarketingAdAccount(payload) {
    return this.request('/marketing/ad-accounts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateMarketingAdAccount(adAccountId, payload) {
    return this.request(`/marketing/ad-accounts/${adAccountId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteMarketingAdAccount(adAccountId) {
    return this.request(`/marketing/ad-accounts/${adAccountId}`, { method: 'DELETE' });
  }

  // Audit logs (admin only)
  async getAuditLogs(options = {}) {
    const params = new URLSearchParams();
    if (options.userId) params.append('user_id', options.userId);
    if (options.objectType) params.append('object_type', options.objectType);
    if (options.action) params.append('action', options.action);
    if (options.startDate) params.append('start_date', options.startDate);
    if (options.endDate) params.append('end_date', options.endDate);
    if (options.page) params.append('page', options.page);
    if (options.limit) params.append('limit', options.limit);
    
    return this.request(`/audit?${params}`);
  }

  async getAuditStats() {
    return this.request('/audit/stats');
  }
}

export const api = new ApiService();
export default api;

