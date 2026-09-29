/**
 * Global App State & Event Bus
 */

const State = {
  profile: null,
  assessment: null,
  metrics: null,
  accounts: [],
  history: [],
  actionPlans: [],
  listeners: {},

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  },

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in event listener for ${event}:`, e);
        }
      });
    }
  },

  async loadInitialData() {
    try {
      const profileData = await API.getProfile();
      this.profile = profileData.user;
      this.assessment = profileData.assessment;
      this.metrics = profileData.metrics;

      const accountsData = await API.getAccounts();
      this.accounts = accountsData.accounts || [];

      const historyData = await API.getHistory();
      this.history = historyData.history || [];

      const plansData = await API.getActionPlans();
      this.actionPlans = plansData.plans || [];

      this.emit('dataLoaded', {
        profile: this.profile,
        assessment: this.assessment,
        metrics: this.metrics,
        accounts: this.accounts,
        history: this.history,
        actionPlans: this.actionPlans
      });

      return true;
    } catch (err) {
      console.error('Failed to load initial state:', err);
      this.emit('error', err);
      return false;
    }
  },

  async refreshProfile() {
    try {
      const profileData = await API.getProfile();
      this.profile = profileData.user;
      this.assessment = profileData.assessment;
      this.metrics = profileData.metrics;

      const accountsData = await API.getAccounts();
      this.accounts = accountsData.accounts || [];

      const historyData = await API.getHistory();
      this.history = historyData.history || [];

      this.emit('profileUpdated', {
        profile: this.profile,
        assessment: this.assessment,
        metrics: this.metrics,
        accounts: this.accounts
      });
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
  }
};

window.AppState = State;
