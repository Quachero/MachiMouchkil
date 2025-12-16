// Auth Routes - Register & Login
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const db = require('../db-adapter');
const { generateToken } = require('../middleware/auth');

// Generate unique referral code
function generateReferralCode(name) {
    const cleanName = name.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 5);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `MACHI-${cleanName}-${random}`;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone, referralCode } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email and password required' });
        }

        // Check if email exists
        const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
        if (existing) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const userId = uuid();
        const userReferralCode = generateReferralCode(name);

        // Check if referred by someone
        let referredBy = null;
        if (referralCode) {
            const referrer = await db.get('SELECT id FROM users WHERE referral_code = ?', [referralCode]);
            if (referrer) {
                referredBy = referrer.id;
            }
        }

        await db.run(`
            INSERT INTO users (id, name, email, password_hash, phone, referral_code, referred_by, points)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [userId, name, email, passwordHash, phone || null, userReferralCode, referredBy, referredBy ? 100 : 0]);

        // If referred, give bonus to referrer
        if (referredBy) {
            await db.run('UPDATE users SET points = points + 200 WHERE id = ?', [referredBy]);
        }

        // Give welcome reward - Postgres requires interval syntax differences, but adapter doesn't fix logic
        // We handle date logic in JS to be safe across both
        // Or we use standard SQL. SQLite: datetime('now', '+30 days'). PG: NOW() + INTERVAL '30 days'
        // Let's use JS date for maximum compatibility
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await db.run(`
            INSERT INTO rewards (id, user_id, type, name, expires_at)
            VALUES (?, ?, 'drink', 'Boisson offerte', ?)
        `, [uuid(), userId, expiresAt.toISOString()]);

        // Get created user
        const user = await db.get('SELECT id, name, email, points, visits, mascot_level, referral_code FROM users WHERE id = ?', [userId]);
        const token = generateToken(user);

        res.status(201).json({
            message: 'Welcome to Machi Mouchkil! 🏄‍♂️',
            user,
            token
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Find user
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = generateToken(user);

        // Remove sensitive data
        delete user.password_hash;

        res.json({
            message: 'Welcome back! 🌊',
            user,
            token
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

module.exports = router;
