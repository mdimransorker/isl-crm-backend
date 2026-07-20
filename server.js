require('dotenv').config();
const express = require('express');
const cors = require('cors');
const store = require('./store');
const authStore = require('./auth-store');
const whatsappRoutes = require('./routes/whatsapp');
const facebookRoutes = require('./routes/facebook');
const authRoutes = require('./routes/auth');

authStore.seedIfEmpty();

const app = express();
app.use(cors());
app.use(express.json());

// ---- Webhooks Meta calls (configure these exact paths in the Developer Console) ----
app.use('/webhook/whatsapp', whatsappRoutes);
app.use('/webhook/facebook', facebookRoutes); // also handles Instagram, same Graph API app

// ---- User accounts: login, current user, admin user management ----
app.use('/api/auth', authRoutes);

// ---- Simple API the CRM frontend can call ----
function checkApiKey(req, res, next) {
  const key = req.header('x-api-key');
  if (key !== process.env.CRM_API_KEY) return res.status(401).json({ error: 'Invalid API key' });
  next();
}

// Unified inbox: every WhatsApp + Facebook + Instagram message in one list, newest first.
app.get('/api/messages', checkApiKey, (req, res) => {
  const messages = store.getAll().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(messages);
});

app.get('/', (req, res) => {
  res.send('ISL Global Education CRM backend is running. See README.md for setup.');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`CRM backend listening on port ${PORT}`));
