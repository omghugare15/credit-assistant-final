const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { calculateMetrics } = require('./profile');

// GET /api/accounts
router.get('/', (req, res) => {
  try {
    const user = db.prepare('SELECT id, monthly_income FROM users ORDER BY created_at DESC LIMIT 1').get();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const accounts = db.prepare('SELECT * FROM credit_accounts WHERE user_id = ? ORDER BY current_outstanding DESC').all(user.id);
    const metrics = calculateMetrics(user.monthly_income, accounts);

    // Grouping
    const creditCards = accounts.filter(a => a.account_type === 'CREDIT_CARD');
    const loans = accounts.filter(a => a.account_type !== 'CREDIT_CARD');

    // Payoff Strategy Analysis (Snowball vs Avalanche)
    // Snowball: Sort by lowest balance
    const snowballOrder = [...accounts].sort((a, b) => a.current_outstanding - b.current_outstanding);
    // Avalanche: Sort by highest interest rate
    const avalancheOrder = [...accounts].sort((a, b) => (b.interest_rate || 0) - (a.interest_rate || 0));

    // Calculate estimated interest savings
    // Avalanche typically saves significant interest especially on 40%+ credit card APRs
    const totalHighInterestDebt = creditCards.reduce((acc, c) => acc + c.current_outstanding, 0);
    const estAnnualCardInterest = Math.round(totalHighInterestDebt * 0.40); // 40% typical APR

    res.json({
      accounts,
      creditCards,
      loans,
      metrics,
      payoffComparison: {
        snowball: {
          name: 'Debt Snowball Method',
          philosophy: 'Pay off smallest balances first for psychological momentum',
          priorityList: snowballOrder.map(a => ({
            id: a.id,
            name: a.institution_name,
            type: a.account_type,
            balance: a.current_outstanding,
            emi: a.monthly_emi_or_min_due
          }))
        },
        avalanche: {
          name: 'Debt Avalanche Method',
          philosophy: 'Pay off highest interest rates first for maximum ₹ interest savings',
          priorityList: avalancheOrder.map(a => ({
            id: a.id,
            name: a.institution_name,
            type: a.account_type,
            balance: a.current_outstanding,
            rate: a.interest_rate,
            emi: a.monthly_emi_or_min_due
          })),
          estimatedAnnualInterestSaved: estAnnualCardInterest
        }
      }
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts', details: error.message });
  }
});

// POST /api/accounts
router.post('/', (req, res) => {
  try {
    const user = db.prepare('SELECT id, monthly_income FROM users ORDER BY created_at DESC LIMIT 1').get();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const {
      account_type,
      institution_name,
      account_number_last4,
      sanctioned_limit_or_loan,
      current_outstanding,
      monthly_emi_or_min_due,
      interest_rate,
      is_secured,
      dpd_status
    } = req.body;

    if (!account_type || !institution_name) {
      return res.status(400).json({ error: 'Account type and institution name are required' });
    }

    const accountId = 'acc_' + Date.now();

    db.prepare(`
      INSERT INTO credit_accounts (
        id, user_id, account_type, institution_name, account_number_last4,
        sanctioned_limit_or_loan, current_outstanding, monthly_emi_or_min_due,
        interest_rate, is_secured, status, dpd_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      accountId,
      user.id,
      account_type,
      institution_name,
      account_number_last4 || '0000',
      Number(sanctioned_limit_or_loan || 0),
      Number(current_outstanding || 0),
      Number(monthly_emi_or_min_due || 0),
      Number(interest_rate || (account_type === 'CREDIT_CARD' ? 42 : 12)),
      is_secured ? 1 : 0,
      'ACTIVE',
      dpd_status || '000'
    );

    // Recalculate metrics and update assessment
    const allAccounts = db.prepare('SELECT * FROM credit_accounts WHERE user_id = ?').all(user.id);
    const metrics = calculateMetrics(user.monthly_income, allAccounts);

    db.prepare(`
      UPDATE credit_assessments
      SET dti_ratio = ?, utilization_ratio = ?, total_accounts = ?
      WHERE user_id = ?
    `).run(metrics.dtiRatio, metrics.utilizationRatio, allAccounts.length, user.id);

    res.json({
      success: true,
      message: 'Account added successfully',
      accountId,
      metrics
    });
  } catch (error) {
    console.error('Error adding account:', error);
    res.status(500).json({ error: 'Failed to add account', details: error.message });
  }
});

// PUT /api/accounts/:id
router.put('/:id', (req, res) => {
  try {
    const user = db.prepare('SELECT id, monthly_income FROM users ORDER BY created_at DESC LIMIT 1').get();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { id } = req.params;
    const {
      current_outstanding,
      sanctioned_limit_or_loan,
      monthly_emi_or_min_due,
      interest_rate,
      status,
      dpd_status
    } = req.body;

    db.prepare(`
      UPDATE credit_accounts
      SET current_outstanding = COALESCE(?, current_outstanding),
          sanctioned_limit_or_loan = COALESCE(?, sanctioned_limit_or_loan),
          monthly_emi_or_min_due = COALESCE(?, monthly_emi_or_min_due),
          interest_rate = COALESCE(?, interest_rate),
          status = COALESCE(?, status),
          dpd_status = COALESCE(?, dpd_status)
      WHERE id = ? AND user_id = ?
    `).run(
      current_outstanding !== undefined ? Number(current_outstanding) : null,
      sanctioned_limit_or_loan !== undefined ? Number(sanctioned_limit_or_loan) : null,
      monthly_emi_or_min_due !== undefined ? Number(monthly_emi_or_min_due) : null,
      interest_rate !== undefined ? Number(interest_rate) : null,
      status || null,
      dpd_status || null,
      id,
      user.id
    );

    // Recalculate metrics
    const allAccounts = db.prepare('SELECT * FROM credit_accounts WHERE user_id = ?').all(user.id);
    const metrics = calculateMetrics(user.monthly_income, allAccounts);

    db.prepare(`
      UPDATE credit_assessments
      SET dti_ratio = ?, utilization_ratio = ?
      WHERE user_id = ?
    `).run(metrics.dtiRatio, metrics.utilizationRatio, user.id);

    res.json({ success: true, message: 'Account updated successfully', metrics });
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ error: 'Failed to update account', details: error.message });
  }
});

// DELETE /api/accounts/:id
router.delete('/:id', (req, res) => {
  try {
    const user = db.prepare('SELECT id, monthly_income FROM users ORDER BY created_at DESC LIMIT 1').get();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { id } = req.params;
    db.prepare('DELETE FROM credit_accounts WHERE id = ? AND user_id = ?').run(id, user.id);

    const allAccounts = db.prepare('SELECT * FROM credit_accounts WHERE user_id = ?').all(user.id);
    const metrics = calculateMetrics(user.monthly_income, allAccounts);

    db.prepare(`
      UPDATE credit_assessments
      SET dti_ratio = ?, utilization_ratio = ?, total_accounts = ?
      WHERE user_id = ?
    `).run(metrics.dtiRatio, metrics.utilizationRatio, allAccounts.length, user.id);

    res.json({ success: true, message: 'Account removed', metrics });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account', details: error.message });
  }
});

module.exports = router;
