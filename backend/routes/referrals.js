// Referrals Routes
const express = require('express');
const router = express.Router();
const db = require('../db-adapter');
const { authenticateToken } = require('../middleware/auth');

// GET /api/referrals/code - Get user's referral code
router.get('/code', authenticateToken, async (req, res) => {
    try {
        const user = await db.get('SELECT referral_code FROM users WHERE id = ?', [req.user.id]);

        res.json({ code: user.referral_code });
    } catch (err) {
        console.error('Get code error:', err);
        res.status(500).json({ error: 'Failed to get referral code' });
    }
});

// GET /api/referrals/stats - Get referral stats
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const referrals = await db.query(`
            SELECT id, name, created_at
            FROM users
            WHERE referred_by = ?
            ORDER BY created_at DESC
        `, [req.user.id]);

        const totalPoints = referrals.length * 200; // 200 points per referral

        const user = await db.get('SELECT referral_code FROM users WHERE id = ?', [req.user.id]);

        res.json({
            code: user.referral_code,
            total: referrals.length,
            pointsEarned: totalPoints,
            referrals: referrals.map(r => ({
                id: r.id,
                name: r.name,
                date: r.created_at,
                status: 'validated'
            }))
        });
    } catch (err) {
        console.error('Get stats error:', err);
        res.status(500).json({ error: 'Failed to get referral stats' });
    }
});

// POST /api/referrals/validate - Validate a referral code (for checking)
router.post('/validate', async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Code required' });
        }

        const referrer = await db.get('SELECT id, name FROM users WHERE referral_code = ?', [code]);

        if (!referrer) {
            return res.status(404).json({ error: 'Invalid referral code', valid: false });
        }

        res.json({
            valid: true,
            referrer: { name: referrer.name },
            bonus: '+100 points de bienvenue!'
        });
    } catch (err) {
        console.error('Validate error:', err);
        res.status(500).json({ error: 'Failed to validate code' });
    }
});

module.exports = router;
