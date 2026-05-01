const jwt = require('jsonwebtoken');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow-super-secret-key-change-in-production';

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, name, email, avatar FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireProjectRole = (roles) => (req, res, next) => {
  const { projectId } = req.params;
  const member = db.prepare(
    'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?'
  ).get(projectId, req.user.id);

  if (!member) return res.status(403).json({ error: 'Not a project member' });
  if (roles && !roles.includes(member.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  req.projectRole = member.role;
  next();
};

module.exports = { authenticate, requireProjectRole, JWT_SECRET };
