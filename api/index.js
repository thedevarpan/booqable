const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Example API routes
app.get('/api/ping', (_req, res) => {
  res.json({ message: 'pong' });
});

// Add your other API routes here
// You can import and use your existing route handlers

module.exports = serverless(app);