# 🐢 Machi Mochkil

Application mobile PWA pour restaurant avec fidélité gamifiée, mascotte Tamagotchi et mini-jeu.

## 🚀 Déploiement sur Vercel (Recommandé)

### Méthode 1: Via GitHub
1. **Push le projet sur GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/ton-username/machi-mochkil.git
   git push -u origin main
   ```

2. **Déployer sur Vercel**
   - Va sur [vercel.com](https://vercel.com)
   - Connecte ton compte GitHub
   - Clique "New Project" → sélectionne ton repo
   - Clique "Deploy"
   - Ton app sera live en 2 minutes ! 🎉

### Méthode 2: Via Vercel CLI
```bash
npm i -g vercel
vercel login
vercel
```

## 🏃‍♂️ Développement Local

### Prérequis
- Node.js 18+

### Installation
```bash
npm install
npm run dev
```

L'app sera disponible sur http://localhost:3000

## 📁 Structure du Projet

```
machi-mochkil/
├── index.html          # App PWA
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker
├── vercel.json         # Config Vercel
├── styles/
│   └── main.css        # Design system (thème surf/océan)
├── js/
│   ├── app.js          # Logique principale
│   ├── game.js         # Mini-jeu Turtle Surf
│   └── api.js          # Client API
└── backend/
    ├── server.js       # Express server
    ├── database.js     # SQLite setup
    ├── middleware/
    │   └── auth.js     # JWT auth
    └── routes/
        ├── auth.js     # Register/Login
        ├── users.js    # Profile/Points
        ├── loyalty.js  # Visites/Récompenses
        ├── contests.js # Concours
        ├── referrals.js # Parrainage
        ├── game.js     # Scores/Leaderboard
        └── feed.js     # Contenu éditorial
```

## 🎮 Fonctionnalités

- ✅ **PWA** - Installable sur mobile
- ✅ **Authentification** - JWT tokens
- ✅ **Fidélité gamifiée** - Points, visites, récompenses
- ✅ **Mascotte Tamagotchi** - Évolue avec l'activité
- ✅ **Mini-jeu Turtle Surf** - Style Flappy Bird
- ✅ **Concours** - Participation + tirage au sort
- ✅ **Parrainage** - Code unique + bonus
- ✅ **Feed** - Contenu éditorial

## 🌊 Thème Surf/Océan

Palette de couleurs océan avec mascotte tortue évolutive :
🥚 → 🐢 → 🐠 → 🐬 → 🦈 → 🐋

---

Made with ❤️ for Machi Mouchkil 🏄‍♂️
