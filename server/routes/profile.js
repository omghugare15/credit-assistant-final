const express = require('express');
const router = express.Router();
const { db } = require('../db');

function calculateMetrics(monthlyIncome, accounts) {
  let totalCardLimit = 0;
  let totalCardDebt = 0;
  let totalMonthlyEMI = 0;
  let totalSecuredDebt = 0;
  let totalUnsecuredDebt = 0;

  for (const acc of accounts) {
    if (acc.account_type === 'CREDIT_CARD') {
      totalCardLimit += (acc.sanctioned_limit_or_loan || 0);
      totalCardDebt += (acc.current_outstanding || 0);
      totalMonthlyEMI += (acc.monthly_emi_or_min_due || 0);
      totalUnsecuredDebt += (acc.current_outstanding || 0);
    } else {
      totalMonthlyEMI += (acc.monthly_emi_or_min_due || 0);
      if (acc.is_secured) {
        totalSecuredDebt += (acc.current_outstanding || 0);
      } else {
        totalUnsecuredDebt += (acc.current_outstanding || 0);
      }
    }
  }

  const utilizationRatio = totalCardLimit > 0
    ? Number(((totalCardDebt / totalCardLimit) * 100).toFixed(1))
    : 0;

  const dtiRatio = monthlyIncome > 0
    ? Number(((totalMonthlyEMI / monthlyIncome) * 100).toFixed(1))
    : 0;

  return {
    totalCardLimit,
    totalCardDebt,
    totalMonthlyEMI,
    totalSecuredDebt,
    totalUnsecuredDebt,
    totalDebt: totalCardDebt + totalSecuredDebt + totalUnsecuredDebt,
    utilizationRatio,
    dtiRatio
  };
}

function getHealthGrade(score) {
  if (score >= 750) return 'Excellent';
  if (score >= 700) return 'Good';
  if (score >= 650) return 'Fair';
  return 'Needs Attention';
}

// GET /api/profile
router.get('/', (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT 1').get();
    if (!user) {
      return res.status(404).json({ error: 'No user profile found' });
    }

    const assessment = db.prepare('SELECT * FROM credit_assessments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(user.id);
    const accounts = db.prepare('SELECT * FROM credit_accounts WHERE user_id = ?').all(user.id);
    const history = db.prepare('SELECT * FROM score_history WHERE user_id = ? ORDER BY recorded_date ASC').all(user.id);

    const metrics = calculateMetrics(user.monthly_income, accounts);

    res.json({
      user,
      assessment: {
        ...assessment,
        dti_ratio: metrics.dtiRatio,
        utilization_ratio: metrics.utilizationRatio,
        health_grade: getHealthGrade(assessment ? assessment.current_score : 680)
      },
      metrics,
      accountsCount: accounts.length,
      historyCount: history.length
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile', details: error.message });
  }
});

// POST /api/profile/onboarding
router.post('/onboarding', (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      city,
      employment_type,
      monthly_income,
      target_score,
      current_score,
      bureau,
      payment_history_pct,
      credit_age_months,
      hard_inquiries_6m,
      accounts = []
    } = req.body;

    if (!name || !monthly_income || !current_score) {
      return res.status(400).json({ error: 'Name, Monthly Income, and Credit Score are required' });
    }

    const userId = 'user_' + Date.now();
    const incomeNum = Number(monthly_income);
    const scoreNum = Number(current_score);
    const targetNum = Number(target_score || 780);

    const metrics = calculateMetrics(incomeNum, accounts);
    const healthGrade = getHealthGrade(scoreNum);

    const insertUser = db.prepare(`
      INSERT INTO users (id, name, email, phone, city, employment_type, monthly_income, target_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAssessment = db.prepare(`
      INSERT INTO credit_assessments (
        id, user_id, bureau, current_score, score_date, payment_history_pct,
        credit_age_months, hard_inquiries_6m, total_accounts, dti_ratio,
        utilization_ratio, health_grade
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAccount = db.prepare(`
      INSERT INTO credit_accounts (
        id, user_id, account_type, institution_name, account_number_last4,
        sanctioned_limit_or_loan, current_outstanding, monthly_emi_or_min_due,
        interest_rate, is_secured, status, dpd_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertHistory = db.prepare(`
      INSERT INTO score_history (user_id, score, recorded_date, milestone_label)
      VALUES (?, ?, ?, ?)
    `);

    const insertPlan = db.prepare(`
      INSERT INTO action_plans (
        id, user_id, title, phase, impact_points, priority,
        category, description, action_steps, is_completed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      // 1. User
      insertUser.run(
        userId,
        name,
        email || '',
        phone || '',
        city || 'Mumbai, Maharashtra',
        employment_type || 'Salaried',
        incomeNum,
        targetNum
      );

      // 2. Assessment
      const todayStr = new Date().toISOString().split('T')[0];
      insertAssessment.run(
        'assess_' + Date.now(),
        userId,
        bureau || 'CIBIL',
        scoreNum,
        todayStr,
        payment_history_pct || 98.0,
        credit_age_months || 36,
        hard_inquiries_6m || 2,
        accounts.length,
        metrics.dtiRatio,
        metrics.utilizationRatio,
        healthGrade
      );

      // 3. Accounts
      accounts.forEach((acc, idx) => {
        insertAccount.run(
          'acc_' + Date.now() + '_' + idx,
          userId,
          acc.account_type || 'CREDIT_CARD',
          acc.institution_name || 'Bank Account',
          acc.account_number_last4 || '1234',
          Number(acc.sanctioned_limit_or_loan || 0),
          Number(acc.current_outstanding || 0),
          Number(acc.monthly_emi_or_min_due || 0),
          Number(acc.interest_rate || 12),
          acc.is_secured ? 1 : 0,
          'ACTIVE',
          acc.dpd_status || '000'
        );
      });

      // 4. History (generate synthetic 4-month past trajectory up to current)
      const pastMonths = [
        { offset: -3, score: Math.max(300, scoreNum - 22), label: 'Historical record' },
        { offset: -2, score: Math.max(300, scoreNum - 14), label: 'Past payment logged' },
        { offset: -1, score: Math.max(300, scoreNum - 7), label: 'Previous month review' },
        { offset: 0, score: scoreNum, label: 'Initial Onboarding Assessment' }
      ];

      pastMonths.forEach(m => {
        const d = new Date();
        d.setMonth(d.getMonth() + m.offset);
        const dStr = d.toISOString().split('T')[0];
        insertHistory.run(userId, m.score, dStr, m.label);
      });

      // 5. Initial Action Plans tailored to assessment
      const initialPlans = [];

      if (metrics.utilizationRatio > 30) {
        initialPlans.push({
          title: `Reduce Credit Utilization from ${metrics.utilizationRatio.toFixed(1)}% to below 30%`,
          phase: 'Phase 1: Quick Wins (0-30 Days)',
          impact_points: 30,
          priority: 'High',
          category: 'Utilization',
          description: `Your card utilization (${metrics.utilizationRatio.toFixed(1)}%) is above the safe 30% threshold. Paying down balances will rapidly boost your CIBIL score.`,
          steps: [
            'Target the card with highest utilization percentage first',
            'Make early payments before the bill generation statement date',
            'Avoid making fresh discretionary purchases on credit cards'
          ]
        });
      }

      if (metrics.dtiRatio > 40) {
        initialPlans.push({
          title: `Optimize DTI Ratio (Currently ${metrics.dtiRatio.toFixed(1)}%)`,
          phase: 'Phase 2: Debt Optimization (30-90 Days)',
          impact_points: 20,
          priority: 'High',
          category: 'Payment Timing',
          description: `More than 40% of your net income is tied up in monthly debt repayments. Clearing smaller loans will provide liquidity and lower credit strain.`,
          steps: [
            'Identify the smallest loan balance to extinguish quickly via Snowball method',
            'Review options to prepay or reduce EMI tenures'
          ]
        });
      }

      initialPlans.push({
        title: 'Maintain 100% On-Time Payment Streak',
        phase: 'Phase 1: Quick Wins (0-30 Days)',
        impact_points: 25,
        priority: 'High',
        category: 'Payment Timing',
        description: 'Payment history is 35% of your credit score. Never allow an EMI or credit card minimum due to slip past the due date.',
        steps: [
          'Enable NACH auto-debit on all active loan accounts',
          'Keep buffer balance of at least 1 month EMI in your salary account'
        ]
      });

      initialPlans.forEach((p, idx) => {
        insertPlan.run(
          'plan_' + Date.now() + '_' + idx,
          userId,
          p.title,
          p.phase,
          p.impact_points,
          p.priority,
          p.category,
          p.description,
          JSON.stringify(p.steps),
          0
        );
      });

      // 6. Welcome chat message
      db.prepare(`
        INSERT INTO chat_messages (user_id, role, content)
        VALUES (?, ?, ?)
      `).run(
        userId,
        'assistant',
        `Namaste ${name}! 🌟 Welcome to **Credit Assistant**.\n\nYour profile has been created successfully:\n• **Initial Credit Score**: **${scoreNum}** (${healthGrade})\n• **Target Score**: **${targetNum}**\n• **DTI Ratio**: **${metrics.dtiRatio.toFixed(1)}%**\n• **Credit Card Utilization**: **${metrics.utilizationRatio.toFixed(1)}%**\n\nI have generated your customized credit enhancement roadmap. Let's work together to reach an **Excellent (750+)** score!`
      );
    });

    transaction();

    res.json({
      success: true,
      message: 'Onboarding completed successfully',
      userId
    });
  } catch (error) {
    console.error('Error during onboarding:', error);
    res.status(500).json({ error: 'Onboarding failed', details: error.message });
  }
});

// POST /api/profile/reset-demo
router.post('/reset-demo', (req, res) => {
  try {
    // Drop user_rohan_01 and reseed
    const defaultUserId = 'user_rohan_01';
    db.prepare('DELETE FROM users WHERE id = ?').run(defaultUserId);
    const { initSchema } = require('../db');
    initSchema();
    res.json({ success: true, message: 'Demo profile reset successfully' });
  } catch (error) {
    console.error('Error resetting demo profile:', error);
    res.status(500).json({ error: 'Failed to reset profile', details: error.message });
  }
});

module.exports = router;
module.exports.calculateMetrics = calculateMetrics;
module.exports.getHealthGrade = getHealthGrade;
