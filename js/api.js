// Machi Mouchkil API Client
// Handles communication with backend API
// Falls back to localStorage when API is unavailable

const API_BASE = window.location.hostname === 'localhost'
    ? '/api'
    : '/api';

class ApiClient {
    constructor() {
        this.token = localStorage.getItem('machi_token') || null;
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('machi_token', token);
        } else {
            localStorage.removeItem('machi_token');
        }
    }

    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'API request failed');
            }

            return data;
        } catch (error) {
            console.warn('API unavailable, using local mode:', error.message);
            throw error;
        }
    }

    // Auth
    async register(name, email, password, referralCode = null) {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password, referralCode })
        });
        this.setToken(data.token);
        return data;
    }

    async login(email, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        this.setToken(data.token);
        return data;
    }

    logout() {
        this.setToken(null);
    }

    // User
    async getUser() {
        return this.request('/users/me');
    }

    async addPoints(amount, reason) {
        return this.request('/users/points', {
            method: 'PUT',
            body: JSON.stringify({ amount, reason })
        });
    }

    async updateMascot(xp, level, stage) {
        return this.request('/users/mascot', {
            method: 'PUT',
            body: JSON.stringify({ xp, level, stage })
        });
    }

    async interactMascot(action) {
        return this.request('/users/interact', {
            method: 'POST',
            body: JSON.stringify({ action })
        });
    }

    // Loyalty
    async recordVisit() {
        return this.request('/loyalty/visit', { method: 'POST' });
    }

    async getRewards() {
        return this.request('/loyalty/rewards');
    }

    async useReward(rewardId) {
        return this.request(`/loyalty/use-reward/${rewardId}`, { method: 'POST' });
    }

    // Contests
    async getContests() {
        return this.request('/contests');
    }

    async enterContest(contestId, answer) {
        return this.request(`/contests/${contestId}/enter`, {
            method: 'POST',
            body: JSON.stringify({ answer })
        });
    }

    // Referrals
    async getReferralStats() {
        return this.request('/referrals/stats');
    }

    async validateReferralCode(code) {
        return this.request('/referrals/validate', {
            method: 'POST',
            body: JSON.stringify({ code })
        });
    }

    // Game
    async saveScore(score, game = 'turtle_surf') {
        return this.request('/game/score', {
            method: 'POST',
            body: JSON.stringify({ score, game })
        });
    }

    async getLeaderboard(game = 'turtle_surf', limit = 10) {
        return this.request(`/game/leaderboard?game=${game}&limit=${limit}`);
    }

    // Feed
    async getFeed(type = 'all') {
        return this.request(`/feed?type=${type}`);
    }

    // Health check
    async healthCheck() {
        return this.request('/health');
    }
}

// Export singleton
window.api = new ApiClient();
