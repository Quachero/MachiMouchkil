// Users Routes - Profile & Points
const express = require('express');
const router = express.Router();
const db = require('../db-adapter');
const { authenticateToken } = require('../middleware/auth');

// GET /api/users/me - Get current user profile with calculated mascota stats
router.get('/me', authenticateToken, async (req, res) => {
    try {
        let user = await db.get(`
            SELECT id, name, email, phone, points, visits, mascot_level, mascot_xp, mascot_stage, 
                   mascot_hunger, mascot_energy, mascot_happiness, mascot_hygiene, mascot_last_update,
                   referral_code, created_at
            FROM users WHERE id = ?
        `, [req.user.id]);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // --- DECAY LOGIC START ---
        const now = new Date();
        const lastUpdate = new Date(user.mascot_last_update || now);
        const diffHours = Math.abs(now - lastUpdate) / 36e5; // hours

        if (diffHours > 1) { // Apply decay if more than 1 hour passed
            // Decay rates per hour
            const hungerDecay = Math.floor(diffHours * 5);   // ~5% per hour
            const energyDecay = Math.floor(diffHours * 3);   // ~3% per hour
            const happinessDecay = Math.floor(diffHours * 4); // ~4% per hour
            const hygieneDecay = Math.floor(diffHours * 2);   // ~2% per hour

            // Update stats (clamped 0-100)
            user.mascot_hunger = Math.max(0, (user.mascot_hunger || 50) - hungerDecay);
            user.mascot_energy = Math.max(0, (user.mascot_energy || 50) - energyDecay);
            user.mascot_happiness = Math.max(0, (user.mascot_happiness || 50) - happinessDecay);
            user.mascot_hygiene = Math.max(0, (user.mascot_hygiene || 50) - hygieneDecay);

            // Save updated stats
            await db.run(`
                UPDATE users 
                SET mascot_hunger = ?, mascot_energy = ?, mascot_happiness = ?, mascot_hygiene = ?, mascot_last_update = ?
                WHERE id = ?
            `, [
                user.mascot_hunger, user.mascot_energy, user.mascot_happiness, user.mascot_hygiene,
                now.toISOString(),
                req.user.id
            ]);
        }
        // --- DECAY LOGIC END ---

        res.json({ user });
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// PUT /api/users/profile - Update profile
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { name, phone } = req.body;

        await db.run('UPDATE users SET name = ?, phone = ? WHERE id = ?', [name, phone, req.user.id]);

        const user = await db.get('SELECT id, name, email, phone, points FROM users WHERE id = ?', [req.user.id]);

        res.json({ message: 'Profile updated', user });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// PUT /api/users/points - Add points
router.put('/points', authenticateToken, async (req, res) => {
    try {
        const { amount, reason } = req.body;

        if (!amount || typeof amount !== 'number') {
            return res.status(400).json({ error: 'Amount required' });
        }

        await db.run('UPDATE users SET points = points + ? WHERE id = ?', [amount, req.user.id]);

        const user = await db.get('SELECT points FROM users WHERE id = ?', [req.user.id]);

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
router.put('/mascot', authenticateToken, async (req, res) => {
    try {
        const { xp, level, stage } = req.body;

        const updates = [];
        const values = [];

        if (xp !== undefined) { updates.push('mascot_xp = ?'); values.push(xp); }
        if (level !== undefined) { updates.push('mascot_level = ?'); values.push(level); }
        if (stage !== undefined) { updates.push('mascot_stage = ?'); values.push(stage); }

        if (updates.length > 0) {
            values.push(req.user.id);
            // Construct query safely
            // Note: DB Adapter conversion handles '?' but constructing strings needs care
            // "mascot_xp = ?" -> adapter will see ? and convert
            await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        const user = await db.get('SELECT mascot_level, mascot_xp, mascot_stage FROM users WHERE id = ?', [req.user.id]);

        res.json({ mascot: user });
    } catch (err) {
        console.error('Update mascot error:', err);
        res.status(500).json({ error: 'Failed to update mascot' });
    }
});

// POST /api/users/interact - Interact with mascot (Feed, Sleep, Play, Clean)
router.post('/interact', authenticateToken, async (req, res) => {
    try {
        const { action } = req.body; // feed, sleep, play, clean
        const user = await db.get('SELECT mascot_hunger, mascot_energy, mascot_happiness, mascot_hygiene FROM users WHERE id = ?', [req.user.id]);

        let updates = {};
        let message = '';
        const now = new Date().toISOString();

        // Interaction Logic & Constraints
        switch (action) {
            case 'feed':
                if (user.mascot_hunger >= 90) return res.status(400).json({ error: 'Pas faim !' });
                updates.mascot_hunger = Math.min(100, (user.mascot_hunger || 50) + 30);
                updates.mascot_energy = Math.max(0, (user.mascot_energy || 50) - 5); // Digestion takes energy
                message = 'Miam ! 🍎';
                break;
            case 'sleep':
                if (user.mascot_energy >= 90) return res.status(400).json({ error: 'Pas fatigué !' });
                updates.mascot_energy = 100; // Sleep restores full energy
                updates.mascot_hunger = Math.max(0, (user.mascot_hunger || 50) - 20); // Wake up hungry
                message = 'Zzz... 😴';
                break;
            case 'play':
                if (user.mascot_happiness >= 90) return res.status(400).json({ error: 'Déjà super content !' });
                if (user.mascot_energy < 20) return res.status(400).json({ error: 'Trop fatigué pour jouer...' });
                updates.mascot_happiness = Math.min(100, (user.mascot_happiness || 50) + 20);
                updates.mascot_energy = Math.max(0, (user.mascot_energy || 50) - 15);
                updates.mascot_hunger = Math.max(0, (user.mascot_hunger || 50) - 10);
                message = 'Yahoo ! 🎾';
                break;
            case 'clean':
                if (user.mascot_hygiene >= 90) return res.status(400).json({ error: 'Déjà tout propre !' });
                updates.mascot_hygiene = 100;
                updates.mascot_happiness = Math.min(100, (user.mascot_happiness || 50) + 5);
                message = 'Tout beau tout propre ! 🚿';
                break;
            default:
                return res.status(400).json({ error: 'Action inconnue' });
        }

        // Apply updates
        const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
        const values = Object.values(updates);
        values.push(now, req.user.id);

        await db.run(`UPDATE users SET ${setClause}, mascot_last_update = ? WHERE id = ?`, values);

        // Fetch new state
        const newState = await db.get('SELECT mascot_hunger, mascot_energy, mascot_happiness, mascot_hygiene FROM users WHERE id = ?', [req.user.id]);

        res.json({ message, stats: newState });

    } catch (err) {
        console.error('Interaction error:', err);
        res.status(500).json({ error: 'Interaction failed' });
    }
});

module.exports = router;
