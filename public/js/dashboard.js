/**
 * Dashboard Controller
 */

const Dashboard = {
  init() {
    AppState.on('dataLoaded', (data) => this.render(data));
    AppState.on('profileUpdated', (data) => this.render(data));
  },

  render(data) {
    const { profile, assessment, metrics, accounts, history } = data;
    if (!profile || !assessment) return;

    // 1. Top Navbar User Badges
    const navUserName = document.getElementById('nav-user-name');
    const navUserCity = document.getElementById('nav-user-city');
    const navScoreBadge = document.getElementById('nav-score-badge');
    const navDtiBadge = document.getElementById('nav-dti-badge');
    const navUtilBadge = document.getElementById('nav-util-badge');

    if (navUserName) navUserName.textContent = profile.name;
    if (navUserCity) navUserCity.textContent = `${profile.city} • ${profile.employment_type}`;
    if (navScoreBadge) {
      navScoreBadge.textContent = `${assessment.bureau} ${assessment.current_score}`;
      navScoreBadge.className = `badge ${assessment.current_score >= 750 ? 'badge-emerald' : (assessment.current_score >= 700 ? 'badge-primary' : 'badge-amber')}`;
    }
    if (navDtiBadge) {
      navDtiBadge.textContent = `DTI: ${metrics.dtiRatio}%`;
      navDtiBadge.className = `badge ${metrics.dtiRatio > 45 ? 'badge-rose' : (metrics.dtiRatio > 35 ? 'badge-amber' : 'badge-emerald')}`;
    }
    if (navUtilBadge) {
      navUtilBadge.textContent = `Util: ${metrics.utilizationRatio}%`;
      navUtilBadge.className = `badge ${metrics.utilizationRatio > 50 ? 'badge-rose' : (metrics.utilizationRatio > 30 ? 'badge-amber' : 'badge-emerald')}`;
    }

    // 2. Circular SVG Score Radial Gauge
    ChartsEngine.renderScoreGauge(assessment.current_score, profile.target_score || 790);

    // 3. Stat Cards
    // DTI Card
    const dtiValEl = document.getElementById('stat-dti-val');
    const dtiBadgeEl = document.getElementById('stat-dti-badge');
    const dtiSubEl = document.getElementById('stat-dti-sub');
    if (dtiValEl) dtiValEl.textContent = `${metrics.dtiRatio}%`;
    if (dtiBadgeEl) {
      const isHigh = metrics.dtiRatio > 45;
      const isMod = metrics.dtiRatio > 30;
      dtiBadgeEl.textContent = isHigh ? 'High Risk' : (isMod ? 'Moderate' : 'Optimal');
      dtiBadgeEl.className = `badge ${isHigh ? 'badge-rose' : (isMod ? 'badge-amber' : 'badge-emerald')}`;
    }
    if (dtiSubEl) dtiSubEl.textContent = `₹${metrics.totalMonthlyEMI.toLocaleString('en-IN')} of ₹${profile.monthly_income.toLocaleString('en-IN')}`;

    // Utilization Card
    const utilValEl = document.getElementById('stat-util-val');
    const utilBadgeEl = document.getElementById('stat-util-badge');
    const utilSubEl = document.getElementById('stat-util-sub');
    if (utilValEl) utilValEl.textContent = `${metrics.utilizationRatio}%`;
    if (utilBadgeEl) {
      const isOver50 = metrics.utilizationRatio > 50;
      const isOver30 = metrics.utilizationRatio > 30;
      utilBadgeEl.textContent = isOver50 ? 'Critical' : (isOver30 ? 'Caution (>30%)' : 'Healthy');
      utilBadgeEl.className = `badge ${isOver50 ? 'badge-rose' : (isOver30 ? 'badge-amber' : 'badge-emerald')}`;
    }
    if (utilSubEl) utilSubEl.textContent = `₹${metrics.totalCardDebt.toLocaleString('en-IN')} / ₹${metrics.totalCardLimit.toLocaleString('en-IN')}`;

    // Monthly EMI Card
    const emiValEl = document.getElementById('stat-emi-val');
    const emiSubEl = document.getElementById('stat-emi-sub');
    if (emiValEl) emiValEl.textContent = `₹${metrics.totalMonthlyEMI.toLocaleString('en-IN')}`;
    if (emiSubEl) emiSubEl.textContent = `Across ${accounts.length} active credit lines`;

    // Total Debt Card
    const debtValEl = document.getElementById('stat-debt-val');
    const debtSubEl = document.getElementById('stat-debt-sub');
    if (debtValEl) debtValEl.textContent = `₹${metrics.totalDebt.toLocaleString('en-IN')}`;
    if (debtSubEl) debtSubEl.textContent = `Secured: ₹${metrics.totalSecuredDebt.toLocaleString('en-IN')} | Unsecured: ₹${metrics.totalUnsecuredDebt.toLocaleString('en-IN')}`;

    // 4. Five Pillars of CIBIL Score
    this.renderCibilPillars(assessment, metrics, accounts);

    // 5. Dynamic Alerts Banner
    const alertContainer = document.getElementById('dashboard-alert-banner');
    if (alertContainer) {
      if (metrics.utilizationRatio > 40) {
        alertContainer.className = 'alert alert-amber animate-fade-in';
        alertContainer.innerHTML = `
          <div style="font-size: 1.4rem;">⚠️</div>
          <div>
            <b>High Revolving Credit Utilization Detected (${metrics.utilizationRatio}%)</b><br>
            CIBIL penalizes card balances above 30%. Paying down <b>₹${Math.max(0, Math.round(metrics.totalCardDebt - (metrics.totalCardLimit * 0.30))).toLocaleString('en-IN')}</b> before your bill dates will immediately recover up to <b>+28 points</b>!
          </div>
        `;
      } else {
        alertContainer.className = 'alert alert-emerald animate-fade-in';
        alertContainer.innerHTML = `
          <div style="font-size: 1.4rem;">✅</div>
          <div>
            <b>Credit Utilization is within optimal range!</b><br>
            Your current utilization is <b>${metrics.utilizationRatio}%</b>. Maintain this track record to accelerate your trajectory to <b>750+ Prime status</b>.
          </div>
        `;
      }
    }

    // 6. Charts
    API.getHistory().then(histRes => {
      ChartsEngine.renderScoreHistoryChart(histRes.history, histRes.projectedTrajectory);
    });

    ChartsEngine.renderDebtDonutChart(accounts);
  },

  renderCibilPillars(assessment, metrics, accounts) {
    const pillarsContainer = document.getElementById('cibil-pillars-container');
    if (!pillarsContainer) return;

    const securedCount = accounts.filter(a => a.is_secured).length;
    const unsecuredCount = accounts.filter(a => !a.is_secured).length;

    const pillars = [
      {
        name: 'Payment History',
        weight: '35% weight',
        value: `${assessment.payment_history_pct || 98}%`,
        status: assessment.payment_history_pct >= 98 ? 'Flawless' : 'Needs Care',
        statusColor: assessment.payment_history_pct >= 98 ? 'text-emerald' : 'text-amber',
        progress: assessment.payment_history_pct || 98,
        barColor: '#10b981'
      },
      {
        name: 'Credit Card Utilization',
        weight: '30% weight',
        value: `${metrics.utilizationRatio}%`,
        status: metrics.utilizationRatio <= 30 ? 'Excellent (<30%)' : 'High Usage',
        statusColor: metrics.utilizationRatio <= 30 ? 'text-emerald' : 'text-rose',
        progress: Math.min(100, (metrics.utilizationRatio / 60) * 100),
        barColor: metrics.utilizationRatio <= 30 ? '#10b981' : '#f43f5e'
      },
      {
        name: 'Credit History Age',
        weight: '15% weight',
        value: `${Math.floor((assessment.credit_age_months || 48) / 12)} yrs ${(assessment.credit_age_months || 48) % 12} mos`,
        status: (assessment.credit_age_months || 48) >= 36 ? 'Established' : 'Young',
        statusColor: 'text-primary',
        progress: Math.min(100, ((assessment.credit_age_months || 48) / 72) * 100),
        barColor: '#6366f1'
      },
      {
        name: 'Credit Mix',
        weight: '10% weight',
        value: `${securedCount} Secured / ${unsecuredCount} Unsecured`,
        status: securedCount > 0 ? 'Healthy Balance' : 'All Unsecured',
        statusColor: securedCount > 0 ? 'text-cyan' : 'text-amber',
        progress: 75,
        barColor: '#06b6d4'
      },
      {
        name: 'Recent Inquiries (6M)',
        weight: '10% weight',
        value: `${assessment.hard_inquiries_6m || 2} Inquiries`,
        status: (assessment.hard_inquiries_6m || 2) <= 2 ? 'Low Risk' : 'Moderate',
        statusColor: (assessment.hard_inquiries_6m || 2) <= 2 ? 'text-emerald' : 'text-amber',
        progress: Math.max(20, 100 - ((assessment.hard_inquiries_6m || 2) * 25)),
        barColor: '#f59e0b'
      }
    ];

    pillarsContainer.innerHTML = pillars.map(p => `
      <div class="factor-row">
        <div class="factor-meta">
          <span class="factor-name">
            ${p.name}
            <span class="text-dim" style="font-size: 0.72rem; font-weight: normal;">(${p.weight})</span>
          </span>
          <span class="factor-score-impact ${p.statusColor}">
            ${p.value} • ${p.status}
          </span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: ${p.progress}%; background: ${p.barColor};"></div>
        </div>
      </div>
    `).join('');
  }
};

window.Dashboard = Dashboard;
