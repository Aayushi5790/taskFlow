import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format, parseISO, isPast } from 'date-fns';
import api from '../api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Spinner, StatusBadge, PriorityBadge, Avatar, RoleBadge, Modal, EmptyState } from '../components/ui';
import TaskModal from '../components/TaskModal';
import TaskDetail from '../components/TaskDetail';

const COLUMNS = [
  { key: 'todo', label: 'To Do', icon: '○' },
  { key: 'in_progress', label: 'In Progress', icon: '◑' },
  { key: 'review', label: 'Review', icon: '◕' },
  { key: 'done', label: 'Done', icon: '●' },
];

function TaskCard({ task, onClick }) {
  const overdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
  return (
    <div
      onClick={() => onClick(task.id)}
      className="card p-3.5 cursor-pointer hover:border-slate-600 transition-all hover:shadow-lg hover:shadow-black/20 active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm text-slate-200 leading-snug font-medium">{task.title}</p>
        <PriorityBadge priority={task.priority} />
      </div>
      {task.description && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{task.description}</p>
      )}
      <div className="flex items-center justify-between">
        {task.assignee_name ? (
          <div className="flex items-center gap-1.5">
            <Avatar name={task.assignee_name} avatar={task.assignee_avatar} size="xs" />
            <span className="text-xs text-slate-500">{task.assignee_name.split(' ')[0]}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-600">Unassigned</span>
        )}
        {task.due_date && (
          <span className={`text-xs ${overdue ? 'text-red-400 font-medium' : 'text-slate-500'}`}>
            {overdue ? '⚠ ' : ''}{format(parseISO(task.due_date), 'MMM d')}
          </span>
        )}
      </div>
    </div>
  );
}

function MembersModal({ open, onClose, members, projectId, projectRole, ownerId, onMembersChange }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post(`/projects/${projectId}/members`, { email, role });
      onMembersChange([...members, res.data.member]);
      toast.success('Member added!');
      setEmail('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add member');
    } finally { setLoading(false); }
  };

  const handleRemove = async (memberId) => {
    try {
      await api.delete(`/projects/${projectId}/members/${memberId}`);
      onMembersChange(members.filter(m => m.id !== memberId));
      toast.success('Member removed');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to remove'); }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await api.put(`/projects/${projectId}/members/${memberId}`, { role: newRole });
      onMembersChange(members.map(m => m.id === memberId ? { ...m, role: newRole } : m));
      toast.success('Role updated');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update role'); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Team Members" size="lg">
      {projectRole === 'admin' && (
        <form onSubmit={handleInvite} className="flex gap-2 mb-6">
          <input
            className="input flex-1" type="email" placeholder="member@email.com"
            value={email} onChange={e => setEmail(e.target.value)} required
          />
          <select className="input w-28" value={role} onChange={e => setRole(e.target.value)}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className="btn-primary px-4 flex-shrink-0" disabled={loading}>
            {loading ? '...' : 'Invite'}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {members.map(m => (
          <div key={m.id} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
            <Avatar name={m.name} avatar={m.avatar} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-200">{m.name}</span>
                {m.id === ownerId && <span className="text-xs text-amber-400">Owner</span>}
                {m.id === user.id && <span className="text-xs text-sky-400">You</span>}
              </div>
              <div className="text-xs text-slate-500">{m.email}</div>
            </div>
            <div className="flex items-center gap-2">
              {projectRole === 'admin' && m.id !== ownerId && m.id !== user.id ? (
                <>
                  <select
                    className="text-xs bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-300"
                    value={m.role}
                    onChange={e => handleRoleChange(m.id, e.target.value)}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={() => handleRemove(m.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors p-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </>
              ) : (
                <RoleBadge role={m.role} />
              )}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [showMembers, setShowMembers] = useState(false);
  const [filter, setFilter] = useState({ priority: '', assignee: '' });

  const fetchData = async () => {
    try {
      const [projRes, tasksRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/tasks`),
      ]);
      setProject(projRes.data.project);
      setMembers(projRes.data.members);
      setTasks(tasksRes.data.tasks);
    } catch {
      toast.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [projectId]);

  const filteredTasks = tasks.filter(t => {
    if (filter.priority && t.priority !== filter.priority) return false;
    if (filter.assignee && String(t.assignee_id) !== filter.assignee) return false;
    return true;
  });

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.key] = filteredTasks.filter(t => t.status === col.key);
    return acc;
  }, {});

  const handleTaskSaved = (savedTask, isEdit) => {
    if (isEdit) {
      setTasks(prev => prev.map(t => t.id === savedTask.id ? savedTask : t));
    } else {
      setTasks(prev => [savedTask, ...prev]);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>;
  if (!project) return <div className="flex items-center justify-center h-full text-slate-500">Project not found</div>;

  const myRole = project.my_role;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-5 border-b border-slate-800/60 flex-shrink-0">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
          <Link to="/projects" className="hover:text-slate-300 transition-colors">Projects</Link>
          <span>/</span>
          <span className="text-slate-300">{project.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
              style={{ background: project.color }}>
              {project.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{project.name}</h1>
              {project.description && <p className="text-sm text-slate-500">{project.description}</p>}
            </div>
            <RoleBadge role={myRole} />
          </div>

          <div className="flex items-center gap-2">
            {/* Member avatars */}
            <button
              onClick={() => setShowMembers(true)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <div className="flex -space-x-2">
                {members.slice(0, 3).map(m => (
                  <Avatar key={m.id} name={m.name} avatar={m.avatar} size="xs" />
                ))}
              </div>
              <span className="text-sm text-slate-400">{members.length}</span>
            </button>

            <button
              onClick={() => setShowCreateTask(true)}
              className="btn-primary flex items-center gap-2"
            >
              <span className="text-lg leading-none">+</span> Add Task
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mt-4">
          <span className="text-xs text-slate-500">Filter:</span>
          <select
            className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-300"
            value={filter.priority}
            onChange={e => setFilter(prev => ({ ...prev, priority: e.target.value }))}
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <select
            className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-300"
            value={filter.assignee}
            onChange={e => setFilter(prev => ({ ...prev, assignee: e.target.value }))}
          >
            <option value="">All Members</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          {(filter.priority || filter.assignee) && (
            <button
              onClick={() => setFilter({ priority: '', assignee: '' })}
              className="text-xs text-sky-400 hover:text-sky-300"
            >
              Clear filters
            </button>
          )}
          <span className="text-xs text-slate-600 ml-auto">{filteredTasks.length} tasks</span>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto px-8 py-6">
        <div className="flex gap-5 h-full min-w-max">
          {COLUMNS.map(col => (
            <div key={col.key} className="w-72 flex flex-col">
              {/* Column header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">{col.icon}</span>
                  <span className="text-sm font-semibold text-slate-300">{col.label}</span>
                  <span className="bg-slate-800 text-slate-500 text-xs px-2 py-0.5 rounded-full">
                    {tasksByStatus[col.key].length}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowCreateTask(true);
                    // Pre-select status via a flag — handled in modal defaults
                  }}
                  className="text-slate-600 hover:text-slate-400 p-1 transition-colors"
                  title="Add task"
                >
                  +
                </button>
              </div>

              {/* Tasks */}
              <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
                {tasksByStatus[col.key].length === 0 ? (
                  <div className="text-center py-8 text-slate-700 text-sm border border-dashed border-slate-800 rounded-xl">
                    No tasks
                  </div>
                ) : (
                  tasksByStatus[col.key].map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={setSelectedTaskId}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <TaskModal
        open={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        projectId={projectId}
        members={members}
        onSaved={handleTaskSaved}
      />

      {editTask && (
        <TaskModal
          open={true}
          onClose={() => setEditTask(null)}
          projectId={projectId}
          members={members}
          task={editTask}
          onSaved={(saved) => {
            handleTaskSaved(saved, true);
            setEditTask(null);
          }}
        />
      )}

      {selectedTaskId && (
        <TaskDetail
          taskId={selectedTaskId}
          projectId={projectId}
          onClose={() => setSelectedTaskId(null)}
          onUpdated={(updated) => setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))}
          onDeleted={(id) => setTasks(prev => prev.filter(t => t.id !== id))}
          onEdit={() => {
            const task = tasks.find(t => t.id === selectedTaskId);
            setEditTask(task);
            setSelectedTaskId(null);
          }}
          projectRole={myRole}
        />
      )}

      <MembersModal
        open={showMembers}
        onClose={() => setShowMembers(false)}
        members={members}
        projectId={projectId}
        projectRole={myRole}
        ownerId={project.owner_id}
        onMembersChange={setMembers}
      />
    </div>
  );
}
