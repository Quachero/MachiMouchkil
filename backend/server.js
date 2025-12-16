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

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '🐢 Machi Mouchkil API is running!' });
    console.log(`🏄‍♂️ Machi Mouchkil API running on port ${PORT}`);
});

// Serve frontend for any other route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🏄‍♂️ Machi Mochkil API running on port ${PORT}`);
    console.log(`🌊 http://localhost:${PORT}`);
});
