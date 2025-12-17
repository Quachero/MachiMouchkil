// Vercel Serverless Entry Point
// This file delegates the request to the main Express app in backend/server.js
const app = require('../backend/server');

module.exports = app;
