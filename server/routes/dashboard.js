const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware');

// GET /api/dashboard - global stats for the logged in user
router.get('/', authenticate, (req, res) => {
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0];

  // Tasks assigned to me
  const myTasks = db.prepare(`
    SELECT t.*, p.name as project_name, p.color as project_color,
      u.name as assignee_name, u.avatar as assignee_avatar
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    LEFT JOIN users u ON u.id = t.assignee_id
    WHERE t.assignee_id = ? AND t.status != 'done'
    ORDER BY t.due_date ASC NULLS LAST, 
      CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END
    LIMIT 10
  `).all(userId, userId);

  // Overdue tasks (due_date < today and not done)
  const overdueTasks = db.prepare(`
    SELECT t.*, p.name as project_name, p.color as project_color
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    WHERE t.due_date < ? AND t.status != 'done' AND t.assignee_id = ?
    ORDER BY t.due_date ASC
  `).all(userId, today, userId);

  // My projects with stats
  const projects = db.prepare(`
    SELECT p.*, pm.role,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as total_tasks,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as done_tasks,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'in_progress') as in_progress_tasks,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND due_date < ? AND status != 'done') as overdue_tasks,
      (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
    FROM projects p
    JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    ORDER BY p.created_at DESC
  `).all(today, userId);

  // Overall stats
  const stats = db.prepare(`
    SELECT
      COUNT(DISTINCT p.id) as total_projects,
      COUNT(DISTINCT CASE WHEN t.assignee_id = ? THEN t.id END) as my_tasks,
      COUNT(DISTINCT CASE WHEN t.assignee_id = ? AND t.status = 'done' THEN t.id END) as completed_tasks,
      COUNT(DISTINCT CASE WHEN t.assignee_id = ? AND t.due_date < ? AND t.status != 'done' THEN t.id END) as overdue_count
    FROM projects p
    JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    LEFT JOIN tasks t ON t.project_id = p.id
  `).get(userId, userId, userId, today, userId);

  // Recent activity (recently updated tasks in my projects)
  const recentActivity = db.prepare(`
    SELECT t.id, t.title, t.status, t.updated_at, p.name as project_name, p.color as project_color,
      u.name as assignee_name
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    LEFT JOIN users u ON u.id = t.assignee_id
    ORDER BY t.updated_at DESC
    LIMIT 8
  `).all(userId);

  res.json({ stats, myTasks, overdueTasks, projects, recentActivity });
});

module.exports = router;
