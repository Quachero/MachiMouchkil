// Contests Routes
const express = require('express');
const router = express.Router();
const { v4: uuid } = require('uuid');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/contests - Get all contests
router.get('/', (req, res) => {
    try {
        const contests = db.prepare(`
            SELECT c.*, 
                   (SELECT COUNT(*) FROM contest_entries WHERE contest_id = c.id) as participants
            FROM contests c
            ORDER BY c.active DESC, c.end_date DESC
        `).all();

        res.json({ contests });
    } catch (err) {
        console.error('Get contests error:', err);
        res.status(500).json({ error: 'Failed to get contests' });
    }
});

// GET /api/contests/active - Get active contest
router.get('/active', (req, res) => {
    try {
        const contest = db.prepare(`
            SELECT c.*, 
                   (SELECT COUNT(*) FROM contest_entries WHERE contest_id = c.id) as participants
            FROM contests c
            WHERE c.active = 1 AND c.end_date > datetime('now')
            ORDER BY c.end_date ASC
            LIMIT 1
        `).get();

        res.json({ contest });
    } catch (err) {
        console.error('Get active contest error:', err);
        res.status(500).json({ error: 'Failed to get active contest' });
    }
});

// POST /api/contests/:id/enter - Enter a contest
router.post('/:id/enter', authenticateToken, (req, res) => {
    try {
        const { answer } = req.body;
        const contestId = req.params.id;

        // Check contest exists and is active
        const contest = db.prepare('SELECT * FROM contests WHERE id = ? AND active = 1').get(contestId);
        if (!contest) {
            return res.status(404).json({ error: 'Contest not found or not active' });
        }

        // Check if already entered
        const existing = db.prepare('SELECT id FROM contest_entries WHERE user_id = ? AND contest_id = ?')
            .get(req.user.id, contestId);
        if (existing) {
            return res.status(400).json({ error: 'Already entered this contest' });
        }

        // Create entry
        const entryId = uuid();
        db.prepare('INSERT INTO contest_entries (id, user_id, contest_id, answer) VALUES (?, ?, ?, ?)')
            .run(entryId, req.user.id, contestId, answer || '');

        // Add points
        db.prepare('UPDATE users SET points = points + 50 WHERE id = ?').run(req.user.id);

        res.json({
            message: 'Entry submitted! +50 points 🍀',
            entry: { id: entryId, contestId, answer }
        });
    } catch (err) {
        console.error('Enter contest error:', err);
        res.status(500).json({ error: 'Failed to enter contest' });
    }
});

// GET /api/contests/my-entries - Get user's contest entries
router.get('/my-entries', authenticateToken, (req, res) => {
    try {
        const entries = db.prepare(`
            SELECT ce.*, c.name as contest_name, c.emoji
            FROM contest_entries ce
            JOIN contests c ON ce.contest_id = c.id
            WHERE ce.user_id = ?
            ORDER BY ce.created_at DESC
        `).all(req.user.id);

        res.json({ entries });
    } catch (err) {
        console.error('Get entries error:', err);
        res.status(500).json({ error: 'Failed to get entries' });
    }
});

module.exports = router;
