const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { calculateMetrics } = require('./profile');

// POST /api/simulator/simulate
router.post('/simulate', (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT 1').get();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const assessment = db.prepare('SELECT * FROM credit_assessments WHERE user_id = ?').get(user.id);
    const accounts = db.prepare('SELECT * FROM credit_accounts WHERE user_id = ?').all(user.id);
    const metrics = calculateMetrics(user.monthly_income, accounts);

    const {
      card_payoff_amount = 0,
      limit_increase_pct = 0,
      close_loan_id = null,
      missed_payments = 0,
      new_inquiries = 0,
      ontime_months = 0
    } = req.body;

    let baseScore = assessment ? assessment.current_score : 685;
    let scoreDelta = 0;
    const factorImpacts = [];

    // 1. Credit Utilization Impact (30% weight)
    const effectiveNewLimit = metrics.totalCardLimit * (1 + (Number(limit_increase_pct) / 100));
    const effectiveNewCardDebt = Math.max(0, metrics.totalCardDebt - Number(card_payoff_amount));
    const newUtilization = effectiveNewLimit > 0
      ? Number(((effectiveNewCardDebt / effectiveNewLimit) * 100).toFixed(1))
      : 0;

    const origUtil = metrics.utilizationRatio;
    const utilDiff = origUtil - newUtilization; // positive means utilization dropped

    if (utilDiff > 0) {
      // Points gain for dropping utilization
      let utilPoints = Math.round((utilDiff / 10) * 8); // ~8 pts per 10% drop
      if (newUtilization < 30 && origUtil >= 30) utilPoints += 12; // bonus for breaking 30% barrier
      if (newUtilization < 15 && origUtil >= 15) utilPoints += 8; // bonus for prime <15%
      scoreDelta += utilPoints;
      factorImpacts.push({
        factor: 'Credit Utilization',
        change: `Reduced from ${origUtil.toFixed(1)}% to ${newUtilization.toFixed(1)}%`,
        points: `+${utilPoints}`
      });
    }

    // 2. Pay off / Close a Loan
    let newMonthlyEMI = metrics.totalMonthlyEMI;
    let closedAccountName = '';
    if (close_loan_id) {
      const loanToClose = accounts.find(a => a.id === close_loan_id);
      if (loanToClose) {
        closedAccountName = loanToClose.institution_name;
        newMonthlyEMI = Math.max(0, newMonthlyEMI - loanToClose.monthly_emi_or_min_due);
        // Closing a high interest unsecured loan helps score (+10 to +18 pts)
        const loanClosurePoints = loanToClose.account_type === 'PERSONAL_LOAN' ? 18 : 10;
        scoreDelta += loanClosurePoints;
        factorImpacts.push({
          factor: 'Debt Amortization & DTI',
          change: `Fully paid off ${closedAccountName} (Saved ₹${loanToClose.monthly_emi_or_min_due.toLocaleString('en-IN')}/mo EMI)`,
          points: `+${loanClosurePoints}`
        });
      }
    }

    // 3. Missed Payments (Severe penalty - Payment History is 35% weight)
    if (missed_payments > 0) {
      const missPenalty = Number(missed_payments) === 1 ? -55 : -110;
      scoreDelta += missPenalty;
      factorImpacts.push({
        factor: 'Payment History (DPD 30+ Alert)',
        change: `${missed_payments} missed payment(s) reported to CIBIL`,
        points: `${missPenalty}`
      });
    }

    // 4. Hard Inquiries (10% weight)
    if (new_inquiries > 0) {
      const inquiryPenalty = -Math.min(35, Number(new_inquiries) * 9);
      scoreDelta += inquiryPenalty;
      factorImpacts.push({
        factor: 'Hard Inquiries',
        change: `${new_inquiries} new loan/card application checks`,
        points: `${inquiryPenalty}`
      });
    }

    // 5. On-Time Payment Streak
    if (ontime_months > 0) {
      const streakPoints = Math.min(30, Math.round((Number(ontime_months) / 6) * 15));
      scoreDelta += streakPoints;
      factorImpacts.push({
        factor: 'Payment Longevity',
        change: `${ontime_months} consecutive months of flawless 000 DPD payments`,
        points: `+${streakPoints}`
      });
    }

    const simulatedScore = Math.min(900, Math.max(300, baseScore + scoreDelta));
    const newDti = Number(((newMonthlyEMI / user.monthly_income) * 100).toFixed(1));

    // Generate narrative analysis
    let aiAnalysis = '';
    if (scoreDelta > 30) {
      aiAnalysis = `🚀 **Exceptional Progress:** This simulation delivers a massive **+${scoreDelta} points** boost, lifting your estimated CIBIL score from **${baseScore}** to **${simulatedScore}**! Bringing your card utilization down to **${newUtilization.toFixed(1)}%** signals strong financial discipline to underwriters and unlocks top-tier credit card rewards and lower loan interest rates.`;
    } else if (scoreDelta > 0) {
      aiAnalysis = `📈 **Positive Trajectory:** This strategy adds **+${scoreDelta} points**, raising your score to **${simulatedScore}**. Your DTI improves to **${newDti}%** and utilization drops to **${newUtilization.toFixed(1)}%**. Consistent adherence will secure prime borrowing status within 3 months.`;
    } else if (scoreDelta < -30) {
      aiAnalysis = `⚠️ **Critical Risk Warning:** A missed payment triggers a severe **${scoreDelta} points** crash down to **${simulatedScore}**. In the Indian banking system, a 30-day DPD stay visible on your CIBIL report for 36 months, disqualifying you from unsecured credit and driving up home loan interest rates by 1.5% to 3.0%.`;
    } else if (scoreDelta < 0) {
      aiAnalysis = `📉 **Score Contraction:** This scenario reduces your score by **${scoreDelta} points** to **${simulatedScore}**. Multiple hard inquiries in a brief window signal liquidity distress to credit bureau risk models.`;
    } else {
      aiAnalysis = `ℹ️ **Neutral Baseline:** The simulated changes do not significantly shift your CIBIL score. Focus on debt paydown and zero-inquiry patience for notable movement.`;
    }

    // Record simulation
    const simId = 'sim_' + Date.now();
    db.prepare(`
      INSERT INTO simulations (id, user_id, scenario_title, simulated_score, score_delta, details_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      simId,
      user.id,
      `Simulated Scenario (${scoreDelta >= 0 ? '+' : ''}${scoreDelta} pts)`,
      simulatedScore,
      scoreDelta,
      JSON.stringify({
        newUtilization,
        newDti,
        effectiveNewCardDebt,
        factorImpacts
      })
    );

    res.json({
      currentScore: baseScore,
      simulatedScore,
      scoreDelta,
      newUtilization,
      newDti,
      origUtilization: origUtil,
      origDti: metrics.dtiRatio,
      factorImpacts,
      aiAnalysis
    });
  } catch (error) {
    console.error('Error running simulator:', error);
    res.status(500).json({ error: 'Simulation failed', details: error.message });
  }
});

// GET /api/simulator/history
router.get('/history', (req, res) => {
  try {
    const user = db.prepare('SELECT id FROM users ORDER BY created_at DESC LIMIT 1').get();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const simulations = db.prepare('SELECT * FROM simulations WHERE user_id = ? ORDER BY created_at DESC LIMIT 6').all(user.id);
    const parsed = simulations.map(s => ({
      ...s,
      details: s.details_json ? JSON.parse(s.details_json) : {}
    }));

    res.json({ simulations: parsed });
  } catch (error) {
    console.error('Error fetching simulations:', error);
    res.status(500).json({ error: 'Failed to fetch simulations', details: error.message });
  }
});

module.exports = router;
