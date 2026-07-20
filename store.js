// Very small file-backed store so messages survive a server restart
// without needing a database. Good enough for a first live deployment;
// swap for Postgres/MongoDB later if volume grows.
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'messages.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function save(messages) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(messages, null, 2));
}

function addMessage(msg) {
  const messages = load();
  messages.push({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), ...msg });
  save(messages);
  return messages;
}

function getAll() {
  return load();
}

module.exports = { addMessage, getAll };
