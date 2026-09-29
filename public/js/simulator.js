/**
 * Interactive What-If Credit Score Simulator
 */

const Simulator = {
  debounceTimer: null,

  init() {
    this.bindEvents();
    AppState.on('dataLoaded', (data) => this.populateDefaults(data));
    AppState.on('profileUpdated', (data) => this.populateDefaults(data));
  },

  populateDefaults(data) {
    const { metrics, accounts } = data;
    if (!metrics) return;

    // Set slider max for card payoff to current total card debt
    const paySlider = document.getElementById('sim-pay-slider');
    const payMaxLabel = document.getElementById('sim-pay-max-label');
    if (paySlider) {
      paySlider.max = Math.max(10000, metrics.totalCardDebt);
      paySlider.value = 0;
      this.updateSliderValueDisplay('sim-pay-slider', 'sim-pay-val', '₹', true);
    }
    if (payMaxLabel) {
      payMaxLabel.textContent = `₹${metrics.totalCardDebt.toLocaleString('en-IN')}`;
    }

    // Populate loan closure select
    const loanSelect = document.getElementById('sim-close-loan-select');
    if (loanSelect) {
      const nonCardLoans = accounts.filter(a => a.account_type !== 'CREDIT_CARD');
      loanSelect.innerHTML = `<option value="">None (Keep existing loans)</option>` +
        nonCardLoans.map(l => `<option value="${l.id}">${l.institution_name} (Bal: ₹${l.current_outstanding.toLocaleString('en-IN')}, EMI: ₹${l.monthly_emi_or_min_due.toLocaleString('en-IN')})</option>`).join('');
    }

    // Run baseline simulation
    this.triggerSimulation();
  },

  bindEvents() {
    const inputs = [
      'sim-pay-slider',
      'sim-limit-slider',
      'sim-close-loan-select',
      'sim-miss-select',
      'sim-inquiry-slider',
      'sim-ontime-slider'
    ];

    inputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          this.handleInputChange(id);
          this.debouncedSimulate();
        });
        el.addEventListener('change', () => {
          this.debouncedSimulate();
        });
      }
    });

    // Quick chips for paydown
    document.querySelectorAll('.sim-quick-pay').forEach(btn => {
      btn.addEventListener('click', () => {
        const amt = Number(btn.getAttribute('data-amt') || 0);
        const slider = document.getElementById('sim-pay-slider');
        if (slider) {
          slider.value = Math.min(Number(slider.max), amt);
          this.handleInputChange('sim-pay-slider');
          this.debouncedSimulate();
        }
      });
    });

    const resetBtn = document.getElementById('sim-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        document.getElementById('sim-pay-slider').value = 0;
        document.getElementById('sim-limit-slider').value = 0;
        document.getElementById('sim-close-loan-select').value = '';
        document.getElementById('sim-miss-select').value = '0';
        document.getElementById('sim-inquiry-slider').value = 0;
        document.getElementById('sim-ontime-slider').value = 0;

        inputs.forEach(id => this.handleInputChange(id));
        this.triggerSimulation();
      });
    }
  },

  handleInputChange(id) {
    if (id === 'sim-pay-slider') {
      this.updateSliderValueDisplay('sim-pay-slider', 'sim-pay-val', '₹', true);
    } else if (id === 'sim-limit-slider') {
      this.updateSliderValueDisplay('sim-limit-slider', 'sim-limit-val', '+', false, '%');
    } else if (id === 'sim-inquiry-slider') {
      this.updateSliderValueDisplay('sim-inquiry-slider', 'sim-inquiry-val', '', false, ' inquiries');
    } else if (id === 'sim-ontime-slider') {
      this.updateSliderValueDisplay('sim-ontime-slider', 'sim-ontime-val', '', false, ' months');
    }
  },

  updateSliderValueDisplay(sliderId, displayId, prefix = '', isCurrency = false, suffix = '') {
    const slider = document.getElementById(sliderId);
    const display = document.getElementById(displayId);
    if (!slider || !display) return;

    const val = Number(slider.value);
    display.textContent = `${prefix}${isCurrency ? val.toLocaleString('en-IN') : val}${suffix}`;
  },

  debouncedSimulate() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.triggerSimulation();
    }, 200);
  },

  async triggerSimulation() {
    const payAmt = Number(document.getElementById('sim-pay-slider')?.value || 0);
    const limitPct = Number(document.getElementById('sim-limit-slider')?.value || 0);
    const closeLoanId = document.getElementById('sim-close-loan-select')?.value || null;
    const missCount = Number(document.getElementById('sim-miss-select')?.value || 0);
    const newInquiries = Number(document.getElementById('sim-inquiry-slider')?.value || 0);
    const ontimeMonths = Number(document.getElementById('sim-ontime-slider')?.value || 0);

    try {
      const result = await API.runSimulation({
        card_payoff_amount: payAmt,
        limit_increase_pct: limitPct,
        close_loan_id: closeLoanId,
        missed_payments: missCount,
        new_inquiries: newInquiries,
        ontime_months: ontimeMonths
      });

      this.renderSimulationResult(result);
    } catch (err) {
      console.error('Failed to run simulation:', err);
    }
  },

  renderSimulationResult(res) {
    const curScoreEl = document.getElementById('sim-cur-score');
    const simScoreEl = document.getElementById('sim-result-score');
    const deltaBadgeEl = document.getElementById('sim-delta-badge');
    const newUtilEl = document.getElementById('sim-new-util');
    const newDtiEl = document.getElementById('sim-new-dti');
    const narrativeEl = document.getElementById('sim-narrative-text');
    const factorsListEl = document.getElementById('sim-factors-list');

    if (curScoreEl) curScoreEl.textContent = res.currentScore;
    if (simScoreEl) simScoreEl.textContent = res.simulatedScore;

    if (deltaBadgeEl) {
      const isPositive = res.scoreDelta > 0;
      const isNegative = res.scoreDelta < 0;
      const sign = isPositive ? '+' : '';
      deltaBadgeEl.textContent = `${sign}${res.scoreDelta} Points`;
      deltaBadgeEl.className = `badge ${isPositive ? 'badge-emerald' : (isNegative ? 'badge-rose' : 'badge-neutral')}`;
    }

    if (newUtilEl) {
      newUtilEl.textContent = `${res.newUtilization}%`;
      newUtilEl.className = `tabular-nums ${res.newUtilization <= 30 ? 'text-emerald' : (res.newUtilization <= 50 ? 'text-amber' : 'text-rose')}`;
    }

    if (newDtiEl) {
      newDtiEl.textContent = `${res.newDti}%`;
      newDtiEl.className = `tabular-nums ${res.newDti <= 35 ? 'text-emerald' : (res.newDti <= 45 ? 'text-amber' : 'text-rose')}`;
    }

    if (narrativeEl) {
      narrativeEl.innerHTML = Advisor.formatMarkdown(res.aiAnalysis);
    }

    if (factorsListEl) {
      if (!res.factorImpacts || res.factorImpacts.length === 0) {
        factorsListEl.innerHTML = `<div class="text-dim" style="font-size: 0.85rem; padding: 0.5rem 0;">No changes adjusted yet. Move the sliders above to preview score outcomes!</div>`;
      } else {
        factorsListEl.innerHTML = res.factorImpacts.map(f => {
          const isPos = f.points.startsWith('+');
          return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.55rem 0; border-bottom: 1px solid var(--border-subtle); font-size: 0.86rem;">
              <div>
                <b style="color: var(--text-main);">${f.factor}</b>
                <div class="text-muted" style="font-size: 0.78rem;">${f.change}</div>
              </div>
              <span class="badge ${isPos ? 'badge-emerald' : 'badge-rose'}" style="font-family: var(--font-mono); font-weight: 700;">
                ${f.points} pts
              </span>
            </div>
          `;
        }).join('');
      }
    }
  }
};

window.Simulator = Simulator;
