// Machi Mouchkil Backend - Main Server
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));
app.use(express.json());

// Serve static files from frontend (for production)
app.use(express.static(path.join(__dirname, '../')));

// Initialize database
const db = require('./database');

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/loyalty', require('./routes/loyalty'));
app.use('/api/contests', require('./routes/contests'));
app.use('/api/referrals', require('./routes/referrals'));
app.use('/api/game', require('./routes/game'));
app.use('/api/feed', require('./routes/feed'));
app.use('/api/debug-db', require('./routes/debug'));

// Health check
app.get('/api/health', (req, res) => {
    const dbAdapter = require('./db-adapter');
    res.json({
        status: 'ok',
        message: '🐢 Machi Mouchkil API is running!',
        db_type: dbAdapter.type,
        db_init_error: dbAdapter.initError || null,
        on_vercel: !!process.env.VERCEL
    });
    console.log(`🏄‍♂️ Machi Mouchkil API running on port ${PORT}`);
});

// Serve frontend for any other route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.message, err.stack);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Global checking
process.on('unhandledRejection', (reason, p) => {
    console.error('Unhandled Rejection at:', p, 'reason:', reason);
});

// Start server if running directly (Local)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🏄‍♂️ Machi Mochkil API running on port ${PORT}`);
        console.log(`🌊 http://localhost:${PORT}`);
    });
}

// Export for Vercel Serverless
module.exports = app;
