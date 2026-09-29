/**
 * Data Visualization & Gauge Engine
 */

const ChartsEngine = {
  scoreChartInstance: null,
  debtChartInstance: null,

  // Initialize or update circular CIBIL Score Radial Gauge
  renderScoreGauge(score, targetScore = 790) {
    const minScore = 300;
    const maxScore = 900;
    const clampedScore = Math.min(maxScore, Math.max(minScore, score));
    const percentage = (clampedScore - minScore) / (maxScore - minScore);

    // SVG arc calculation (semi-circle from 180deg to 0deg)
    const radius = 95;
    const circumference = Math.PI * radius; // half circle circumference ~298.45
    const strokeDashoffset = circumference * (1 - percentage);

    const gaugeFill = document.getElementById('gauge-fill-path');
    const scoreDisplay = document.getElementById('gauge-score-value');
    const tierBadge = document.getElementById('gauge-tier-badge');
    const targetInfo = document.getElementById('gauge-target-info');

    if (gaugeFill) {
      gaugeFill.style.strokeDasharray = `${circumference} ${circumference}`;
      gaugeFill.style.strokeDashoffset = strokeDashoffset;

      // Color gradation based on Indian CIBIL norms
      let strokeColor = '#f43f5e'; // Poor (<650)
      let tierName = 'Needs Attention';
      let tierClass = 'badge-rose';

      if (clampedScore >= 750) {
        strokeColor = '#10b981'; // Excellent (750+)
        tierName = 'Excellent (Prime)';
        tierClass = 'badge-emerald';
      } else if (clampedScore >= 700) {
        strokeColor = '#06b6d4'; // Good (700-749)
        tierName = 'Good';
        tierClass = 'badge-primary';
      } else if (clampedScore >= 650) {
        strokeColor = '#f59e0b'; // Fair (650-699)
        tierName = 'Fair / Average';
        tierClass = 'badge-amber';
      }

      gaugeFill.style.stroke = strokeColor;

      if (tierBadge) {
        tierBadge.textContent = tierName;
        tierBadge.className = `badge ${tierClass}`;
      }
    }

    if (scoreDisplay) {
      // Animate score counter
      this.animateCounter(scoreDisplay, parseInt(scoreDisplay.textContent) || minScore, clampedScore, 1000);
    }

    if (targetInfo) {
      const diff = targetScore - clampedScore;
      if (diff > 0) {
        targetInfo.innerHTML = `<span class="text-amber">▲ ${diff} points</span> needed to achieve Prime status (<b>${targetScore}</b>)`;
      } else {
        targetInfo.innerHTML = `<span class="text-emerald">★ Target Achieved!</span> Prime tier active (<b>${targetScore}</b>)`;
      }
    }
  },

  animateCounter(element, start, end, duration) {
    if (isNaN(start)) start = 300;
    const range = end - start;
    const startTime = performance.now();

    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease out
      const current = Math.round(start + (range * easeProgress));
      element.textContent = current;

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        element.textContent = end;
      }
    }

    requestAnimationFrame(update);
  },

  // 12-Month Score Trend & Projected Trajectory Chart (Chart.js)
  renderScoreHistoryChart(historyData = [], projectedData = []) {
    const ctx = document.getElementById('scoreHistoryChart');
    if (!ctx || typeof Chart === 'undefined') return;

    if (this.scoreChartInstance) {
      this.scoreChartInstance.destroy();
    }

    // Historical labels and points
    const labels = [];
    const historicalPoints = [];
    const projectedPoints = [];

    historyData.forEach(h => {
      const d = new Date(h.recorded_date);
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      labels.push(label);
      historicalPoints.push(h.score);
      projectedPoints.push(null); // null so it doesn't duplicate
    });

    // Bridge historical to projected
    const lastHistorical = historicalPoints[historicalPoints.length - 1] || 685;
    if (projectedPoints.length > 0) {
      projectedPoints[projectedPoints.length - 1] = lastHistorical;
    }

    projectedData.forEach(p => {
      labels.push(p.month + ' (Est)');
      historicalPoints.push(null);
      projectedPoints.push(p.projectedScore);
    });

    // Create chart
    this.scoreChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Verified Score History',
            data: historicalPoints,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.12)',
            borderWidth: 3,
            pointBackgroundColor: '#6366f1',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            fill: 'origin',
            tension: 0.35
          },
          {
            label: 'AI-Projected Trajectory (Optimal Habits)',
            data: projectedPoints,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            borderWidth: 3,
            borderDash: [6, 6],
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: false,
            tension: 0.35
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#94a3b8',
              font: { family: 'Plus Jakarta Sans', size: 12, weight: 600 },
              usePointStyle: true,
              boxWidth: 8
            }
          },
          tooltip: {
            backgroundColor: 'rgba(18, 28, 51, 0.95)',
            titleColor: '#fff',
            bodyColor: '#94a3b8',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${context.raw ? context.raw + ' pts' : 'N/A'}`;
              }
            }
          }
        },
        scales: {
          y: {
            min: 550,
            max: 850,
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            },
            ticks: {
              color: '#64748b',
              stepSize: 50,
              font: { family: 'Plus Jakarta Sans', size: 11 }
            }
          },
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.03)'
            },
            ticks: {
              color: '#64748b',
              font: { family: 'Plus Jakarta Sans', size: 11 }
            }
          }
        }
      }
    });
  },

  // Debt Breakdown Distribution Chart (Donut)
  renderDebtDonutChart(accounts = []) {
    const ctx = document.getElementById('debtDonutChart');
    if (!ctx || typeof Chart === 'undefined') return;

    if (this.debtChartInstance) {
      this.debtChartInstance.destroy();
    }

    const categories = {
      'Credit Cards': 0,
      'Personal Loans': 0,
      'Auto Loans': 0,
      'Home Loans': 0,
      'Other': 0
    };

    accounts.forEach(a => {
      const type = a.account_type;
      const bal = a.current_outstanding || 0;
      if (type === 'CREDIT_CARD') categories['Credit Cards'] += bal;
      else if (type === 'PERSONAL_LOAN') categories['Personal Loans'] += bal;
      else if (type === 'AUTO_LOAN') categories['Auto Loans'] += bal;
      else if (type === 'HOME_LOAN') categories['Home Loans'] += bal;
      else categories['Other'] += bal;
    });

    const activeLabels = [];
    const activeData = [];
    const colors = [
      '#f43f5e', // Cards (Red/Rose)
      '#f59e0b', // Personal Loan (Amber)
      '#06b6d4', // Auto Loan (Cyan)
      '#6366f1', // Home Loan (Indigo)
      '#a855f7'  // Other
    ];

    Object.entries(categories).forEach(([name, amount]) => {
      if (amount > 0) {
        activeLabels.push(name);
        activeData.push(amount);
      }
    });

    this.debtChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: activeLabels,
        datasets: [{
          data: activeData,
          backgroundColor: colors.slice(0, activeLabels.length),
          borderColor: '#121c33',
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#94a3b8',
              font: { family: 'Plus Jakarta Sans', size: 11 },
              boxWidth: 10,
              padding: 10
            }
          },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                return ` ₹${ctx.raw.toLocaleString('en-IN')}`;
              }
            }
          }
        },
        cutout: '72%'
      }
    });
  }
};

window.ChartsEngine = ChartsEngine;
