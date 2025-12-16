// Game Routes - Scores & Leaderboard
const express = require('express');
const router = express.Router();
const { v4: uuid } = require('uuid');
const db = require('../db-adapter');
const { authenticateToken } = require('../middleware/auth');

// POST /api/game/score - Save a game score
router.post('/score', authenticateToken, async (req, res) => {
    try {
        const { score, game = 'turtle_surf' } = req.body;

        if (typeof score !== 'number' || score < 0) {
            return res.status(400).json({ error: 'Invalid score' });
        }

        // Save score
        const scoreId = uuid();
        await db.run('INSERT INTO game_scores (id, user_id, game, score) VALUES (?, ?, ?, ?)', [scoreId, req.user.id, game, score]);

        // Calculate points earned (1 point per 5 game points)
        const pointsEarned = Math.floor(score / 5) * 10;
        if (pointsEarned > 0) {
            await db.run('UPDATE users SET points = points + ? WHERE id = ?', [pointsEarned, req.user.id]);
        }

        // Get high score
        const highScoreRow = await db.get(`
            SELECT MAX(score) as high FROM game_scores WHERE user_id = ? AND game = ?
        `, [req.user.id, game]);

        // Get rank (Common CTE or simple subselects compatible with both)
        // Subqueries work fine in both.
        const rankRow = await db.get(`
            SELECT COUNT(*) + 1 as rank FROM (
                SELECT user_id, MAX(score) as best
                FROM game_scores
                WHERE game = ?
                GROUP BY user_id
                HAVING best > ?
            ) as ranked_users
        `, [game, score]);
        // Note: 'as ranked_users' alias needed for Postgres subqueries in FROM clause!

        res.json({
            message: pointsEarned > 0 ? `+${pointsEarned} points! 🎮` : 'Score saved!',
            score,
            highScore: highScoreRow ? highScoreRow.high : score,
            pointsEarned,
            rank: rankRow ? rankRow.rank : 1
        });
    } catch (err) {
        console.error('Save score error:', err);
        res.status(500).json({ error: 'Failed to save score' });
    }
});

// GET /api/game/leaderboard - Get leaderboard
router.get('/leaderboard', async (req, res) => {
    try {
        const game = req.query.game || 'turtle_surf';
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);

        const leaderboard = await db.query(`
            SELECT u.id, u.name, MAX(gs.score) as score, u.mascot_stage
            FROM game_scores gs
            JOIN users u ON gs.user_id = u.id
            WHERE gs.game = ?
            GROUP BY u.id, u.name, u.mascot_stage
            ORDER BY score DESC
            LIMIT ?
        `, [game, limit]);
        // Note: Postgres requires all non-aggregated columns in GROUP BY or wrapped.
        // Added u.name, u.mascot_stage to GROUP BY.

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
router.get('/my-scores', authenticateToken, async (req, res) => {
    try {
        const game = req.query.game || 'turtle_surf';

        const scores = await db.query(`
            SELECT score, created_at FROM game_scores
            WHERE user_id = ? AND game = ?
            ORDER BY score DESC
            LIMIT 10
        `, [req.user.id, game]);

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
