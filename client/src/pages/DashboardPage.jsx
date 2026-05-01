import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format, isPast, parseISO } from 'date-fns';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Spinner, StatusBadge, PriorityBadge, ProgressBar, EmptyState } from '../components/ui';

function StatCard({ icon, label, value, sub, color = 'sky' }) {
  const colors = {
    sky: 'from-sky-500/10 border-sky-500/20 text-sky-400',
    emerald: 'from-emerald-500/10 border-emerald-500/20 text-emerald-400',
    amber: 'from-amber-500/10 border-amber-500/20 text-amber-400',
    red: 'from-red-500/10 border-red-500/20 text-red-400',
  };
  return (
    <div className={`card p-5 bg-gradient-to-br ${colors[color]} border`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className={`text-3xl font-bold ${colors[color].split(' ')[2]}`}>{value}</span>
      </div>
      <div className="text-sm font-medium text-slate-300">{label}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Spinner size="lg" />
    </div>
  );

  const { stats, myTasks, overdueTasks, projects, recentActivity } = data;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
          <span className="text-sky-400">{user?.name?.split(' ')[0]}</span> 👋
        </h1>
        <p className="text-slate-500 mt-1">Here's what's happening across your projects</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="◈" label="Projects" value={stats.total_projects} color="sky" />
        <StatCard icon="✓" label="My Tasks" value={stats.my_tasks} sub="Active" color="emerald" />
        <StatCard icon="★" label="Completed" value={stats.completed_tasks} color="amber" />
        <StatCard icon="⚠" label="Overdue" value={stats.overdue_count} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overdue alert */}
          {overdueTasks.length > 0 && (
            <div className="card p-4 border-red-500/20 bg-red-500/5">
              <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                ⚠ Overdue Tasks ({overdueTasks.length})
              </h3>
              <div className="space-y-2">
                {overdueTasks.slice(0, 3).map(task => (
                  <Link
                    key={task.id}
                    to={`/projects/${task.project_id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-red-500/5 transition-colors"
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: task.project_color }}
                    />
                    <span className="text-sm text-slate-300 flex-1 truncate">{task.title}</span>
                    <span className="text-xs text-red-400 flex-shrink-0">
                      {format(parseISO(task.due_date), 'MMM d')}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* My tasks */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-200 mb-4 flex items-center justify-between">
              My Tasks
              <span className="text-xs text-slate-500 font-normal">{myTasks.length} active</span>
            </h3>
            {myTasks.length === 0 ? (
              <EmptyState icon="🎉" title="All clear!" description="No active tasks assigned to you" />
            ) : (
              <div className="space-y-2">
                {myTasks.map(task => (
                  <Link
                    key={task.id}
                    to={`/projects/${task.project_id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/60 transition-colors group"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: task.project_color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-200 truncate group-hover:text-white">{task.title}</div>
                      <div className="text-xs text-slate-500">{task.project_name}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <PriorityBadge priority={task.priority} />
                      {task.due_date && (
                        <span className={`text-xs ${isPast(parseISO(task.due_date)) ? 'text-red-400' : 'text-slate-500'}`}>
                          {format(parseISO(task.due_date), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-200 mb-4">Recent Activity</h3>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-slate-500">No recent activity</p>
            ) : (
              <div className="space-y-2">
                {recentActivity.map(t => (
                  <Link
                    key={t.id}
                    to={`/projects/${t.project_id || '#'}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.project_color }} />
                    <span className="text-sm text-slate-400 flex-1 truncate">{t.title}</span>
                    <StatusBadge status={t.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Projects sidebar */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-200 mb-4 flex items-center justify-between">
            Projects
            <Link to="/projects" className="text-xs text-sky-400 hover:text-sky-300">View all →</Link>
          </h3>
          {projects.length === 0 ? (
            <EmptyState
              icon="◈"
              title="No projects yet"
              description="Create your first project to get started"
              action={<Link to="/projects" className="btn-primary text-sm">New Project</Link>}
            />
          ) : (
            <div className="space-y-3">
              {projects.map(p => {
                const pct = p.total_tasks > 0 ? Math.round((p.done_tasks / p.total_tasks) * 100) : 0;
                return (
                  <Link
                    key={p.id}
                    to={`/projects/${p.id}`}
                    className="block p-3 rounded-xl hover:bg-slate-800/60 transition-colors -mx-1"
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.color }} />
                      <span className="text-sm font-medium text-slate-200 truncate flex-1">{p.name}</span>
                      {p.overdue_tasks > 0 && (
                        <span className="text-xs text-red-400">{p.overdue_tasks} overdue</span>
                      )}
                    </div>
                    <ProgressBar value={p.done_tasks} max={p.total_tasks} />
                    <div className="flex justify-between text-xs text-slate-500 mt-1.5">
                      <span>{p.done_tasks}/{p.total_tasks} done</span>
                      <span>{pct}%</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
