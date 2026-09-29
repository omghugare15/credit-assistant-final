const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'credit_assistant.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for high performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      city TEXT DEFAULT 'Bengaluru',
      employment_type TEXT DEFAULT 'Salaried',
      monthly_income REAL NOT NULL DEFAULT 95000,
      target_score INTEGER DEFAULT 780,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS credit_assessments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      bureau TEXT DEFAULT 'CIBIL',
      current_score INTEGER NOT NULL DEFAULT 685,
      score_date TEXT,
      payment_history_pct REAL DEFAULT 97.2,
      credit_age_months INTEGER DEFAULT 48,
      hard_inquiries_6m INTEGER DEFAULT 3,
      total_accounts INTEGER DEFAULT 5,
      dti_ratio REAL DEFAULT 41.5,
      utilization_ratio REAL DEFAULT 54.2,
      health_grade TEXT DEFAULT 'Fair',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS credit_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      account_type TEXT NOT NULL, -- 'CREDIT_CARD', 'PERSONAL_LOAN', 'HOME_LOAN', 'AUTO_LOAN', 'BNPL'
      institution_name TEXT NOT NULL,
      account_number_last4 TEXT,
      sanctioned_limit_or_loan REAL NOT NULL,
      current_outstanding REAL NOT NULL,
      monthly_emi_or_min_due REAL NOT NULL,
      interest_rate REAL DEFAULT 12.0,
      is_secured INTEGER DEFAULT 0, -- 1 for Home/Gold/FD backed, 0 for Unsecured
      status TEXT DEFAULT 'ACTIVE',
      dpd_status TEXT DEFAULT '000',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS score_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      recorded_date TEXT NOT NULL,
      milestone_label TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS action_plans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      phase TEXT NOT NULL, -- 'Phase 1: Quick Wins (0-30 Days)', 'Phase 2: Debt Optimization (30-90 Days)', 'Phase 3: Score Surge (90-180 Days)'
      impact_points INTEGER NOT NULL,
      priority TEXT NOT NULL, -- 'High', 'Medium', 'Low'
      category TEXT NOT NULL, -- 'Utilization', 'Payment Timing', 'Mix', 'Inquiries', 'Dispute'
      description TEXT NOT NULL,
      action_steps TEXT, -- JSON array of bullet points
      is_completed INTEGER DEFAULT 0,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL, -- 'user', 'assistant'
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS simulations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      scenario_title TEXT NOT NULL,
      simulated_score INTEGER NOT NULL,
      score_delta INTEGER NOT NULL,
      details_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  seedDefaultUser();
}

function seedDefaultUser() {
  const defaultUserId = 'user_rohan_01';
  const existingUser = db.prepare('SELECT id FROM users WHERE id = ?').get(defaultUserId);

  if (!existingUser) {
    console.log('Seeding default Indian financial profile (Rohan Sharma)...');

    // 1. User
    db.prepare(`
      INSERT INTO users (id, name, email, phone, city, employment_type, monthly_income, target_score)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      defaultUserId,
      'Rohan Sharma',
      'rohan.sharma@example.in',
      '+91 98765 43210',
      'Bengaluru, Karnataka',
      'Salaried (IT Professional)',
      95000,
      790
    );

    // 2. Assessment
    db.prepare(`
      INSERT INTO credit_assessments (
        id, user_id, bureau, current_score, score_date, payment_history_pct,
        credit_age_months, hard_inquiries_6m, total_accounts, dti_ratio,
        utilization_ratio, health_grade
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'assess_rohan_01',
      defaultUserId,
      'CIBIL',
      685,
      '2026-09-15',
      97.2,
      48,
      3,
      5,
      41.5,
      54.2,
      'Fair'
    );

    // 3. Accounts
    const accounts = [
      {
        id: 'acc_01',
        user_id: defaultUserId,
        account_type: 'CREDIT_CARD',
        institution_name: 'HDFC Bank (Regalia Gold)',
        account_number_last4: '4821',
        sanctioned_limit_or_loan: 150000,
        current_outstanding: 88500,
        monthly_emi_or_min_due: 4500,
        interest_rate: 42.0, // 3.5% per month
        is_secured: 0,
        status: 'ACTIVE',
        dpd_status: '000'
      },
      {
        id: 'acc_02',
        user_id: defaultUserId,
        account_type: 'CREDIT_CARD',
        institution_name: 'ICICI Bank (Coral Card)',
        account_number_last4: '7190',
        sanctioned_limit_or_loan: 90000,
        current_outstanding: 41500,
        monthly_emi_or_min_due: 2100,
        interest_rate: 40.8,
        is_secured: 0,
        status: 'ACTIVE',
        dpd_status: '000'
      },
      {
        id: 'acc_03',
        user_id: defaultUserId,
        account_type: 'PERSONAL_LOAN',
        institution_name: 'Axis Bank Personal Loan',
        account_number_last4: '9034',
        sanctioned_limit_or_loan: 400000,
        current_outstanding: 285000,
        monthly_emi_or_min_due: 11200,
        interest_rate: 14.5,
        is_secured: 0,
        status: 'ACTIVE',
        dpd_status: '030' // 1 past delay from 12 months ago
      },
      {
        id: 'acc_04',
        user_id: defaultUserId,
        account_type: 'AUTO_LOAN',
        institution_name: 'HDFC Two-Wheeler Loan',
        account_number_last4: '3318',
        sanctioned_limit_or_loan: 120000,
        current_outstanding: 46000,
        monthly_emi_or_min_due: 4200,
        interest_rate: 11.2,
        is_secured: 1,
        status: 'ACTIVE',
        dpd_status: '000'
      },
      {
        id: 'acc_05',
        user_id: defaultUserId,
        account_type: 'HOME_LOAN',
        institution_name: 'SBI Home Finance',
        account_number_last4: '1092',
        sanctioned_limit_or_loan: 3200000,
        current_outstanding: 2780000,
        monthly_emi_or_min_due: 24000,
        interest_rate: 8.65,
        is_secured: 1,
        status: 'ACTIVE',
        dpd_status: '000'
      }
    ];

    const insertAccount = db.prepare(`
      INSERT INTO credit_accounts (
        id, user_id, account_type, institution_name, account_number_last4,
        sanctioned_limit_or_loan, current_outstanding, monthly_emi_or_min_due,
        interest_rate, is_secured, status, dpd_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const acc of accounts) {
      insertAccount.run(
        acc.id, acc.user_id, acc.account_type, acc.institution_name, acc.account_number_last4,
        acc.sanctioned_limit_or_loan, acc.current_outstanding, acc.monthly_emi_or_min_due,
        acc.interest_rate, acc.is_secured, acc.status, acc.dpd_status
      );
    }

    // 4. Score History (past 8 months)
    const historyPoints = [
      { score: 648, recorded_date: '2026-02-01', milestone_label: 'Personal loan sanctioned' },
      { score: 655, recorded_date: '2026-03-01', milestone_label: 'On-time EMI payments' },
      { score: 662, recorded_date: '2026-04-01', milestone_label: 'Credit card utilization 62%' },
      { score: 658, recorded_date: '2026-05-01', milestone_label: '3 hard inquiries logged' },
      { score: 669, recorded_date: '2026-06-01', milestone_label: 'Partial card bill clearance' },
      { score: 674, recorded_date: '2026-07-01', milestone_label: 'Consistent timely repayments' },
      { score: 680, recorded_date: '2026-08-01', milestone_label: 'Paid off Amazon Pay BNPL' },
      { score: 685, recorded_date: '2026-09-15', milestone_label: 'Current Verified CIBIL Score' }
    ];

    const insertHistory = db.prepare(`
      INSERT INTO score_history (user_id, score, recorded_date, milestone_label)
      VALUES (?, ?, ?, ?)
    `);

    for (const hp of historyPoints) {
      insertHistory.run(defaultUserId, hp.score, hp.recorded_date, hp.milestone_label);
    }

    // 5. Initial Action Plans
    const plans = [
      {
        id: 'plan_01',
        user_id: defaultUserId,
        title: 'Drop Overall Credit Utilization below 30%',
        phase: 'Phase 1: Quick Wins (0-30 Days)',
        impact_points: 28,
        priority: 'High',
        category: 'Utilization',
        description: 'Your combined credit card utilization is at 54.2% (₹1,30,000 / ₹2,40,000). CIBIL penalizes anything above 30%. Paying down ₹58,000 will bring utilization to 30%, triggering an immediate credit boost.',
        action_steps: JSON.stringify([
          'Pay down ₹35,000 on HDFC Regalia before the statement date (20th of the month)',
          'Pay down ₹23,000 on ICICI Coral before statement date (12th of the month)',
          'Keep balances under ₹72,000 combined to stay below the 30% golden ratio'
        ]),
        is_completed: 0
      },
      {
        id: 'plan_02',
        user_id: defaultUserId,
        title: 'Request Limit Enhancement on HDFC Regalia Card',
        phase: 'Phase 1: Quick Wins (0-30 Days)',
        impact_points: 15,
        priority: 'High',
        category: 'Utilization',
        description: 'Requesting a sanctioned limit increase from ₹1,50,000 to ₹2,50,000 expands your available credit pool without adding new debt, instantly compressing your utilization ratio.',
        action_steps: JSON.stringify([
          'Check HDFC NetBanking for pre-approved limit increase offer',
          'Ensure the bank performs a soft inquiry rather than a hard inquiry',
          'Do NOT increase your monthly spending with the higher limit'
        ]),
        is_completed: 0
      },
      {
        id: 'plan_03',
        user_id: defaultUserId,
        title: 'Dispute / Clarify Old 30-Day DPD on Axis Personal Loan',
        phase: 'Phase 2: Debt Optimization (30-90 Days)',
        impact_points: 22,
        priority: 'Medium',
        category: 'Dispute',
        description: 'You have a single "030" DPD mark from 12 months ago on your Axis Bank loan. If this was caused by a bank ECS presentation glitch or clerical error, raise a dispute on CIBIL portal.',
        action_steps: JSON.stringify([
          'Download official bank statement showing timely auto-debit attempt',
          'Login to mycibil.com dispute resolution center',
          'Submit dispute control number for Loan Account ending in 9034',
          'Bank is mandated by RBI to respond within 30 days'
        ]),
        is_completed: 0
      },
      {
        id: 'plan_04',
        user_id: defaultUserId,
        title: 'Freeze New Hard Inquiries for the Next 6 Months',
        phase: 'Phase 2: Debt Optimization (30-90 Days)',
        impact_points: 12,
        priority: 'Medium',
        category: 'Inquiries',
        description: 'You have 3 hard inquiries in the past 6 months from loan shopping. Multiple applications flag "credit hunger" to Indian underwriters. Let these age past 6 months to recover points.',
        action_steps: JSON.stringify([
          'Avoid applying for BNPL (PayLater), new credit cards, or top-up loans',
          'Check pre-approved loan eligibility through soft inquiries only'
        ]),
        is_completed: 0
      }
    ];

    const insertPlan = db.prepare(`
      INSERT INTO action_plans (
        id, user_id, title, phase, impact_points, priority,
        category, description, action_steps, is_completed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const p of plans) {
      insertPlan.run(
        p.id, p.user_id, p.title, p.phase, p.impact_points, p.priority,
        p.category, p.description, p.action_steps, p.is_completed
      );
    }

    // 6. Initial Welcome Chat Message
    db.prepare(`
      INSERT INTO chat_messages (user_id, role, content)
      VALUES (?, ?, ?)
    `).run(
      defaultUserId,
      'assistant',
      `Namaste Rohan! 🙏 I am your **Gemini Credit Strategist**.\n\nI have reviewed your financial snapshot:
• **Current CIBIL Score**: **685** *(Fair)* — 65 points away from Prime status (**750+**)
• **Credit Card Utilization**: **54.2%** *(Threshold is 30% max)*
• **Debt-to-Income (DTI)**: **41.5%** *(Approaching RBI caution zone of 45%)*

Your biggest immediate score accelerant is paying down your credit card balances below 30% utilization, which will inject up to **+28 points** into your score within 30-45 days.

How would you like to start? You can ask me how to optimize your debt repayment, simulate a loan pre-payment, or draft a dispute for your Axis Bank DPD remark.`
    );
  }
}

// Call on startup
initSchema();

module.exports = {
  db,
  initSchema
};
