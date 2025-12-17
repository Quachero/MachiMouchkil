class DBAdapter {
    constructor() {
        this.type = process.env.DATABASE_URL ? 'postgres' : 'sqlite';
        this.pool = null;
        this.sqlite = null;

        if (this.type === 'postgres') {
            const { Pool } = require('pg');
            console.log('🔌 Connecting to PostgreSQL...');
            this.pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }
            });
        } else {
            console.log('📂 Using Local SQLite');


            // CRITICAL CHECK FOR VERCEL
            if (process.env.VERCEL === '1') {
                console.error('🚨 ERROR: Running on Vercel but DATABASE_URL is missing!');
                this.initError = 'Missing DATABASE_URL on Vercel environment';
                // Fallback to in-memory for safety check, but API will know it's broken
                const Database = require('better-sqlite3');
                this.sqlite = new Database(':memory:');
                return;
            }

            const Database = require('better-sqlite3');
            const path = require('path');
            // Lazy load better-sqlite3 only if needed (though it's standard here)
            this.sqlite = new Database(path.join(__dirname, 'machi.db'));
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
            try {
                const result = await this.pool.query(this._convertSql(sql), params);
                return { changes: result.rowCount };
            } catch (err) {
                console.error('🔥 SQL Error:', err.message);
                console.error('   Query:', sql);
                console.error('   Params:', params);
                throw err;
            }
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
