// Machi Mouchkil App - Main JavaScript

// ==================== Global Auth Functions ====================
// Defined globally to ensure they are available for HTML onclick events immediately
window.showLogin = function () {
    console.log('🔘 showLogin clicked');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (loginForm && registerForm) {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    } else {
        console.error('❌ Auth forms not found in DOM');
    }
};

window.showRegister = function () {
    console.log('🔘 showRegister clicked');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (loginForm && registerForm) {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    } else {
        console.error('❌ Auth forms not found in DOM');
    }
};

window.handleLogin = async function () {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showToast('Remplis tous les champs !', 'error');
        return;
    }

    try {
        const result = await window.api.login(email, password);

        AppState.isLoggedIn = true;
        AppState.user = result.user;
        saveState();
        showScreen('app-screen');
        updateUI();
        showToast('Content de te revoir ! 👋', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
};

window.handleRegister = async function () {
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const phone = document.getElementById('register-phone').value;

    if (!name || !email || !password) {
        showToast('Remplis tous les champs obligatoires !', 'error');
        return;
    }

    try {
        const result = await window.api.register(name, email, password);

        AppState.isLoggedIn = true;
        AppState.user = result.user;
        AppState.loyalty.rewards.push('welcome_drink');

        saveState();
        showScreen('onboarding-screen');
        showToast('Bienvenue dans la famille ! 🎉', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// ==================== App State ====================
const AppState = {
    user: null,
    isLoggedIn: false,
    currentSlide: 0,
    mascot: {
        level: 1,
        xp: 30,
        mood: 'happy',
        stage: 'baby',
        lastInteraction: null
    },
    loyalty: {
        visits: 3,
        points: 350,
        rewards: ['drink']
    },
    referrals: {
        code: 'MACHI-FOODIE-2024',
        total: 3,
        pending: 1,
        pointsEarned: 600
    }
};

// ==================== Feed Data ====================
const feedContent = [
    {
        id: 1,
        type: 'news',
        title: '🎄 Menu de Noël disponible !',
        excerpt: 'Découvre notre sélection festive : burger au foie gras, dessert chocolat-marron...',
        date: 'Il y a 2h',
        emoji: '🎄'
    },
    {
        id: 2,
        type: 'quote',
        title: '"La vie est trop courte pour manger mal"',
        excerpt: '- L\'équipe Machi Mochkil 💪',
        date: 'Hier',
        emoji: '💬'
    },
    {
        id: 3,
        type: 'event',
        title: '🎉 Soirée Before de Noël',
        excerpt: 'Le 23 décembre, viens fêter Noël avant l\'heure avec nous ! Surprises garanties.',
        date: 'Il y a 3j',
        emoji: '🎉'
    },
    {
        id: 4,
        type: 'news',
        title: 'Nouveau burger : Le Machi Deluxe 🍔',
        excerpt: 'Double steak, cheddar affiné, sauce secrète... Tu vas adorer !',
        date: 'Il y a 5j',
        emoji: '🍔'
    }
];

// ==================== Mascot Data ====================
const mascotStages = {
    egg: { emoji: '🥚', name: 'Œuf', minLevel: 0 },
    baby: { emoji: '🐢', name: 'Bébé Tortue', minLevel: 1 },
    junior: { emoji: '🐠', name: 'Poisson', minLevel: 3 },
    adult: { emoji: '🐬', name: 'Dauphin', minLevel: 5 },
    super: { emoji: '🦈', name: 'Requin', minLevel: 8 },
    legendary: { emoji: '🐋', name: 'Baleine', minLevel: 10 }
};

const mascotMessages = [
    "Aloha ! Trop content de te voir ! 🌺",
    "Tu m'as manqué, surfer ! 🏄‍♂️",
    "Prêt pour une nouvelle vague ? 🌊",
    "J'ai faim... une petite visite au resto ? 🍔",
    "Tu sais quoi ? T'es le/la meilleur(e) ! ⭐",
    "Encore une visite et je passe au niveau suivant ! 🐚",
    "Machi Mochkil, c'est la vibe ! 🤙",
    "Catch the wave, feel the taste ! 🌴",
    "Le soleil brille, viens surfer avec moi ! ☀️"
];

// ==================== Initialization ====================
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    checkAuth();
    initializeApp();
});

function loadState() {
    const savedState = localStorage.getItem('machiMouchkilState');
    if (savedState) {
        // Apply saved state
        const state = JSON.parse(savedState);
        console.log('State restored:', state);

        // Merge saved state into AppState
        Object.assign(AppState, state);
    }
}

function saveState() {
    localStorage.setItem('machiMouchkilState', JSON.stringify(AppState));
}

function checkAuth() {
    if (AppState.isLoggedIn && AppState.user) {
        showScreen('app-screen');
        updateUI();
    } else {
        showScreen('auth-screen');
    }
}

function initializeApp() {
    initializeStamps();
    initializeFeed();
    updateContestTimer();
    setInterval(updateContestTimer, 60000);
    registerServiceWorker();
    listenGameEvents();

    // Refresh user data from backend if logged in
    if (AppState.isLoggedIn) {
        refreshUserData();
    }
}

async function refreshUserData() {
    try {
        const result = await window.api.getUser();
        if (result && result.user) {
            console.log('🔄 User data refreshed from backend');
            AppState.user = result.user;
            AppState.loyalty.points = result.user.points || 0;
            AppState.mascot.level = result.user.mascot_level || 1;
            saveState();
            updateUI();
        }
    } catch (err) {
        console.warn('Failed to refresh user data:', err);
        // If 401/403, maybe logout? For now just keep local state.
        if (err.message.includes('401') || err.message.includes('403')) {
            handleLogout();
        }
    }
}


// ==================== PWA Service Worker ====================
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('🏄‍♂️ Service Worker registered!', reg.scope))
            .catch(err => console.log('Service Worker registration failed:', err));
    }
}

// ==================== Turtle Surf Game ====================
let turtleGame = null;

function openTurtleSurf() {
    showModal(`
        <div class="game-modal">
            <h2>🐢 Turtle Surf 🌊</h2>
            <p class="game-instructions">Tap ou clique pour nager et éviter les coraux !</p>
            <div class="game-container">
                <canvas id="game-canvas" width="320" height="480"></canvas>
            </div>
            <div class="game-stats">
                <span>🏆 Record: <span id="game-high-score">${localStorage.getItem('turtleSurfHighScore') || 0}</span></span>
            </div>
        </div>
    `);

    // Initialize game after modal is shown
    setTimeout(() => {
        const canvas = document.getElementById('game-canvas');
        if (canvas && window.TurtleSurfGame) {
            turtleGame = new TurtleSurfGame(canvas);
        }
    }, 100);
}

function listenGameEvents() {
    window.addEventListener('gameOver', (e) => {
        const { score, points } = e.detail;
        if (points > 0) {
            addPoints(points);
            addMascotXP(Math.floor(score / 2));
        }
        // Update high score display
        const hsEl = document.getElementById('game-high-score');
        if (hsEl) {
            hsEl.textContent = localStorage.getItem('turtleSurfHighScore') || 0;
        }
    });
}

// ==================== Mascot Interaction ====================
async function handleInteraction(action) {
    if (!AppState.isLoggedIn) return;

    // 1. Optimistic Updates (Visual Feedback First)
    const originalUser = { ...AppState.user }; // Backup in case of error
    let optimisticUpdates = {};
    let animationClass = '';

    // Simulate logic for instant feedback (matches backend roughly)
    const user = AppState.user;
    switch (action) {
        case 'feed':
            if (user.mascot_hunger >= 90) return showToast('Il n\'a pas faim !', 'info');
            optimisticUpdates = { mascot_hunger: Math.min(100, user.mascot_hunger + 30), mascot_energy: Math.max(0, user.mascot_energy - 5) };
            animationClass = 'anim-bounce';
            break;
        case 'sleep':
            if (user.mascot_energy >= 90) return showToast('Il n\'est pas fatigué !', 'info');
            optimisticUpdates = { mascot_energy: 100, mascot_hunger: Math.max(0, user.mascot_hunger - 20) };
            animationClass = 'anim-sleep';
            break;
        case 'play':
            if (user.mascot_happiness >= 90) return showToast('Il est déjà au top !', 'info');
            if (user.mascot_energy < 20) return showToast('Trop fatigué pour jouer...', 'warning');
            optimisticUpdates = { mascot_happiness: Math.min(100, user.mascot_happiness + 20), mascot_energy: Math.max(0, user.mascot_energy - 15) };
            animationClass = 'anim-happy';
            break;
        case 'clean':
            if (user.mascot_hygiene >= 90) return showToast('Déjà tout propre !', 'info');
            optimisticUpdates = { mascot_hygiene: 100, mascot_happiness: Math.min(100, user.mascot_happiness + 5) };
            animationClass = 'anim-shake';
            break;
    }

    // Apply Optimistic State
    AppState.user = { ...AppState.user, ...optimisticUpdates };
    updateMascotUI(); // Refresh UI immediately (bars move instantly)
    triggerMascotAnimation(animationClass); // Trigger animation

    try {
        // 2. Network Request
        const result = await window.api.interactMascot(action);

        if (result.error) {
            // Revert on API error (business logic reject)
            AppState.user = originalUser;
            updateMascotUI();
            showToast(result.error, 'error');
            return;
            // 3. Confirm with Authoritative Data
            AppState.user = { ...AppState.user, ...result.stats };
            saveState();
            updateMascotUI(); // Sync with exact backend values

            // Show success message
            showToast(result.message, 'success');

        } catch (err) {
            // Revert on Network error
            console.error('Interaction failed', err);
            AppState.user = originalUser;
            updateMascotUI();
            showToast('Erreur de connexion...', 'error');
        }
    }

function triggerMascotAnimation(animClass) {
        const avatar = document.querySelector('.mascot-avatar');
        if (!avatar || !animClass) return;

        // Reset animations
        avatar.classList.remove('anim-bounce', 'anim-shake', 'anim-happy', 'anim-sleep');

        // Force reflow
        void avatar.offsetWidth;

        // Apply new animation
        avatar.classList.add(animClass);
    }

    // ==================== Screen Management ====================
    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    // Auth functions moved to global scope at top of file


    function socialLogin(provider) {
        // Simulate social login
        AppState.isLoggedIn = true;
        AppState.user = { name: 'Foodie', email: `user@${provider}.com` };
        saveState();
        showScreen('onboarding-screen');
        showToast(`Connexion avec ${provider} réussie !`, 'success');
    }

    function handleLogout() {
        AppState.isLoggedIn = false;
        AppState.user = null;
        saveState();
        showScreen('auth-screen');
        showToast('À bientôt ! 👋', 'success');
    }

    // ==================== Onboarding ====================
    function nextSlide() {
        const slides = document.querySelectorAll('.onboarding-slide');
        const dots = document.querySelectorAll('.dot');
        const maxSlide = slides.length - 1;

        if (AppState.currentSlide < maxSlide) {
            slides[AppState.currentSlide].classList.remove('active');
            dots[AppState.currentSlide].classList.remove('active');

            AppState.currentSlide++;

            slides[AppState.currentSlide].classList.add('active');
            dots[AppState.currentSlide].classList.add('active');

            if (AppState.currentSlide === maxSlide) {
                document.getElementById('onboarding-next').innerHTML = '<span>C\'est parti !</span><span class="btn-emoji">🚀</span>';
            }
        } else {
            completeOnboarding();
        }
    }

    function skipOnboarding() {
        completeOnboarding();
    }

    function completeOnboarding() {
        showScreen('app-screen');
        updateUI();
        showToast('Profite de ton cadeau de bienvenue ! 🎁', 'success');
    }

    function copyCode() {
        const code = document.getElementById('welcome-code-value').textContent;
        navigator.clipboard.writeText(code);
        showToast('Code copié ! 📋', 'success');
    }

    // ==================== Tab Navigation ====================
    function switchTab(tabName) {
        // Update content
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(`tab-${tabName}`).classList.add('active');

        // Update nav
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    }

    // ==================== UI Updates ====================
    function updateUI() {
        updateUserDisplay();
        updateMascotUI();
        updateLoyalty();
        updatePoints();
    }

    function updateUserDisplay() {
        const name = AppState.user?.name || 'Foodie';
        document.getElementById('user-name-display').textContent = name;
        document.getElementById('profile-name').textContent = name;
    }

    function updatePoints() {
        document.getElementById('total-points').textContent = AppState.loyalty.points;
        document.getElementById('profile-points').textContent = AppState.loyalty.points;
        document.getElementById('profile-visits').textContent = AppState.loyalty.visits;
        document.getElementById('profile-level').textContent = AppState.mascot.level;
    }

    // ==================== Mascot System ====================
    function updateMascotUI() {
        console.log('🐢 Updating Mascot UI...', AppState.user);
        const user = AppState.user;
        if (!user) return;

        // XP & Level - Safety check
        const xp = user.mascot_xp !== undefined ? user.mascot_xp : 0;
        const level = user.mascot_level !== undefined ? user.mascot_level : 1;

        const xpEl = document.getElementById('mascot-xp');
        if (xpEl) xpEl.textContent = xp;

        const levelEl = document.getElementById('mascot-level');
        if (levelEl) levelEl.textContent = level;

        const xpFill = document.getElementById('mascot-xp-fill');
        if (xpFill) xpFill.style.width = `${Math.min(100, xp)}%`;

        document.getElementById('mascot-stage').textContent = user.mascot_stage || 'Bébé';

        // Emoji based on stage
        const emojis = {
            'egg': '🥚',
            'baby': '🐢',
            'child': '🐢',
            'teen': '🐬',
            'adult': '🦈'
        };
        const avatar = document.querySelector('.mascot-avatar');
        if (avatar) avatar.textContent = emojis[user.mascot_stage] || '🐢';

        // Stats Bars & Actions
        // Ensure values exist or default to 50
        updateStatBar('hunger', user.mascot_hunger ?? 50);
        updateStatBar('energy', user.mascot_energy ?? 50);
        updateStatBar('happiness', user.mascot_happiness ?? 50);
        updateStatBar('hygiene', user.mascot_hygiene ?? 50);

        // Disable buttons if maxed/depleted logic is wanted visually
        // (Optional: visual disabled state based on backend rules)
        document.getElementById('btn-feed').disabled = (user.mascot_hunger >= 90);
        document.getElementById('btn-sleep').disabled = (user.mascot_energy >= 90);
        document.getElementById('btn-play').disabled = (user.mascot_happiness >= 90 || user.mascot_energy < 20);
        document.getElementById('btn-clean').disabled = (user.mascot_hygiene >= 90);
    }

    function updateStatBar(type, value) {
        const bar = document.getElementById(`stat-${type}`);
        if (bar) {
            bar.style.width = `${value || 50}%`;
            // Color logic is handled in CSS but could be dynamic here if needed
        }
    }
    function updateMascotMood() {
        const moods = {
            happy: '😊 Content',
            excited: '🤩 Excité',
            hungry: '😋 Affamé',
            sleepy: '😴 Fatigué',
            love: '😍 Amoureux'
        };

        const moodKeys = Object.keys(moods);
        const randomMood = moodKeys[Math.floor(Math.random() * moodKeys.length)];
        AppState.mascot.mood = randomMood;
        document.getElementById('mascot-mood').textContent = moods[randomMood];
    }

    function interactWithMascot() {
        // Add hearts animation
        const heartsContainer = document.getElementById('mascot-hearts');
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const heart = document.createElement('span');
                heart.className = 'heart';
                heart.textContent = '❤️';
                heart.style.left = `${Math.random() * 60 - 30}px`;
                heartsContainer.appendChild(heart);
                setTimeout(() => heart.remove(), 1000);
            }, i * 100);
        }

        // Add XP
        addMascotXP(5);

        // Add points sometimes
        if (Math.random() > 0.7) {
            addPoints(10);
            showToast('+10 points ! Ta mascotte t\'adore ! ⭐', 'success');
        }

        // Update message
        const message = mascotMessages[Math.floor(Math.random() * mascotMessages.length)];
        document.getElementById('mascot-speech').querySelector('p').textContent = message;
    }

    function addMascotXP(amount) {
        AppState.mascot.xp += amount;

        if (AppState.mascot.xp >= 100) {
            AppState.mascot.xp = 0;
            AppState.mascot.level++;
            updateMascotStage();
            showToast(`🎉 Ta mascotte passe au niveau ${AppState.mascot.level} !`, 'success');
        }

        saveState();
        updateMascot();
    }

    function updateMascotStage() {
        const level = AppState.mascot.level;
        for (const [stage, data] of Object.entries(mascotStages).reverse()) {
            if (level >= data.minLevel) {
                AppState.mascot.stage = stage;
                break;
            }
        }
    }

    // ==================== Loyalty System ====================
    function initializeStamps() {
        const grid = document.getElementById('stamps-grid');
        grid.innerHTML = '';

        for (let i = 0; i < 10; i++) {
            const stamp = document.createElement('div');
            stamp.className = `stamp-slot ${i < AppState.loyalty.visits ? 'filled' : ''}`;
            stamp.textContent = i < AppState.loyalty.visits ? '✓' : '';
            grid.appendChild(stamp);
        }

        updateLoyaltyDisplay();
    }

    function updateLoyalty() {
        initializeStamps();
    }

    function updateLoyaltyDisplay() {
        const visits = AppState.loyalty.visits;
        document.getElementById('current-visits').textContent = visits;
        document.getElementById('visits-count').textContent = `${visits}/10`;

        // Calculate next reward
        const milestones = [3, 5, 8, 10, 15];
        const nextMilestone = milestones.find(m => m > visits) || 15;
        const remaining = nextMilestone - visits;
        document.getElementById('next-reward-visits').textContent = remaining;
    }

    function addPoints(amount) {
        AppState.loyalty.points += amount;
        saveState();
        updatePoints();
    }

    function useReward(rewardType) {
        showModal(`
        <div class="reward-use-modal">
            <div class="reward-emoji-large">🎁</div>
            <h2>Utiliser ta récompense ?</h2>
            <p>Montre ce QR code au serveur pour récupérer ta boisson offerte !</p>
            <div class="qr-placeholder">
                <div class="fake-qr">📱</div>
                <span>QR Code</span>
            </div>
            <button class="btn-primary" onclick="confirmUseReward('${rewardType}')">
                <span>Confirmer</span>
            </button>
        </div>
    `);
    }

    function confirmUseReward(rewardType) {
        const idx = AppState.loyalty.rewards.indexOf(rewardType);
        if (idx > -1) {
            AppState.loyalty.rewards.splice(idx, 1);
            saveState();
            closeModal();
            showToast('Récompense utilisée ! Bon appétit ! 🍔', 'success');
            updateUI();
        }
    }

    // ==================== Contests ====================
    function updateContestTimer() {
        // Simulate countdown to end of month
        const now = new Date();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const diff = endOfMonth - now;

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        document.getElementById('timer-days').textContent = days;
        document.getElementById('timer-hours').textContent = hours;
        document.getElementById('timer-mins').textContent = mins;
    }

    function participateContest() {
        showModal(`
        <div class="contest-modal">
            <div class="contest-emoji-large">🎄</div>
            <h2>Concours de Noël</h2>
            <p>Pour participer, réponds à cette question :</p>
            <div class="contest-question">
                <p><strong>Quel est ton burger préféré chez Machi Mochkil ?</strong></p>
                <textarea placeholder="Ta réponse..." rows="3"></textarea>
            </div>
            <button class="btn-primary" onclick="submitContestEntry()">
                <span>Participer</span>
                <span class="btn-emoji">🍀</span>
            </button>
        </div>
    `);
    }

    function submitContestEntry() {
        const textarea = document.querySelector('.contest-modal textarea');
        if (!textarea.value.trim()) {
            showToast('Écris ta réponse !', 'error');
            return;
        }

        addPoints(50);
        addMascotXP(20);
        closeModal();
        showToast('Participation enregistrée ! +50 points 🍀', 'success');

        // Update participants count
        const countEl = document.getElementById('participants-count');
        countEl.textContent = parseInt(countEl.textContent) + 1;
    }

    function showComingSoon() {
        showToast('Bientôt disponible ! 🚀', 'success');
    }

    // ==================== Referral ====================
    function copyReferralCode() {
        const code = document.getElementById('referral-code').textContent;
        navigator.clipboard.writeText(code);
        showToast('Code copié ! Partage-le vite ! 📋', 'success');
    }

    function shareVia(platform) {
        const code = AppState.referrals.code;
        const message = `Rejoins-moi sur Machi Mochkil ! Utilise mon code ${code} et gagne une boisson offerte 🍹 https://machimochkil.app/join/${code}`;

        switch (platform) {
            case 'whatsapp':
                window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
                break;
            case 'sms':
                window.open(`sms:?body=${encodeURIComponent(message)}`);
                break;
            case 'more':
                if (navigator.share) {
                    navigator.share({ title: 'Machi Mochkil', text: message });
                } else {
                    copyReferralCode();
                }
                break;
        }
    }

    function showQRCode() {
        showModal(`
        <div class="qr-modal">
            <h2>Ton QR Code Parrain</h2>
            <div class="qr-placeholder large">
                <div class="fake-qr">📷</div>
            </div>
            <p>Fais scanner ce code à tes amis !</p>
            <p class="referral-code-display">${AppState.referrals.code}</p>
        </div>
    `);
    }

    // ==================== Feed ====================
    function initializeFeed() {
        const feedList = document.getElementById('feed-list');
        const homePreview = document.getElementById('home-feed-preview');

        feedList.innerHTML = feedContent.map(item => createFeedItem(item)).join('');
        homePreview.innerHTML = feedContent.slice(0, 2).map(item => createFeedItem(item)).join('');

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => filterFeed(btn.dataset.filter));
        });
    }

    function createFeedItem(item) {
        return `
        <div class="feed-item" data-type="${item.type}">
            <div class="feed-item-header">
                <span class="feed-item-type">${item.emoji} ${item.type}</span>
                <span class="feed-item-date">${item.date}</span>
            </div>
            <h4 class="feed-item-title">${item.title}</h4>
            <p class="feed-item-excerpt">${item.excerpt}</p>
        </div>
    `;
    }

    function filterFeed(filter) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });

        document.querySelectorAll('#feed-list .feed-item').forEach(item => {
            if (filter === 'all' || item.dataset.type === filter) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // ==================== Profile & Settings ====================
    function showSettings(section) {
        const contents = {
            account: `
            <h2>👤 Mon compte</h2>
            <div class="settings-form">
                <div class="input-group">
                    <input type="text" value="${AppState.user?.name || ''}" placeholder="Prénom">
                    <span class="input-icon">👤</span>
                </div>
                <div class="input-group">
                    <input type="email" value="${AppState.user?.email || ''}" placeholder="Email">
                    <span class="input-icon">📧</span>
                </div>
                <button class="btn-primary" onclick="closeModal(); showToast('Profil mis à jour !', 'success');">
                    <span>Sauvegarder</span>
                </button>
            </div>
        `,
            notifications: `
            <h2>🔔 Notifications</h2>
            <div class="settings-toggles">
                <div class="toggle-item">
                    <span>Nouveaux concours</span>
                    <label class="toggle"><input type="checkbox" checked><span class="slider"></span></label>
                </div>
                <div class="toggle-item">
                    <span>Nouvelles récompenses</span>
                    <label class="toggle"><input type="checkbox" checked><span class="slider"></span></label>
                </div>
                <div class="toggle-item">
                    <span>Actus du resto</span>
                    <label class="toggle"><input type="checkbox" checked><span class="slider"></span></label>
                </div>
                <div class="toggle-item">
                    <span>Messages de ta mascotte</span>
                    <label class="toggle"><input type="checkbox" checked><span class="slider"></span></label>
                </div>
            </div>
        `,
            location: `
            <h2>📍 Géolocalisation</h2>
            <p>Active la géolocalisation pour recevoir des notifications quand tu passes près du resto !</p>
            <div class="settings-toggles">
                <div class="toggle-item">
                    <span>Activer la géolocalisation</span>
                    <label class="toggle"><input type="checkbox"><span class="slider"></span></label>
                </div>
            </div>
            <p class="settings-info">🔒 Tes données sont protégées et jamais partagées.</p>
        `,
            privacy: `
            <h2>🔒 Confidentialité & RGPD</h2>
            <p>Tes données nous tiennent à cœur !</p>
            <ul class="privacy-list">
                <li>✓ Données stockées de façon sécurisée</li>
                <li>✓ Jamais de partage avec des tiers</li>
                <li>✓ Tu peux supprimer ton compte à tout moment</li>
            </ul>
            <button class="btn-secondary" onclick="closeModal();">Télécharger mes données</button>
            <button class="btn-danger" onclick="closeModal();">Supprimer mon compte</button>
        `,
            help: `
            <h2>❓ Aide & FAQ</h2>
            <div class="faq-list">
                <details>
                    <summary>Comment gagner des points ?</summary>
                    <p>Chaque visite = 100 points. Participe aux jeux et parraine tes amis pour en gagner plus !</p>
                </details>
                <details>
                    <summary>Comment utiliser mes récompenses ?</summary>
                    <p>Va dans l'onglet Fidélité et clique sur "Utiliser" pour afficher le QR code.</p>
                </details>
                <details>
                    <summary>Ma mascotte n'évolue pas ?</summary>
                    <p>Interagis avec elle, visite le resto et participe aux jeux pour la faire évoluer !</p>
                </details>
            </div>
        `,
            about: `
            <h2>ℹ️ À propos</h2>
            <div class="about-content">
                <p><strong>Machi Mochkil</strong></p>
                <p>Version 1.0.0</p>
                <p>© 2024 Machi Mochkil</p>
                <p>Fait avec ❤️ pour nos clients</p>
            </div>
        `
        };

        showModal(contents[section] || '<p>Section non trouvée</p>');
    }

    function showPointsDetail() {
        showModal(`
        <h2>⭐ Tes points</h2>
        <div class="points-detail">
            <div class="points-total">
                <span class="big-points">${AppState.loyalty.points}</span>
                <span>points</span>
            </div>
            <h3>Comment gagner plus ?</h3>
            <ul class="points-ways">
                <li>🍔 Visite au resto : +100 pts</li>
                <li>🎰 Jeu concours : +50 pts</li>
                <li>👥 Parrainage : +200 pts</li>
                <li>🐣 Interaction mascotte : +10 pts</li>
                <li>📣 Lecture contenu : +5 pts</li>
            </ul>
        </div>
    `);
    }

    function showNotifications() {
        showModal(`
        <h2>🔔 Notifications</h2>
        <div class="notifications-list">
            <div class="notification-item unread">
                <span class="notif-icon">🎄</span>
                <div class="notif-content">
                    <strong>Nouveau concours de Noël !</strong>
                    <p>Participe et gagne un repas pour 4</p>
                    <span class="notif-time">Il y a 2h</span>
                </div>
            </div>
            <div class="notification-item">
                <span class="notif-icon">🐣</span>
                <div class="notif-content">
                    <strong>Ta mascotte t'attend !</strong>
                    <p>Viens lui dire bonjour</p>
                    <span class="notif-time">Hier</span>
                </div>
            </div>
            <div class="notification-item">
                <span class="notif-icon">👥</span>
                <div class="notif-content">
                    <strong>Sophie a utilisé ton code !</strong>
                    <p>+200 points gagnés</p>
                    <span class="notif-time">Il y a 2j</span>
                </div>
            </div>
        </div>
    `);
    }

    // ==================== Modal ====================
    function showModal(content) {
        const modal = document.getElementById('modal-overlay');
        const body = document.getElementById('modal-body');
        body.innerHTML = content;
        modal.classList.remove('hidden');
    }

    function closeModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
    }

    // ==================== Toast ====================
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span><span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

