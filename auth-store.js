const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const USERS_FILE = path.join(__dirname, 'data', 'users.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}
function save(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Runs once, only if no users exist yet — creates a starter set of
// accounts so you're never locked out after a fresh deploy.
function seedIfEmpty() {
  const users = load();
  if (users.length > 0) return;

  const seed = [
    { name: 'Super Admin', email: 'admin@islglobal.edu', password: 'ChangeMe123!', role: 'Super Admin' },
    { name: 'Nusrat Jahan', email: 'nusrat.jahan@islglobal.edu', password: 'Counselor123!', role: 'Counselor' },
    { name: 'Tanvir Ahmed', email: 'tanvir.ahmed@islglobal.edu', password: 'Counselor123!', role: 'Counselor' },
  ];
  const created = seed.map((u, i) => ({
    id: 'U-' + (i + 1),
    name: u.name,
    email: u.email.toLowerCase(),
    role: u.role,
    passwordHash: bcrypt.hashSync(u.password, 10),
    createdAt: new Date().toISOString(),
  }));
  save(created);

  console.log('\n==============================================');
  console.log(' No users found — seeded starter accounts:');
  seed.forEach((u) => console.log(`   ${u.role.padEnd(12)} ${u.email}  /  ${u.password}`));
  console.log(' CHANGE THESE PASSWORDS after first login.');
  console.log('==============================================\n');
}

function findByEmail(email) {
  return load().find((u) => u.email === String(email).toLowerCase());
}
function findById(id) {
  return load().find((u) => u.id === id);
}
function listPublic() {
  return load().map(({ passwordHash, ...rest }) => rest);
}
function create({ name, email, password, role }) {
  const users = load();
  if (users.find((u) => u.email === email.toLowerCase())) {
    throw new Error('A user with this email already exists');
  }
  const user = {
    id: 'U-' + Date.now(),
    name,
    email: email.toLowerCase(),
    role,
    passwordHash: bcrypt.hashSync(password, 10),
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  save(users);
  const { passwordHash, ...pub } = user;
  return pub;
}
function updateRole(id, role) {
  const users = load();
  const u = users.find((x) => x.id === id);
  if (!u) throw new Error('User not found');
  u.role = role;
  save(users);
  return u;
}
function remove(id) {
  const users = load().filter((u) => u.id !== id);
  save(users);
}

module.exports = { seedIfEmpty, findByEmail, findById, listPublic, create, updateRole, remove };
