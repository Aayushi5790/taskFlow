import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { Spinner, Modal, EmptyState, ProgressBar, RoleBadge } from '../components/ui';

const COLORS = [
  '#0ea5e9', '#6366f1', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'
];

function ProjectCard({ project, onDelete }) {
  const pct = project.task_count > 0
    ? Math.round((project.done_count / project.task_count) * 100) : 0;

  return (
    <div className="card p-5 hover:border-slate-700 transition-colors group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
            style={{ background: project.color }}>
            {project.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <Link to={`/projects/${project.id}`} className="font-semibold text-slate-200 hover:text-white">
              {project.name}
            </Link>
            <div className="flex items-center gap-1.5 mt-0.5">
              <RoleBadge role={project.my_role} />
            </div>
          </div>
        </div>
        {project.my_role === 'admin' && (
          <button
            onClick={() => onDelete(project)}
            className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {project.description && (
        <p className="text-sm text-slate-500 mb-4 line-clamp-2">{project.description}</p>
      )}

      <ProgressBar value={project.done_count} max={project.task_count} />
      <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
        <span>{project.done_count}/{project.task_count} tasks done</span>
        <span>{project.member_count} member{project.member_count !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}

function CreateProjectModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', color: COLORS[0] });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/projects', form);
      toast.success('Project created!');
      onCreated(res.data.project);
      onClose();
      setForm({ name: '', description: '', color: COLORS[0] });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Project">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Project Name *</label>
          <input
            className="input" type="text" placeholder="e.g. Website Redesign"
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            required autoFocus
          />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input resize-none h-20" placeholder="What's this project about?"
            value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button
                key={c} type="button"
                className={`w-8 h-8 rounded-lg transition-all ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'hover:scale-110'}`}
                style={{ background: c }}
                onClick={() => setForm({ ...form, color: c })}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={loading}>
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    api.get('/projects')
      .then(res => setProjects(res.data.projects))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async () => {
    try {
      await api.delete(`/projects/${deleteTarget.id}`);
      setProjects(prev => prev.filter(p => p.id !== deleteTarget.id));
      toast.success('Project deleted');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
    setDeleteTarget(null);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-slate-500 mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(true)}>
          <span className="text-lg leading-none">+</span> New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon="◈"
          title="No projects yet"
          description="Create your first project and start collaborating with your team"
          action={<button className="btn-primary" onClick={() => setShowCreate(true)}>Create Project</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      <CreateProjectModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={p => setProjects(prev => [p, ...prev])}
      />

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative card p-6 max-w-sm w-full animate-in">
            <h3 className="font-semibold text-white mb-2">Delete Project?</h3>
            <p className="text-slate-400 text-sm mb-6">
              This will permanently delete <strong className="text-white">{deleteTarget.name}</strong> and all its tasks.
            </p>
            <div className="flex gap-3">
              <button className="btn-secondary flex-1" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn-danger flex-1" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
