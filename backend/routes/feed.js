// Feed Routes
const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/feed - Get all feed items
router.get('/', (req, res) => {
    try {
        const type = req.query.type;
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);

        let query = 'SELECT * FROM feed_items WHERE published = 1';
        const params = [];

        if (type && type !== 'all') {
            query += ' AND type = ?';
            params.push(type);
        }

        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);

        const items = db.prepare(query).all(...params);

        res.json({ items });
    } catch (err) {
        console.error('Get feed error:', err);
        res.status(500).json({ error: 'Failed to get feed' });
    }
});

// GET /api/feed/:id - Get single feed item
router.get('/:id', (req, res) => {
    try {
        const item = db.prepare('SELECT * FROM feed_items WHERE id = ?').get(req.params.id);

        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        res.json({ item });
    } catch (err) {
        console.error('Get feed item error:', err);
        res.status(500).json({ error: 'Failed to get feed item' });
    }
});

module.exports = router;
