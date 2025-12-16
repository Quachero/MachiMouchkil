// Game Routes - Scores & Leaderboard
const express = require('express');
const router = express.Router();
const { v4: uuid } = require('uuid');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

// POST /api/game/score - Save a game score
router.post('/score', authenticateToken, (req, res) => {
    try {
        const { score, game = 'turtle_surf' } = req.body;

        if (typeof score !== 'number' || score < 0) {
            return res.status(400).json({ error: 'Invalid score' });
        }

        // Save score
        const scoreId = uuid();
        db.prepare('INSERT INTO game_scores (id, user_id, game, score) VALUES (?, ?, ?, ?)')
            .run(scoreId, req.user.id, game, score);

        // Calculate points earned (1 point per 5 game points)
        const pointsEarned = Math.floor(score / 5) * 10;
        if (pointsEarned > 0) {
            db.prepare('UPDATE users SET points = points + ? WHERE id = ?')
                .run(pointsEarned, req.user.id);
        }

        // Get high score
        const highScore = db.prepare(`
            SELECT MAX(score) as high FROM game_scores WHERE user_id = ? AND game = ?
        `).get(req.user.id, game);

        // Get rank
        const rank = db.prepare(`
            SELECT COUNT(*) + 1 as rank FROM (
                SELECT user_id, MAX(score) as best
                FROM game_scores
                WHERE game = ?
                GROUP BY user_id
                HAVING best > ?
            )
        `).get(game, score);

        res.json({
            message: pointsEarned > 0 ? `+${pointsEarned} points! 🎮` : 'Score saved!',
            score,
            highScore: highScore.high,
            pointsEarned,
            rank: rank.rank
        });
    } catch (err) {
        console.error('Save score error:', err);
        res.status(500).json({ error: 'Failed to save score' });
    }
});

// GET /api/game/leaderboard - Get leaderboard
router.get('/leaderboard', (req, res) => {
    try {
        const game = req.query.game || 'turtle_surf';
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);

        const leaderboard = db.prepare(`
            SELECT u.id, u.name, MAX(gs.score) as score, u.mascot_stage
            FROM game_scores gs
            JOIN users u ON gs.user_id = u.id
            WHERE gs.game = ?
            GROUP BY u.id
            ORDER BY score DESC
            LIMIT ?
        `).all(game, limit);

        res.json({
            game,
            leaderboard: leaderboard.map((entry, index) => ({
                rank: index + 1,
                ...entry
            }))
        });
    } catch (err) {
        console.error('Leaderboard error:', err);
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
});

// GET /api/game/my-scores - Get user's scores
router.get('/my-scores', authenticateToken, (req, res) => {
    try {
        const game = req.query.game || 'turtle_surf';

        const scores = db.prepare(`
            SELECT score, created_at FROM game_scores
            WHERE user_id = ? AND game = ?
            ORDER BY score DESC
            LIMIT 10
        `).all(req.user.id, game);

        const highScore = scores.length > 0 ? scores[0].score : 0;

        res.json({
            game,
            highScore,
            scores
        });
    } catch (err) {
        console.error('My scores error:', err);
        res.status(500).json({ error: 'Failed to get scores' });
    }
});

module.exports = router;
