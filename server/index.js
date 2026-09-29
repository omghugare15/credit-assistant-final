const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initSchema } = require('./db');
const profileRoutes = require('./routes/profile');
const accountsRoutes = require('./routes/accounts');
const historyRoutes = require('./routes/history');
const advisorRoutes = require('./routes/advisor');
const simulatorRoutes = require('./routes/simulator');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database schema and initial data
initSchema();

// Mount API routes
app.use('/api/profile', profileRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/advisor', advisorRoutes);
app.use('/api/simulator', simulatorRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    platform: 'Credit Assistant India',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static files
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// Fallback to index.html for SPA routing
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🇮🇳 Credit Assistant Server is running on port ${PORT}`);
  console.log(`🌐 Local Web App URL: http://localhost:${PORT}`);
  console.log(`🤖 Gemini AI Financial Advisor ready with Indian bureau context`);
  console.log(`=======================================================`);
});
