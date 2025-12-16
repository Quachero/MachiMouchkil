// Loyalty Routes - Visits & Rewards
const express = require('express');
const router = express.Router();
const { v4: uuid } = require('uuid');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// Reward milestones
const MILESTONES = [
    { visits: 3, type: 'drink', name: 'Boisson offerte' },
    { visits: 5, type: 'dessert', name: 'Dessert offert' },
    { visits: 8, type: 'discount', name: '-20% sur ta commande' },
    { visits: 10, type: 'meal', name: 'Repas complet offert' },
    { visits: 15, type: 'goodies', name: 'Goodies exclusifs' }
];

// POST /api/loyalty/visit - Record a visit
router.post('/visit', authenticateToken, (req, res) => {
    try {
        // Increment visits and add points
        db.prepare('UPDATE users SET visits = visits + 1, points = points + 100 WHERE id = ?')
            .run(req.user.id);

        const user = db.prepare('SELECT visits, points FROM users WHERE id = ?').get(req.user.id);

        // Check for milestone rewards
        const milestone = MILESTONES.find(m => m.visits === user.visits);
        let newReward = null;

        if (milestone) {
            const rewardId = uuid();
            db.prepare(`
                INSERT INTO rewards (id, user_id, type, name, expires_at)
                VALUES (?, ?, ?, ?, datetime('now', '+30 days'))
            `).run(rewardId, req.user.id, milestone.type, milestone.name);

            newReward = { id: rewardId, ...milestone };
        }

        res.json({
            message: 'Visit recorded! +100 points 🏄‍♂️',
            visits: user.visits,
            points: user.points,
            newReward
        });
    } catch (err) {
        console.error('Visit error:', err);
        res.status(500).json({ error: 'Failed to record visit' });
    }
});

// GET /api/loyalty/rewards - Get user's rewards
router.get('/rewards', authenticateToken, (req, res) => {
    try {
        const rewards = db.prepare(`
            SELECT id, type, name, used, used_at, expires_at, created_at
            FROM rewards
            WHERE user_id = ?
            ORDER BY created_at DESC
        `).all(req.user.id);

        const user = db.prepare('SELECT visits, points FROM users WHERE id = ?').get(req.user.id);

        // Calculate next reward
        const nextMilestone = MILESTONES.find(m => m.visits > user.visits);

        res.json({
            rewards,
            visits: user.visits,
            nextReward: nextMilestone ? {
                ...nextMilestone,
                remaining: nextMilestone.visits - user.visits
            } : null
        });
    } catch (err) {
        console.error('Get rewards error:', err);
        res.status(500).json({ error: 'Failed to get rewards' });
    }
});

// POST /api/loyalty/use-reward/:id - Use a reward
router.post('/use-reward/:id', authenticateToken, (req, res) => {
    try {
        const reward = db.prepare(`
            SELECT * FROM rewards WHERE id = ? AND user_id = ? AND used = 0
        `).get(req.params.id, req.user.id);

        if (!reward) {
            return res.status(404).json({ error: 'Reward not found or already used' });
        }

        db.prepare('UPDATE rewards SET used = 1, used_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(req.params.id);

        res.json({
            message: 'Reward used! Enjoy! 🍹',
            reward: { ...reward, used: true }
        });
    } catch (err) {
        console.error('Use reward error:', err);
        res.status(500).json({ error: 'Failed to use reward' });
    }
});

// GET /api/loyalty/stats - Get loyalty stats
router.get('/stats', authenticateToken, (req, res) => {
    try {
        const user = db.prepare('SELECT visits, points FROM users WHERE id = ?').get(req.user.id);
        const rewardCount = db.prepare('SELECT COUNT(*) as count FROM rewards WHERE user_id = ? AND used = 0').get(req.user.id);

        res.json({
            visits: user.visits,
            points: user.points,
            availableRewards: rewardCount.count,
            milestones: MILESTONES.map(m => ({
                ...m,
                achieved: user.visits >= m.visits
            }))
        });
    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

module.exports = router;
