// Machi Mouchkil Backend - Database Setup
const db = require('./db-adapter');
const { v4: uuid } = require('uuid');

async function initializeDatabase() {
    console.log('🔄 Initializing database...');

    // Schema differences handling
    const isPostgres = db.type === 'postgres';
    const AUTO_INC = isPostgres ? 'SERIAL' : 'INTEGER'; // SQLite is usually implicit or explicit
    const DATETIME = isPostgres ? 'TIMESTAMP' : 'DATETIME';
    const JSON_TYPE = isPostgres ? 'JSONB' : 'TEXT';

    // Create tables
    await db.exec(`
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
            mascot_last_update ${DATETIME} DEFAULT CURRENT_TIMESTAMP,
            referral_code TEXT UNIQUE,
            referred_by TEXT,
            created_at ${DATETIME} DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS rewards (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL,
            name TEXT NOT NULL,
            used INTEGER DEFAULT 0,
            used_at ${DATETIME},
            expires_at ${DATETIME},
            created_at ${DATETIME} DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS contests (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            emoji TEXT DEFAULT '🎁',
            start_date ${DATETIME},
            end_date ${DATETIME},
            active INTEGER DEFAULT 1,
            created_at ${DATETIME} DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS contest_entries (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            contest_id TEXT NOT NULL,
            answer TEXT,
            won INTEGER DEFAULT 0,
            created_at ${DATETIME} DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (contest_id) REFERENCES contests(id),
            UNIQUE(user_id, contest_id)
        );

        CREATE TABLE IF NOT EXISTS game_scores (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            game TEXT DEFAULT 'turtle_surf',
            score INTEGER NOT NULL,
            created_at ${DATETIME} DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS feed_items (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            excerpt TEXT,
            emoji TEXT,
            published INTEGER DEFAULT 1,
            created_at ${DATETIME} DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Basic Migration Checks (Naive)
    try {
        // Postgres has different system catalog, simpler to just wrap add column in try/catch or do checking
        // For simplicity in this hybrid mode, we just try/catch the alterations
        // Note: 'ADD COLUMN IF NOT EXISTS' is supported in recent Postgres and SQLite

        const alterCmd = isPostgres ? 'ALTER TABLE users ADD COLUMN IF NOT EXISTS' : 'ALTER TABLE users ADD COLUMN';

        const columnsToCheck = [
            'mascot_hunger INTEGER DEFAULT 50',
            'mascot_energy INTEGER DEFAULT 50',
            'mascot_happiness INTEGER DEFAULT 50',
            'mascot_hygiene INTEGER DEFAULT 50',
            `mascot_last_update ${DATETIME} DEFAULT CURRENT_TIMESTAMP`
        ];

        for (const col of columnsToCheck) {
            try {
                await db.exec(`${alterCmd} ${col}`);
            } catch (e) {
                // Create valid SQL for SQLite which doesn't support IF NOT EXISTS in ADD COLUMN in older versions
                // or just ignore error if column exists
            }
        }
    } catch (err) {
        console.warn('Migration warning:', err.message);
    }

    // Seed Data
    const contestCount = await db.get('SELECT COUNT(*) as count FROM contests');
    if (contestCount && contestCount.count == 0) { // loose equality for string/int diffs
        await db.run(`
            INSERT INTO contests (id, name, description, emoji, end_date, active)
            VALUES (?, ?, ?, ?, ${isPostgres ? "NOW() + INTERVAL '30 days'" : "datetime('now', '+30 days')"}, 1)
        `, [
            uuid(),
            'Concours de Noël 🎄',
            'Gagne un repas pour 4 + des goodies exclusifs !',
            '🎄'
        ]);
    }

    const feedCount = await db.get('SELECT COUNT(*) as count FROM feed_items');
    if (feedCount && feedCount.count == 0) {
        const feedItems = [
            { type: 'news', title: '🎄 Menu de Noël disponible !', excerpt: 'Découvre notre sélection festive...', emoji: '🎄' },
            { type: 'quote', title: '"La vie est trop courte pour manger mal"', excerpt: "- L'équipe Machi Mouchkil 💪", emoji: '💬' },
            { type: 'event', title: '🎉 Soirée Before de Noël', excerpt: 'Le 23 décembre, viens fêter avec nous !', emoji: '🎉' }
        ];

        for (const item of feedItems) {
            await db.run('INSERT INTO feed_items (id, type, title, excerpt, emoji) VALUES (?, ?, ?, ?, ?)',
                [uuid(), item.type, item.title, item.excerpt, item.emoji]);
        }
    }

    console.log(`✅ Database tables ready`);
}

// Start init
initializeDatabase().catch(err => console.error('DB Init Failed:', err));

module.exports = db;
