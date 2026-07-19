const express = require('express');
const axios = require('axios');
const store = require('../store');

const router = express.Router();

// STEP 1 — Meta calls this once with a GET request to verify the webhook.
// It must echo back req.query['hub.challenge'] if the verify token matches.
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('WhatsApp webhook verified');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// STEP 2 — Meta POSTs every inbound WhatsApp message here.
router.post('/', (req, res) => {
  // Always respond 200 fast so Meta doesn't retry/mark the webhook unhealthy.
  res.sendStatus(200);

  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const messages = change?.messages;
    if (!messages) return; // could be a status update (delivered/read) — ignore for now

    messages.forEach((m) => {
      const contact = change.contacts?.[0];
      store.addMessage({
        channel: 'whatsapp',
        from: m.from,
        name: contact?.profile?.name || m.from,
        text: m.text?.body || `[${m.type} message]`,
        direction: 'inbound',
        timestamp: new Date(Number(m.timestamp) * 1000).toISOString(),
      });
      console.log('WhatsApp message stored from', m.from);
    });
  } catch (err) {
    console.error('Error processing WhatsApp webhook payload:', err.message);
  }
});

// Send an outbound WhatsApp message from the CRM.
// Body: { to: "8801700000000", text: "Hello!" }
router.post('/send', async (req, res) => {
  const { to, text } = req.body;
  if (!to || !text) return res.status(400).json({ error: 'to and text are required' });

  try {
    const url = `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const result = await axios.post(
      url,
      { messaging_product: 'whatsapp', to, type: 'text', text: { body: text } },
      { headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` } }
    );
    store.addMessage({ channel: 'whatsapp', from: to, name: to, text, direction: 'outbound', timestamp: new Date().toISOString() });
    res.json({ ok: true, meta: result.data });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to send WhatsApp message', details: err.response?.data || err.message });
  }
});

module.exports = router;
