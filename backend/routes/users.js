// Users Routes - Profile & Points
const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/users/me - Get current user profile
router.get('/me', authenticateToken, (req, res) => {
    try {
        const user = db.prepare(`
            SELECT id, name, email, phone, points, visits, mascot_level, mascot_xp, mascot_stage, referral_code, created_at
            FROM users WHERE id = ?
        `).get(req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// PUT /api/users/profile - Update profile
router.put('/profile', authenticateToken, (req, res) => {
    try {
        const { name, phone } = req.body;

        db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?')
            .run(name, phone, req.user.id);

        const user = db.prepare('SELECT id, name, email, phone, points FROM users WHERE id = ?')
            .get(req.user.id);

        res.json({ message: 'Profile updated', user });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// PUT /api/users/points - Add points
router.put('/points', authenticateToken, (req, res) => {
    try {
        const { amount, reason } = req.body;

        if (!amount || typeof amount !== 'number') {
            return res.status(400).json({ error: 'Amount required' });
        }

        db.prepare('UPDATE users SET points = points + ? WHERE id = ?')
            .run(amount, req.user.id);

        const user = db.prepare('SELECT points FROM users WHERE id = ?').get(req.user.id);

        res.json({
            message: `+${amount} points added!`,
            points: user.points,
            reason
        });
    } catch (err) {
        console.error('Add points error:', err);
        res.status(500).json({ error: 'Failed to add points' });
    }
});

// PUT /api/users/mascot - Update mascot
router.put('/mascot', authenticateToken, (req, res) => {
    try {
        const { xp, level, stage } = req.body;

        const updates = [];
        const values = [];

        if (xp !== undefined) { updates.push('mascot_xp = ?'); values.push(xp); }
        if (level !== undefined) { updates.push('mascot_level = ?'); values.push(level); }
        if (stage !== undefined) { updates.push('mascot_stage = ?'); values.push(stage); }

        if (updates.length > 0) {
            values.push(req.user.id);
            db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
        }

        const user = db.prepare('SELECT mascot_level, mascot_xp, mascot_stage FROM users WHERE id = ?')
            .get(req.user.id);

        res.json({ mascot: user });
    } catch (err) {
        console.error('Update mascot error:', err);
        res.status(500).json({ error: 'Failed to update mascot' });
    }
});

module.exports = router;
