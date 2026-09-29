const express = require('express');
const router = express.Router();
const { db } = require('../db');

// GET /api/history
router.get('/', (req, res) => {
  try {
    const user = db.prepare('SELECT id, target_score FROM users ORDER BY created_at DESC LIMIT 1').get();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const assessment = db.prepare('SELECT current_score FROM credit_assessments WHERE user_id = ?').get(user.id);
    const history = db.prepare('SELECT * FROM score_history WHERE user_id = ? ORDER BY recorded_date ASC').all(user.id);

    // Compute future projected trajectory (next 6 months) under optimal behavior
    const currentScore = assessment ? assessment.current_score : 685;
    const targetScore = user.target_score || 790;
    const pointsNeeded = targetScore - currentScore;

    const projectedTrajectory = [];
    const monthsAhead = 6;
    for (let i = 1; i <= monthsAhead; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() + i);
      const monthName = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

      // Optimal growth curve (diminishing returns as approaching 800)
      const progressFraction = Math.min(1, (i / monthsAhead) * 0.95);
      const projectedScore = Math.min(850, Math.round(currentScore + (pointsNeeded * progressFraction)));

      projectedTrajectory.push({
        month: monthName,
        projectedScore,
        note: i === 2 ? 'Utilization drops < 25%' : (i === 4 ? 'Hard inquiries decay' : (i === 6 ? 'Target milestone reached' : ''))
      });
    }

    res.json({
      history,
      targetScore,
      currentScore,
      projectedTrajectory
    });
  } catch (error) {
    console.error('Error fetching score history:', error);
    res.status(500).json({ error: 'Failed to fetch score history', details: error.message });
  }
});

// POST /api/history
router.post('/', (req, res) => {
  try {
    const user = db.prepare('SELECT id FROM users ORDER BY created_at DESC LIMIT 1').get();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { score, recorded_date, milestone_label } = req.body;
    if (!score) return res.status(400).json({ error: 'Score is required' });

    const scoreNum = Math.min(900, Math.max(300, Number(score)));
    const dateStr = recorded_date || new Date().toISOString().split('T')[0];

    db.prepare(`
      INSERT INTO score_history (user_id, score, recorded_date, milestone_label)
      VALUES (?, ?, ?, ?)
    `).run(user.id, scoreNum, dateStr, milestone_label || 'Manual Score Update');

    // Update current score in assessment
    db.prepare(`
      UPDATE credit_assessments
      SET current_score = ?, score_date = ?
      WHERE user_id = ?
    `).run(scoreNum, dateStr, user.id);

    res.json({ success: true, message: 'Score record added', score: scoreNum });
  } catch (error) {
    console.error('Error logging score history:', error);
    res.status(500).json({ error: 'Failed to log score', details: error.message });
  }
});

module.exports = router;
