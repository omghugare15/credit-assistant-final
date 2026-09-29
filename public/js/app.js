/**
 * Application Bootstrap & Main Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Tabs
  initTabs();

  // 2. Initialize Gemini Settings Modal
  initApiKeyModal();

  // 3. Initialize Demo Reset Button
  initResetDemo();

  // 4. Initialize Sub-modules
  Dashboard.init();
  Advisor.init();
  Simulator.init();
  Accounts.init();
  Disputes.init();
  Onboarding.init();

  // 5. Load State
  await AppState.loadInitialData();
});

function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const views = document.querySelectorAll('.view-section');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.getAttribute('data-tab');

      // Update button active state
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Show targeted view
      views.forEach(v => {
        if (v.id === `view-${targetView}`) {
          v.classList.add('active');
        } else {
          v.classList.remove('active');
        }
      });

      // Special handling on tab reveal
      if (targetView === 'dashboard') {
        if (AppState.assessment) {
          ChartsEngine.renderScoreGauge(AppState.assessment.current_score, AppState.profile?.target_score);
        }
      } else if (targetView === 'simulator') {
        Simulator.triggerSimulation();
      } else if (targetView === 'accounts') {
        Accounts.loadAccounts();
      }
    });
  });
}

function initApiKeyModal() {
  const openBtn = document.getElementById('btn-open-api-modal');
  const modal = document.getElementById('modal-api-settings');
  const closeBtn = document.getElementById('btn-close-api-modal');
  const saveBtn = document.getElementById('btn-save-api-key');
  const input = document.getElementById('gemini-api-key-input');
  const statusBadge = document.getElementById('gemini-engine-badge');

  function updateStatusBadge() {
    const key = API.getApiKey();
    if (statusBadge) {
      if (key) {
        statusBadge.innerHTML = `<span class="badge-dot" style="color: #10b981;"></span> Gemini Live API`;
        statusBadge.className = 'badge badge-emerald';
      } else {
        statusBadge.innerHTML = `<span class="badge-dot" style="color: #6366f1;"></span> Intelligent Engine`;
        statusBadge.className = 'badge badge-primary';
      }
    }
  }

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => {
      if (input) input.value = API.getApiKey();
      modal.classList.add('open');
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('open');
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const key = input ? input.value.trim() : '';
      API.setApiKey(key);
      updateStatusBadge();
      if (modal) modal.classList.remove('open');
      Advisor.showToast(key ? '🔑 Gemini API Key configured!' : 'Switched to Built-in Credit Engine');
    });
  }

  updateStatusBadge();
}

function initResetDemo() {
  const resetBtn = document.getElementById('btn-reset-demo');
  if (!resetBtn) return;

  resetBtn.addEventListener('click', async () => {
    if (confirm('Reset to standard Indian benchmark profile (Rohan Sharma - 685 CIBIL)?')) {
      resetBtn.disabled = true;
      resetBtn.innerHTML = '<span class="spinner"></span> Resetting...';
      try {
        await API.resetDemo();
        await AppState.loadInitialData();
        Advisor.showToast('↺ Demo profile restored successfully');
      } catch (e) {
        alert('Reset error: ' + e.message);
      } finally {
        resetBtn.disabled = false;
        resetBtn.innerHTML = '↺ Reset Demo';
      }
    }
  });
}
