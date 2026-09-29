const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { callGeminiApi, generateContextualAdvice, INDIAN_CREDIT_SYSTEM_PROMPT } = require('../gemini');
const { calculateMetrics } = require('./profile');

// Helper to assemble full user context
function getUserFinancialContext(userId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  const assessment = db.prepare('SELECT * FROM credit_assessments WHERE user_id = ?').get(userId);
  const accounts = db.prepare('SELECT * FROM credit_accounts WHERE user_id = ?').all(userId);
  const history = db.prepare('SELECT * FROM score_history WHERE user_id = ? ORDER BY recorded_date DESC LIMIT 5').all(userId);
  const metrics = calculateMetrics(user ? user.monthly_income : 95000, accounts);

  return { user, assessment, accounts, history, metrics };
}

// GET /api/advisor/chat
router.get('/chat', (req, res) => {
  try {
    const user = db.prepare('SELECT id FROM users ORDER BY created_at DESC LIMIT 1').get();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const messages = db.prepare('SELECT * FROM chat_messages WHERE user_id = ? ORDER BY timestamp ASC').all(user.id);
    res.json({ messages });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ error: 'Failed to fetch chat messages', details: error.message });
  }
});

// POST /api/advisor/chat
router.post('/chat', async (req, res) => {
  try {
    const user = db.prepare('SELECT id, name FROM users ORDER BY created_at DESC LIMIT 1').get();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { message, customApiKey } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Save user message to DB
    db.prepare('INSERT INTO chat_messages (user_id, role, content) VALUES (?, ?, ?)')
      .run(user.id, 'user', message.trim());

    // Gather complete financial context
    const context = getUserFinancialContext(user.id);
    const { user: userProfile, assessment, accounts, metrics } = context;

    const apiKey = customApiKey || req.headers['x-gemini-key'] || process.env.GEMINI_API_KEY;

    let replyText = '';
    let source = 'contextual-expert';

    if (apiKey && apiKey.trim().length > 10) {
      try {
        const financialContextPrompt = `
CURRENT USER FINANCIAL SNAPSHOT (INDIA ECOSYSTEM):
- Full Name: ${userProfile.name}
- City & Employment: ${userProfile.city} | ${userProfile.employment_type}
- Monthly In-Hand Net Income: ₹${userProfile.monthly_income.toLocaleString('en-IN')}
- Current CIBIL / Bureau Score: ${assessment.current_score} (${assessment.health_grade})
- User Target Score: ${userProfile.target_score}
- Debt-to-Income (DTI / FOIR): ${metrics.dtiRatio.toFixed(1)}% (Total Monthly EMI: ₹${metrics.totalMonthlyEMI.toLocaleString('en-IN')})
- Credit Card Utilization Ratio: ${metrics.utilizationRatio.toFixed(1)}% (Total Balance: ₹${metrics.totalCardDebt.toLocaleString('en-IN')} / Limit: ₹${metrics.totalCardLimit.toLocaleString('en-IN')})
- Hard Inquiries in Last 6 Months: ${assessment.hard_inquiries_6m}
- Credit History Length: ${assessment.credit_age_months} months
- Accounts List:
${accounts.map(a => `  * ${a.institution_name} (${a.account_type}): Bal ₹${a.current_outstanding.toLocaleString('en-IN')}, Limit/Loan ₹${a.sanctioned_limit_or_loan.toLocaleString('en-IN')}, EMI ₹${a.monthly_emi_or_min_due.toLocaleString('en-IN')}, Rate ${a.interest_rate}%, DPD Status: ${a.dpd_status}`).join('\n')}

USER QUESTION: "${message.trim()}"

Provide a direct, practical, and highly detailed response formatted in clean Markdown. Include estimated CIBIL point impacts where relevant and actionable steps for the Indian context.
`;

        const geminiRes = await callGeminiApi(
          apiKey.trim(),
          [{ parts: [{ text: financialContextPrompt }] }],
          INDIAN_CREDIT_SYSTEM_PROMPT
        );

        replyText = geminiRes.text;
        source = 'gemini-live (' + geminiRes.modelUsed + ')';
      } catch (geminiError) {
        console.warn('Gemini API call failed, falling back to intelligent rule engine:', geminiError.message);
        replyText = generateContextualAdvice(userProfile, assessment, accounts, message);
        source = 'contextual-expert (fallback: ' + geminiError.message.slice(0, 60) + ')';
      }
    } else {
      // Use intelligent Indian Credit Specialist engine
      replyText = generateContextualAdvice(userProfile, assessment, accounts, message);
      source = 'contextual-expert (built-in)';
    }

    // Save assistant reply to DB
    db.prepare('INSERT INTO chat_messages (user_id, role, content) VALUES (?, ?, ?)')
      .run(user.id, 'assistant', replyText);

    res.json({
      reply: replyText,
      source,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error handling chat message:', error);
    res.status(500).json({ error: 'Failed to process chat', details: error.message });
  }
});

// DELETE /api/advisor/chat
router.delete('/chat', (req, res) => {
  try {
    const user = db.prepare('SELECT id FROM users ORDER BY created_at DESC LIMIT 1').get();
    if (!user) return res.status(404).json({ error: 'User not found' });

    db.prepare('DELETE FROM chat_messages WHERE user_id = ?').run(user.id);
    res.json({ success: true, message: 'Chat history cleared' });
  } catch (error) {
    console.error('Error clearing chat:', error);
    res.status(500).json({ error: 'Failed to clear chat', details: error.message });
  }
});

// GET /api/advisor/action-plans
router.get('/action-plans', (req, res) => {
  try {
    const user = db.prepare('SELECT id FROM users ORDER BY created_at DESC LIMIT 1').get();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const plans = db.prepare('SELECT * FROM action_plans WHERE user_id = ? ORDER BY is_completed ASC, impact_points DESC').all(user.id);

    const parsedPlans = plans.map(p => ({
      ...p,
      action_steps: p.action_steps ? JSON.parse(p.action_steps) : []
    }));

    const totalImpactAvailable = parsedPlans.reduce((sum, p) => p.is_completed ? sum : sum + p.impact_points, 0);
    const totalImpactEarned = parsedPlans.reduce((sum, p) => p.is_completed ? sum + p.impact_points : sum, 0);

    res.json({
      plans: parsedPlans,
      totalImpactAvailable,
      totalImpactEarned,
      completedCount: parsedPlans.filter(p => p.is_completed).length,
      totalCount: parsedPlans.length
    });
  } catch (error) {
    console.error('Error fetching action plans:', error);
    res.status(500).json({ error: 'Failed to fetch action plans', details: error.message });
  }
});

// PUT /api/advisor/action-plans/:id/toggle
router.put('/action-plans/:id/toggle', (req, res) => {
  try {
    const user = db.prepare('SELECT id FROM users ORDER BY created_at DESC LIMIT 1').get();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { id } = req.params;
    const plan = db.prepare('SELECT * FROM action_plans WHERE id = ? AND user_id = ?').get(id, user.id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const newCompleted = plan.is_completed ? 0 : 1;
    const completedAt = newCompleted ? new Date().toISOString() : null;

    db.prepare('UPDATE action_plans SET is_completed = ?, completed_at = ? WHERE id = ?')
      .run(newCompleted, completedAt, id);

    // If marked completed, add points to score in assessment!
    const pointDelta = newCompleted ? plan.impact_points : -plan.impact_points;
    const assessment = db.prepare('SELECT current_score FROM credit_assessments WHERE user_id = ?').get(user.id);
    if (assessment) {
      const updatedScore = Math.min(900, Math.max(300, assessment.current_score + pointDelta));
      db.prepare('UPDATE credit_assessments SET current_score = ? WHERE user_id = ?').run(updatedScore, user.id);

      // Record in history
      const todayStr = new Date().toISOString().split('T')[0];
      db.prepare('INSERT INTO score_history (user_id, score, recorded_date, milestone_label) VALUES (?, ?, ?, ?)')
        .run(user.id, updatedScore, todayStr, `${newCompleted ? 'Completed' : 'Reopened'}: ${plan.title.slice(0, 30)}...`);
    }

    res.json({
      success: true,
      is_completed: Boolean(newCompleted),
      impact_points: plan.impact_points,
      pointDelta
    });
  } catch (error) {
    console.error('Error toggling action plan:', error);
    res.status(500).json({ error: 'Failed to update action plan', details: error.message });
  }
});

// POST /api/advisor/generate-action-plan
router.post('/generate-action-plan', async (req, res) => {
  try {
    const user = db.prepare('SELECT id, name FROM users ORDER BY created_at DESC LIMIT 1').get();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const context = getUserFinancialContext(user.id);
    const { user: userProfile, assessment, accounts, metrics } = context;

    // Check if custom key or env key
    const apiKey = req.body.customApiKey || req.headers['x-gemini-key'] || process.env.GEMINI_API_KEY;

    let generatedItems = [];

    if (apiKey && apiKey.trim().length > 10) {
      try {
        const planPrompt = `
Generate a structured CIBIL Credit Improvement Plan for ${userProfile.name} in JSON format.
Financial Stats:
- Current Score: ${assessment.current_score} / Target: ${userProfile.target_score}
- DTI Ratio: ${metrics.dtiRatio.toFixed(1)}% | Utilization: ${metrics.utilizationRatio.toFixed(1)}%
- Total Debt: ₹${metrics.totalDebt} | Monthly Income: ₹${userProfile.monthly_income}
- Inquiries: ${assessment.hard_inquiries_6m} | Accounts: ${accounts.length}

Return a valid JSON array of 4 items with this EXACT schema:
[
  {
    "title": "Action title",
    "phase": "Phase 1: Quick Wins (0-30 Days)" | "Phase 2: Debt Optimization (30-90 Days)" | "Phase 3: Score Surge (90-180 Days)",
    "impact_points": number between 10 and 35,
    "priority": "High" | "Medium" | "Low",
    "category": "Utilization" | "Payment Timing" | "Mix" | "Inquiries" | "Dispute",
    "description": "Short explanation with exact numbers in INR",
    "action_steps": ["step 1", "step 2", "step 3"]
  }
]
`;
        const geminiRes = await callGeminiApi(
          apiKey.trim(),
          [{ parts: [{ text: planPrompt }] }],
          "You are a credit repair engine. Output ONLY valid JSON array with no markdown backticks."
        );

        let cleanJson = geminiRes.text.trim();
        if (cleanJson.startsWith('```json')) cleanJson = cleanJson.replace(/```json\n?/, '').replace(/```\n?$/, '');
        if (cleanJson.startsWith('```')) cleanJson = cleanJson.replace(/```\n?/, '').replace(/```\n?$/, '');

        generatedItems = JSON.parse(cleanJson);
      } catch (err) {
        console.warn('Gemini action plan generation fallback:', err.message);
      }
    }

    if (!generatedItems || generatedItems.length === 0) {
      // Default domain-expert plan generator
      generatedItems = [
        {
          title: `Compress Card Balances to ₹${Math.round(metrics.totalCardLimit * 0.20).toLocaleString('en-IN')} (20% Target)`,
          phase: 'Phase 1: Quick Wins (0-30 Days)',
          impact_points: 32,
          priority: 'High',
          category: 'Utilization',
          description: `Your card utilization is currently ${metrics.utilizationRatio.toFixed(1)}%. Bringing it under 20% drops credit risk significantly in CIBIL's monthly bureau algorithms.`,
          action_steps: [
            'Pay before statement date on all active credit cards',
            'Prioritize highest APR cards first',
            'Avoid using cards until billing cycle generates'
          ]
        },
        {
          title: 'Audit & File CIBIL Grievance for DPD Status Discrepancies',
          phase: 'Phase 2: Debt Optimization (30-90 Days)',
          impact_points: 25,
          priority: 'High',
          category: 'Dispute',
          description: 'Ensure any loan past due marks over 12 months old are verified against bank records. Rectifying single misreported DPD can deliver a quick score surge.',
          action_steps: [
            'Download 12-month payment statements from loan accounts',
            'Compare ECS debit dates with CIBIL DPD status',
            'Raise a formal dispute with 30-day resolution timeline'
          ]
        },
        {
          title: 'Diversify Credit Mix with Secured Backing',
          phase: 'Phase 3: Score Surge (90-180 Days)',
          impact_points: 18,
          priority: 'Medium',
          category: 'Mix',
          description: 'A credit profile dominated by personal loans and cards (unsecured debt) caps your score around 730. Maintaining secured assets (Home loan or FD-backed card) balances risk.',
          action_steps: [
            'Avoid taking fresh personal loans or BNPL credit',
            'Continue timely amortization on your secured assets'
          ]
        },
        {
          title: 'Establish 180-Day Inquiry Moratorium',
          phase: 'Phase 2: Debt Optimization (30-90 Days)',
          impact_points: 15,
          priority: 'Medium',
          category: 'Inquiries',
          description: `You have ${assessment.hard_inquiries_6m} recent inquiries. Lenders view multiple inquiries within 6 months as credit hungry behavior.`,
          action_steps: [
            'Do not submit new loan or card applications online',
            'Wait until existing inquiries age past the 6-month threshold'
          ]
        }
      ];
    }

    // Insert into DB
    const insertPlan = db.prepare(`
      INSERT INTO action_plans (
        id, user_id, title, phase, impact_points, priority,
        category, description, action_steps, is_completed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);

    generatedItems.forEach((p, idx) => {
      insertPlan.run(
        'plan_ai_' + Date.now() + '_' + idx,
        user.id,
        p.title,
        p.phase,
        p.impact_points || 20,
        p.priority || 'High',
        p.category || 'Utilization',
        p.description || '',
        JSON.stringify(p.action_steps || []),
      );
    });

    res.json({
      success: true,
      message: 'New action plan generated and added to your roadmap',
      plansCount: generatedItems.length
    });
  } catch (error) {
    console.error('Error generating action plan:', error);
    res.status(500).json({ error: 'Failed to generate action plan', details: error.message });
  }
});

module.exports = router;
