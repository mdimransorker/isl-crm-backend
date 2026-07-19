const express = require('express');
const axios = require('axios');
const store = require('../store');

const router = express.Router();

// Same verification handshake pattern as WhatsApp.
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('Facebook/Instagram webhook verified');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Facebook Page comments/DMs and Instagram DMs/comments both arrive here
// when subscribed under the same Meta app.
router.post('/', (req, res) => {
  res.sendStatus(200);

  try {
    req.body.entry?.forEach((entry) => {
      const platform = entry.messaging ? 'facebook' : 'instagram';

      // Direct messages
      entry.messaging?.forEach((event) => {
        if (event.message?.text) {
          store.addMessage({
            channel: platform,
            from: event.sender?.id,
            name: event.sender?.id,
            text: event.message.text,
            direction: 'inbound',
            timestamp: new Date(event.timestamp).toISOString(),
          });
          console.log(`${platform} DM stored from`, event.sender?.id);
        }
      });

      // Page feed comments (changes field, e.g. "feed")
      entry.changes?.forEach((change) => {
        if (change.field === 'feed' && change.value?.item === 'comment') {
          store.addMessage({
            channel: platform,
            from: change.value.from?.name || change.value.from?.id,
            name: change.value.from?.name || 'Unknown',
            text: change.value.message,
            direction: 'inbound',
            type: 'comment',
            timestamp: new Date().toISOString(),
          });
          console.log(`${platform} comment stored from`, change.value.from?.name);
        }
      });
    });
  } catch (err) {
    console.error('Error processing Facebook/Instagram webhook payload:', err.message);
  }
});

// Send a Facebook Page reply. Body: { recipientId: "...", text: "..." }
router.post('/send', async (req, res) => {
  const { recipientId, text } = req.body;
  if (!recipientId || !text) return res.status(400).json({ error: 'recipientId and text are required' });

  try {
    const url = `https://graph.facebook.com/v20.0/me/messages`;
    const result = await axios.post(
      url,
      { recipient: { id: recipientId }, message: { text } },
      { params: { access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN } }
    );
    store.addMessage({ channel: 'facebook', from: recipientId, name: recipientId, text, direction: 'outbound', timestamp: new Date().toISOString() });
    res.json({ ok: true, meta: result.data });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to send Facebook message', details: err.response?.data || err.message });
  }
});

module.exports = router;
