const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const users = require('../auth-store');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login  { email, password } -> { token, user }
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const user = users.findByEmail(email);
  if (!user) return res.status(401).json({ error: 'Invalid email or password' });

  const ok = bcrypt.compareSync(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// GET /api/auth/me — used on page load to check if a saved token is still valid
router.get('/me', verifyToken, (req, res) => {
  const user = users.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User no longer exists' });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

// GET /api/auth/users — list all accounts (Super Admin / Admin only)
router.get('/users', verifyToken, requireRole('Super Admin', 'Admin'), (req, res) => {
  res.json(users.listPublic());
});

// POST /api/auth/users — create a new account (Super Admin / Admin only)
router.post('/users', verifyToken, requireRole('Super Admin', 'Admin'), (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'name, email, password and role are all required' });
  try {
    const created = users.create({ name, email, password, role });
    res.json(created);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PATCH /api/auth/users/:id — change a user's role (Super Admin / Admin only)
router.patch('/users/:id', verifyToken, requireRole('Super Admin', 'Admin'), (req, res) => {
  try {
    const updated = users.updateRole(req.params.id, req.body.role);
    res.json({ ok: true, user: updated });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/auth/users/:id (Super Admin / Admin only)
router.delete('/users/:id', verifyToken, requireRole('Super Admin', 'Admin'), (req, res) => {
  if (req.user.id === req.params.id) return res.status(400).json({ error: "You can't delete your own account" });
  users.remove(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
