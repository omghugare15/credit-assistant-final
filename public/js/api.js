/**
 * API Client for Credit Assistant
 */

const API = {
  getApiKey() {
    return localStorage.getItem('credit_assistant_gemini_key') || '';
  },

  setApiKey(key) {
    if (key && key.trim()) {
      localStorage.setItem('credit_assistant_gemini_key', key.trim());
    } else {
      localStorage.removeItem('credit_assistant_gemini_key');
    }
  },

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const apiKey = this.getApiKey();
    if (apiKey) {
      headers['x-gemini-key'] = apiKey;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers
    });

    if (!response.ok) {
      let errorMsg = `Server error: ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson.error) errorMsg = errJson.error;
      } catch (e) {}
      throw new Error(errorMsg);
    }

    return response.json();
  },

  // Profile Endpoints
  getProfile() {
    return this.request('/api/profile');
  },

  submitOnboarding(data) {
    return this.request('/api/profile/onboarding', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  resetDemo() {
    return this.request('/api/profile/reset-demo', {
      method: 'POST'
    });
  },

  // Accounts Endpoints
  getAccounts() {
    return this.request('/api/accounts');
  },

  addAccount(data) {
    return this.request('/api/accounts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateAccount(id, data) {
    return this.request(`/api/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deleteAccount(id) {
    return this.request(`/api/accounts/${id}`, {
      method: 'DELETE'
    });
  },

  // Score History Endpoints
  getHistory() {
    return this.request('/api/history');
  },

  logScoreHistory(data) {
    return this.request('/api/history', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Gemini AI Advisor Endpoints
  getChatHistory() {
    return this.request('/api/advisor/chat');
  },

  sendChatMessage(message) {
    return this.request('/api/advisor/chat', {
      method: 'POST',
      body: JSON.stringify({ message })
    });
  },

  clearChatHistory() {
    return this.request('/api/advisor/chat', {
      method: 'DELETE'
    });
  },

  getActionPlans() {
    return this.request('/api/advisor/action-plans');
  },

  toggleActionPlan(id) {
    return this.request(`/api/advisor/action-plans/${id}/toggle`, {
      method: 'PUT'
    });
  },

  generateActionPlan() {
    return this.request('/api/advisor/generate-action-plan', {
      method: 'POST'
    });
  },

  // Simulator Endpoints
  runSimulation(params) {
    return this.request('/api/simulator/simulate', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  getSimulationHistory() {
    return this.request('/api/simulator/history');
  }
};

window.API = API;
