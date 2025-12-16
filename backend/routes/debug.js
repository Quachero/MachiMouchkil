const express = require('express');
const router = express.Router();
const db = require('../db-adapter');
const { v4: uuid } = require('uuid');

router.get('/', async (req, res) => {
    const report = {
        scan: 'Start',
        db_type: db.type,
        env_check: process.env.DATABASE_URL ? 'Matches pattern' : 'Missing',
        tables: [],
        insert_test: 'Skipped',
        users_found: []
    };

    try {
        // 1. Check Tables
        if (db.type === 'postgres') {
            const tables = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
            report.tables = tables.map(t => t.table_name);
        } else {
            const tables = await db.query("SELECT name FROM sqlite_master WHERE type='table'");
            report.tables = tables.map(t => t.name);
        }

        // 2. Try Insert
        const testId = `debug-${Date.now()}`;
        try {
            await db.run(`
                INSERT INTO users (id, name, email, password_hash, points)
                VALUES (?, 'Debug User', ?, 'hash', 999)
            `, [testId, `debug-${Date.now()}@test.com`]);
            report.insert_test = 'Success';
        } catch (e) {
            report.insert_test = `Failed: ${e.message}`;
        }

        // 3. Setup Fetch
        try {
            const users = await db.query('SELECT * FROM users');
            report.users_found = users;
        } catch (e) {
            report.users_found = `Error: ${e.message}`;
        }

        res.json(report);

    } catch (error) {
        res.status(500).json({ error: error.message, stack: error.stack, part: report });
    }
});

router.get('/simulate-register', async (req, res) => {
    const report = { steps: [] };
    try {
        const userId = uuid();
        const email = `sim-${Date.now()}@test.com`;

        report.steps.push(`1. Generated ID: ${userId}, Email: ${email}`);

        // Try Insert
        try {
            report.steps.push('2. Attempting INSERT users...');
            await db.run(`
                INSERT INTO users (id, name, email, password_hash, phone, points)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [userId, 'Simulated User', email, 'hash123', null, 100]);
            report.steps.push('3. INSERT users successful');
        } catch (e) {
            report.steps.push(`ERROR INSERT users: ${e.message}`);
            throw e;
        }

        // Try Rewards
        try {
            report.steps.push('4. Attempting INSERT rewards...');
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
            await db.run(`
                INSERT INTO rewards (id, user_id, type, name, expires_at)
                VALUES (?, ?, 'drink', 'Boisson offerte', ?)
            `, [uuid(), userId, expiresAt.toISOString()]);
            report.steps.push('5. INSERT rewards successful');
        } catch (e) {
            report.steps.push(`ERROR INSERT rewards: ${e.message}`);
            // Don't throw, just report
        }

        // Select Back
        const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
        report.found_user = user;
        report.success = !!user;

        res.json(report);

    } catch (err) {
        report.fatal_error = err.message;
        res.status(500).json(report);
    }
});

module.exports = router;
