const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate, requireProjectRole } = require('../middleware');

// GET /api/projects - list user's projects
router.get('/', authenticate, (req, res) => {
  const projects = db.prepare(`
    SELECT p.*, u.name as owner_name,
      (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as done_count,
      pm.role as my_role
    FROM projects p
    JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    JOIN users u ON u.id = p.owner_id
    ORDER BY p.created_at DESC
  `).all(req.user.id);
  res.json({ projects });
});

// POST /api/projects - create project
router.post('/', authenticate, [
  body('name').trim().notEmpty().withMessage('Project name required'),
  body('description').optional().trim(),
  body('color').optional().isHexColor(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description, color } = req.body;
  const result = db.prepare(
    'INSERT INTO projects (name, description, color, owner_id) VALUES (?, ?, ?, ?)'
  ).run(name, description || '', color || '#6366f1', req.user.id);

  // Add creator as admin
  db.prepare(
    'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)'
  ).run(result.lastInsertRowid, req.user.id, 'admin');

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ project });
});

// GET /api/projects/:projectId
router.get('/:projectId', authenticate, requireProjectRole(), (req, res) => {
  const project = db.prepare(`
    SELECT p.*, u.name as owner_name, pm.role as my_role
    FROM projects p
    JOIN users u ON u.id = p.owner_id
    JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    WHERE p.id = ?
  `).get(req.user.id, req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const members = db.prepare(`
    SELECT u.id, u.name, u.email, u.avatar, pm.role, pm.joined_at
    FROM project_members pm
    JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = ?
    ORDER BY pm.role DESC, u.name ASC
  `).all(req.params.projectId);

  res.json({ project, members });
});

// PUT /api/projects/:projectId
router.put('/:projectId', authenticate, requireProjectRole(['admin']), [
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('color').optional().isHexColor(),
], (req, res) => {
  const { name, description, color } = req.body;
  db.prepare(`
    UPDATE projects SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      color = COALESCE(?, color)
    WHERE id = ?
  `).run(name || null, description !== undefined ? description : null, color || null, req.params.projectId);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);
  res.json({ project });
});

// DELETE /api/projects/:projectId
router.delete('/:projectId', authenticate, requireProjectRole(['admin']), (req, res) => {
  // Check ownership
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);
  if (project.owner_id !== req.user.id) return res.status(403).json({ error: 'Only owner can delete' });
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.projectId);
  res.json({ message: 'Project deleted' });
});

// POST /api/projects/:projectId/members - invite by email
router.post('/:projectId/members', authenticate, requireProjectRole(['admin']), [
  body('email').isEmail().normalizeEmail(),
  body('role').optional().isIn(['admin', 'member']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, role = 'member' } = req.body;
  const user = db.prepare('SELECT id, name, email, avatar FROM users WHERE email = ?').get(email);
  if (!user) return res.status(404).json({ error: 'User not found. They must sign up first.' });

  const existing = db.prepare(
    'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?'
  ).get(req.params.projectId, user.id);
  if (existing) return res.status(409).json({ error: 'User is already a member' });

  db.prepare(
    'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)'
  ).run(req.params.projectId, user.id, role);

  res.status(201).json({ member: { ...user, role } });
});

// PUT /api/projects/:projectId/members/:userId - change role
router.put('/:projectId/members/:userId', authenticate, requireProjectRole(['admin']), [
  body('role').isIn(['admin', 'member']),
], (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);
  if (parseInt(req.params.userId) === project.owner_id) {
    return res.status(403).json({ error: "Cannot change the owner's role" });
  }
  db.prepare(
    'UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?'
  ).run(req.body.role, req.params.projectId, req.params.userId);
  res.json({ message: 'Role updated' });
});

// DELETE /api/projects/:projectId/members/:userId
router.delete('/:projectId/members/:userId', authenticate, requireProjectRole(['admin']), (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId);
  if (parseInt(req.params.userId) === project.owner_id) {
    return res.status(403).json({ error: 'Cannot remove the project owner' });
  }
  db.prepare(
    'DELETE FROM project_members WHERE project_id = ? AND user_id = ?'
  ).run(req.params.projectId, req.params.userId);
  res.json({ message: 'Member removed' });
});

module.exports = router;
