// Machi Mouchkil Backend - Database Setup (SQLite)
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DATABASE_URL || (process.env.VERCEL ? '/tmp/machi.db' : path.join(__dirname, 'machi.db'));
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        phone TEXT,
        points INTEGER DEFAULT 0,
        visits INTEGER DEFAULT 0,
        mascot_level INTEGER DEFAULT 1,
        mascot_xp INTEGER DEFAULT 0,
        mascot_stage TEXT DEFAULT 'baby',
        mascot_hunger INTEGER DEFAULT 50,
        mascot_energy INTEGER DEFAULT 50,
        mascot_happiness INTEGER DEFAULT 50,
        mascot_hygiene INTEGER DEFAULT 50,
        mascot_last_update DATETIME DEFAULT CURRENT_TIMESTAMP,
        referral_code TEXT UNIQUE,
        referred_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Rewards table
    CREATE TABLE IF NOT EXISTS rewards (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        used_at DATETIME,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Contests table
    CREATE TABLE IF NOT EXISTS contests (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        emoji TEXT DEFAULT '🎁',
        start_date DATETIME,
        end_date DATETIME,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Contest entries table
    CREATE TABLE IF NOT EXISTS contest_entries (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        contest_id TEXT NOT NULL,
        answer TEXT,
        won INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (contest_id) REFERENCES contests(id),
        UNIQUE(user_id, contest_id)
    );

    -- Game scores table
    CREATE TABLE IF NOT EXISTS game_scores (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        game TEXT DEFAULT 'turtle_surf',
        score INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Feed content table
    CREATE TABLE IF NOT EXISTS feed_items (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        excerpt TEXT,
        emoji TEXT,
        published INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

// Schema Migration: Add new columns if they don't exist (for local dev persistence)
// Schema Migration: Add new columns if they don't exist
try {
    const tableInfo = db.prepare('PRAGMA table_info(users)').all();
    const columns = tableInfo.map(c => c.name);

    // Only try to alter if we think we can (might fail on read-only FS)
    if (!columns.includes('mascot_hunger')) db.exec('ALTER TABLE users ADD COLUMN mascot_hunger INTEGER DEFAULT 50');
    if (!columns.includes('mascot_energy')) db.exec('ALTER TABLE users ADD COLUMN mascot_energy INTEGER DEFAULT 50');
    if (!columns.includes('mascot_happiness')) db.exec('ALTER TABLE users ADD COLUMN mascot_happiness INTEGER DEFAULT 50');
    if (!columns.includes('mascot_hygiene')) db.exec('ALTER TABLE users ADD COLUMN mascot_hygiene INTEGER DEFAULT 50');
    if (!columns.includes('mascot_last_update')) db.exec('ALTER TABLE users ADD COLUMN mascot_last_update DATETIME DEFAULT CURRENT_TIMESTAMP');
} catch (err) {
    console.warn('Migration skipped/failed (expected on Vercel):', err.message);
}

// Insert default contest if none exists
const contestCount = db.prepare('SELECT COUNT(*) as count FROM contests').get();
if (contestCount.count === 0) {
    const { v4: uuid } = require('uuid');
    db.prepare(`
        INSERT INTO contests (id, name, description, emoji, end_date, active)
        VALUES (?, ?, ?, ?, datetime('now', '+30 days'), 1)
    `).run(
        uuid(),
        'Concours de Noël 🎄',
        'Gagne un repas pour 4 + des goodies exclusifs !',
        '🎄'
    );
}

// Insert default feed items if none exist
const feedCount = db.prepare('SELECT COUNT(*) as count FROM feed_items').get();
if (feedCount.count === 0) {
    const { v4: uuid } = require('uuid');
    const feedItems = [
        { type: 'news', title: '🎄 Menu de Noël disponible !', excerpt: 'Découvre notre sélection festive...', emoji: '🎄' },
        { type: 'quote', title: '"La vie est trop courte pour manger mal"', excerpt: "- L'équipe Machi Mouchkil 💪", emoji: '💬' },
        { type: 'event', title: '🎉 Soirée Before de Noël', excerpt: 'Le 23 décembre, viens fêter avec nous !', emoji: '🎉' }
    ];
    const insert = db.prepare('INSERT INTO feed_items (id, type, title, excerpt, emoji) VALUES (?, ?, ?, ?, ?)');
    feedItems.forEach(item => {
        insert.run(uuid(), item.type, item.title, item.excerpt, item.emoji);
    });
}

console.log('✅ Database initialized');

module.exports = db;
