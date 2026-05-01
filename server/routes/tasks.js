const router = require('express').Router({ mergeParams: true });
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticate, requireProjectRole } = require('../middleware');

// GET /api/projects/:projectId/tasks
router.get('/', authenticate, requireProjectRole(), (req, res) => {
  const { status, priority, assignee } = req.query;
  let query = `
    SELECT t.*, 
      u.name as assignee_name, u.avatar as assignee_avatar,
      c.name as creator_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assignee_id
    LEFT JOIN users c ON c.id = t.created_by
    WHERE t.project_id = ?
  `;
  const params = [req.params.projectId];

  if (status) { query += ' AND t.status = ?'; params.push(status); }
  if (priority) { query += ' AND t.priority = ?'; params.push(priority); }
  if (assignee) { query += ' AND t.assignee_id = ?'; params.push(assignee); }

  query += " ORDER BY CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, t.due_date ASC NULLS LAST, t.created_at DESC";

  const tasks = db.prepare(query).all(...params);
  res.json({ tasks });
});

// POST /api/projects/:projectId/tasks
router.post('/', authenticate, requireProjectRole(), [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('description').optional().trim(),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('assignee_id').optional().isInt(),
  body('due_date').optional().isISO8601(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, status, priority, assignee_id, due_date } = req.body;

  // Validate assignee is project member
  if (assignee_id) {
    const isMember = db.prepare(
      'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?'
    ).get(req.params.projectId, assignee_id);
    if (!isMember) return res.status(400).json({ error: 'Assignee must be a project member' });
  }

  const result = db.prepare(`
    INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, created_by, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.params.projectId,
    title,
    description || '',
    status || 'todo',
    priority || 'medium',
    assignee_id || null,
    req.user.id,
    due_date || null
  );

  const task = db.prepare(`
    SELECT t.*, u.name as assignee_name, u.avatar as assignee_avatar, c.name as creator_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assignee_id
    LEFT JOIN users c ON c.id = t.created_by
    WHERE t.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ task });
});

// GET /api/projects/:projectId/tasks/:taskId
router.get('/:taskId', authenticate, requireProjectRole(), (req, res) => {
  const task = db.prepare(`
    SELECT t.*, u.name as assignee_name, u.avatar as assignee_avatar, c.name as creator_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assignee_id
    LEFT JOIN users c ON c.id = t.created_by
    WHERE t.id = ? AND t.project_id = ?
  `).get(req.params.taskId, req.params.projectId);

  if (!task) return res.status(404).json({ error: 'Task not found' });

  const comments = db.prepare(`
    SELECT cm.*, u.name as user_name, u.avatar as user_avatar
    FROM comments cm
    JOIN users u ON u.id = cm.user_id
    WHERE cm.task_id = ?
    ORDER BY cm.created_at ASC
  `).all(req.params.taskId);

  res.json({ task, comments });
});

// PUT /api/projects/:projectId/tasks/:taskId
router.put('/:taskId', authenticate, requireProjectRole(), [
  body('title').optional().trim().notEmpty(),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('assignee_id').optional({ nullable: true }).isInt(),
  body('due_date').optional({ nullable: true }).isISO8601(),
], (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?')
    .get(req.params.taskId, req.params.projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // Members can only update status/assignee, admins can update everything
  const { title, description, status, priority, assignee_id, due_date } = req.body;

  if (assignee_id !== undefined && assignee_id !== null) {
    const isMember = db.prepare(
      'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?'
    ).get(req.params.projectId, assignee_id);
    if (!isMember) return res.status(400).json({ error: 'Assignee must be a project member' });
  }

  db.prepare(`
    UPDATE tasks SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      status = COALESCE(?, status),
      priority = COALESCE(?, priority),
      assignee_id = CASE WHEN ? IS NOT NULL THEN ? ELSE assignee_id END,
      due_date = CASE WHEN ? IS NOT NULL THEN ? ELSE due_date END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title || null, description !== undefined ? description : null,
    status || null, priority || null,
    assignee_id !== undefined ? assignee_id : null, assignee_id !== undefined ? assignee_id : null,
    due_date !== undefined ? due_date : null, due_date !== undefined ? due_date : null,
    req.params.taskId
  );

  const updated = db.prepare(`
    SELECT t.*, u.name as assignee_name, u.avatar as assignee_avatar, c.name as creator_name
    FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id LEFT JOIN users c ON c.id = t.created_by
    WHERE t.id = ?
  `).get(req.params.taskId);

  res.json({ task: updated });
});

// DELETE /api/projects/:projectId/tasks/:taskId
router.delete('/:taskId', authenticate, requireProjectRole(), (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?')
    .get(req.params.taskId, req.params.projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // Only admin or creator can delete
  if (req.projectRole !== 'admin' && task.created_by !== req.user.id) {
    return res.status(403).json({ error: 'Only admins or task creator can delete' });
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.taskId);
  res.json({ message: 'Task deleted' });
});

// POST /api/projects/:projectId/tasks/:taskId/comments
router.post('/:taskId/comments', authenticate, requireProjectRole(), [
  body('content').trim().notEmpty().withMessage('Comment cannot be empty'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND project_id = ?')
    .get(req.params.taskId, req.params.projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const result = db.prepare(
    'INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)'
  ).run(req.params.taskId, req.user.id, req.body.content);

  const comment = db.prepare(`
    SELECT cm.*, u.name as user_name, u.avatar as user_avatar
    FROM comments cm JOIN users u ON u.id = cm.user_id WHERE cm.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ comment });
});

// DELETE /api/projects/:projectId/tasks/:taskId/comments/:commentId
router.delete('/:taskId/comments/:commentId', authenticate, requireProjectRole(), (req, res) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  if (comment.user_id !== req.user.id && req.projectRole !== 'admin') {
    return res.status(403).json({ error: 'Cannot delete others comments' });
  }
  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.commentId);
  res.json({ message: 'Comment deleted' });
});

module.exports = router;
