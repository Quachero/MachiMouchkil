// Auth Routes - Register & Login
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const db = require('../database');
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
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
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
            const referrer = db.prepare('SELECT id FROM users WHERE referral_code = ?').get(referralCode);
            if (referrer) {
                referredBy = referrer.id;
            }
        }

        db.prepare(`
            INSERT INTO users (id, name, email, password_hash, phone, referral_code, referred_by, points)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(userId, name, email, passwordHash, phone || null, userReferralCode, referredBy, referredBy ? 100 : 0);

        // If referred, give bonus to referrer
        if (referredBy) {
            db.prepare('UPDATE users SET points = points + 200 WHERE id = ?').run(referredBy);
        }

        // Give welcome reward
        db.prepare(`
            INSERT INTO rewards (id, user_id, type, name, expires_at)
            VALUES (?, ?, 'drink', 'Boisson offerte', datetime('now', '+30 days'))
        `).run(uuid(), userId);

        // Get created user
        const user = db.prepare('SELECT id, name, email, points, visits, mascot_level, referral_code FROM users WHERE id = ?').get(userId);
        const token = generateToken(user);

        res.status(201).json({
            message: 'Welcome to Machi Mouchkil! 🏄‍♂️',
            user,
            token
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Registration failed' });
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
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
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
