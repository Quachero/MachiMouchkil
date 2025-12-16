const { Pool } = require('pg');
const Database = require('better-sqlite3');
const path = require('path');

class DBAdapter {
    constructor() {
        this.type = process.env.DATABASE_URL ? 'postgres' : 'sqlite';
        this.pool = null;
        this.sqlite = null;

        if (this.type === 'postgres') {
            console.log('🔌 Connecting to PostgreSQL...');
            this.pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false } // Required for Vercel/Neon/Supabase
            });
        } else {
            console.log('📂 Using Local SQLite');
            const dbPath = path.join(__dirname, 'machi.db');
            this.sqlite = new Database(dbPath);
            this.sqlite.pragma('foreign_keys = ON');
        }
    }

    _convertSql(sql) {
        if (this.type === 'sqlite') return sql;

        // Convert ? params to $1, $2, etc. for Postgres
        let i = 1;
        return sql.replace(/\?/g, () => `$${i++}`);
    }

    async query(sql, params = []) {
        if (this.type === 'postgres') {
            const { rows } = await this.pool.query(this._convertSql(sql), params);
            return rows;
        } else {
            return this.sqlite.prepare(sql).all(params);
        }
    }

    async get(sql, params = []) {
        if (this.type === 'postgres') {
            const { rows } = await this.pool.query(this._convertSql(sql), params);
            return rows[0];
        } else {
            return this.sqlite.prepare(sql).get(params);
        }
    }

    async run(sql, params = []) {
        if (this.type === 'postgres') {
            const result = await this.pool.query(this._convertSql(sql), params);
            // Postgres doesn't return lastInsertRowid standardly like SQLite
            // We usually rely on RETURNING * in SQL for PG, but for generic 'run', we return rowCount
            return { changes: result.rowCount };
        } else {
            return this.sqlite.prepare(sql).run(params);
        }
    }

    async exec(sql) {
        if (this.type === 'postgres') {
            return await this.pool.query(sql);
        } else {
            return this.sqlite.exec(sql);
        }
    }
}

// Singleton instance
const dbAdapter = new DBAdapter();
module.exports = dbAdapter;
