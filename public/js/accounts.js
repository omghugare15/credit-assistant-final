/**
 * Accounts & Debt Strategist Controller
 */

const Accounts = {
  init() {
    this.bindEvents();
    AppState.on('dataLoaded', () => this.loadAccounts());
    AppState.on('profileUpdated', () => this.loadAccounts());
  },

  bindEvents() {
    const addBtn = document.getElementById('btn-open-add-account');
    const modal = document.getElementById('modal-add-account');
    const closeBtn = document.getElementById('btn-close-account-modal');
    const form = document.getElementById('form-add-account');
    const accTypeSelect = document.getElementById('acc-type-select');

    if (addBtn && modal) {
      addBtn.addEventListener('click', () => {
        modal.classList.add('open');
      });
    }

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('open');
      });
    }

    if (accTypeSelect) {
      accTypeSelect.addEventListener('change', () => {
        const isCard = accTypeSelect.value === 'CREDIT_CARD';
        const limitLabel = document.getElementById('acc-limit-label');
        const emiLabel = document.getElementById('acc-emi-label');
        if (limitLabel) limitLabel.textContent = isCard ? 'Sanctioned Credit Limit (₹)' : 'Sanctioned Loan Amount (₹)';
        if (emiLabel) emiLabel.textContent = isCard ? 'Minimum Amount Due (₹)' : 'Monthly EMI (₹)';
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = document.getElementById('acc-type-select').value;
        const name = document.getElementById('acc-name-input').value;
        const last4 = document.getElementById('acc-last4-input').value;
        const limit = Number(document.getElementById('acc-limit-input').value || 0);
        const outstanding = Number(document.getElementById('acc-bal-input').value || 0);
        const emi = Number(document.getElementById('acc-emi-input').value || 0);
        const rate = Number(document.getElementById('acc-rate-input').value || 12);
        const isSecured = document.getElementById('acc-secured-check').checked;

        try {
          await API.addAccount({
            account_type: type,
            institution_name: name,
            account_number_last4: last4,
            sanctioned_limit_or_loan: limit,
            current_outstanding: outstanding,
            monthly_emi_or_min_due: emi,
            interest_rate: rate,
            is_secured: isSecured ? 1 : 0
          });

          form.reset();
          if (modal) modal.classList.remove('open');
          await AppState.refreshProfile();
          Advisor.showToast('✅ Account added to your credit profile!');
        } catch (err) {
          alert('Failed to add account: ' + err.message);
        }
      });
    }
  },

  async loadAccounts() {
    try {
      const data = await API.getAccounts();
      const { creditCards = [], loans = [], payoffComparison } = data;

      this.renderCreditCards(creditCards);
      this.renderLoans(loans);
      this.renderPayoffComparison(payoffComparison);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  },

  renderCreditCards(cards) {
    const container = document.getElementById('cards-list-container');
    if (!container) return;

    if (cards.length === 0) {
      container.innerHTML = `<div class="text-dim" style="padding: 1.5rem; text-align: center;">No credit cards registered.</div>`;
      return;
    }

    container.innerHTML = cards.map(c => {
      const utilPct = c.sanctioned_limit_or_loan > 0
        ? ((c.current_outstanding / c.sanctioned_limit_or_loan) * 100).toFixed(1)
        : 0;
      const isHigh = utilPct > 50;
      const isMod = utilPct > 30;
      const statusClass = isHigh ? 'badge-rose' : (isMod ? 'badge-amber' : 'badge-emerald');
      const barColor = isHigh ? '#f43f5e' : (isMod ? '#f59e0b' : '#10b981');

      return `
        <div class="account-item-card">
          <div class="account-top-row">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 1.25rem;">💳</span>
              <div>
                <span class="account-inst-name">${c.institution_name}</span>
                <span class="text-dim" style="font-size: 0.75rem;">(ending ••${c.account_number_last4})</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="badge ${statusClass}">${utilPct}% Utilized</span>
              <button class="btn btn-ghost btn-sm" onclick="Accounts.deleteAcc('${c.id}')" title="Delete card" style="color: var(--rose);">✕</button>
            </div>
          </div>

          <div class="account-figures-row">
            <span>Outstanding: <b style="color: #fff;">₹${c.current_outstanding.toLocaleString('en-IN')}</b></span>
            <span>Limit: <b>₹${c.sanctioned_limit_or_loan.toLocaleString('en-IN')}</b></span>
            <span>Min Due: <b>₹${c.monthly_emi_or_min_due.toLocaleString('en-IN')}</b></span>
          </div>

          <div class="progress-track" style="margin-bottom: 0.35rem;">
            <div class="progress-fill" style="width: ${Math.min(100, utilPct)}%; background: ${barColor};"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-dim);">
            <span>APR: ${c.interest_rate}%</span>
            <span>Target: Keep under ₹${Math.round(c.sanctioned_limit_or_loan * 0.30).toLocaleString('en-IN')} (30%)</span>
          </div>
        </div>
      `;
    }).join('');
  },

  renderLoans(loans) {
    const container = document.getElementById('loans-list-container');
    if (!container) return;

    if (loans.length === 0) {
      container.innerHTML = `<div class="text-dim" style="padding: 1.5rem; text-align: center;">No active term loans.</div>`;
      return;
    }

    container.innerHTML = loans.map(l => {
      const typeIcons = {
        'PERSONAL_LOAN': '💼',
        'HOME_LOAN': '🏠',
        'AUTO_LOAN': '🛵',
        'BNPL': '🛍️',
        'EDUCATION_LOAN': '🎓'
      };
      const icon = typeIcons[l.account_type] || '📄';
      const isDelinquent = l.dpd_status !== '000';

      return `
        <div class="account-item-card">
          <div class="account-top-row">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 1.25rem;">${icon}</span>
              <div>
                <span class="account-inst-name">${l.institution_name}</span>
                <span class="text-dim" style="font-size: 0.75rem;">(••${l.account_number_last4})</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="badge ${l.is_secured ? 'badge-primary' : 'badge-neutral'}">
                ${l.is_secured ? 'Secured' : 'Unsecured'}
              </span>
              <span class="badge ${isDelinquent ? 'badge-rose' : 'badge-emerald'}">
                DPD: ${l.dpd_status}
              </span>
              <button class="btn btn-ghost btn-sm" onclick="Accounts.deleteAcc('${l.id}')" title="Delete loan" style="color: var(--rose);">✕</button>
            </div>
          </div>

          <div class="account-figures-row">
            <span>Outstanding: <b style="color: #fff;">₹${l.current_outstanding.toLocaleString('en-IN')}</b></span>
            <span>Monthly EMI: <b style="color: var(--primary-light);">₹${l.monthly_emi_or_min_due.toLocaleString('en-IN')}</b></span>
            <span>Rate: <b>${l.interest_rate}%</b></span>
          </div>
        </div>
      `;
    }).join('');
  },

  renderPayoffComparison(comparison) {
    const avalancheList = document.getElementById('avalanche-priority-list');
    const snowballList = document.getElementById('snowball-priority-list');
    const interestSavedEl = document.getElementById('avalanche-interest-saved');

    if (interestSavedEl && comparison?.avalanche?.estimatedAnnualInterestSaved) {
      interestSavedEl.textContent = `₹${comparison.avalanche.estimatedAnnualInterestSaved.toLocaleString('en-IN')}`;
    }

    if (avalancheList && comparison?.avalanche?.priorityList) {
      avalancheList.innerHTML = comparison.avalanche.priorityList.map((item, idx) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid var(--border-subtle); font-size: 0.85rem;">
          <div>
            <b>${idx + 1}. ${item.name}</b>
            <div class="text-dim" style="font-size: 0.75rem;">Bal: ₹${item.balance.toLocaleString('en-IN')} • EMI: ₹${item.emi.toLocaleString('en-IN')}</div>
          </div>
          <span class="badge badge-rose" style="font-family: var(--font-mono);">${item.rate || 40}% APR</span>
        </div>
      `).join('');
    }

    if (snowballList && comparison?.snowball?.priorityList) {
      snowballList.innerHTML = comparison.snowball.priorityList.map((item, idx) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid var(--border-subtle); font-size: 0.85rem;">
          <div>
            <b>${idx + 1}. ${item.name}</b>
            <div class="text-dim" style="font-size: 0.75rem;">EMI: ₹${item.emi.toLocaleString('en-IN')}</div>
          </div>
          <span class="badge badge-primary" style="font-family: var(--font-mono);">₹${item.balance.toLocaleString('en-IN')}</span>
        </div>
      `).join('');
    }
  },

  async deleteAcc(id) {
    if (confirm('Are you sure you want to remove this account?')) {
      try {
        await API.deleteAccount(id);
        await AppState.refreshProfile();
        Advisor.showToast('Account removed from your profile.');
      } catch (err) {
        alert('Failed to delete account: ' + err.message);
      }
    }
  }
};

window.Accounts = Accounts;
