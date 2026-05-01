import { useState, useEffect } from 'react';
import { format, parseISO, isPast } from 'date-fns';
import api from '../api';
import toast from 'react-hot-toast';
import { StatusBadge, PriorityBadge, Avatar, Spinner } from './ui';
import { useAuth } from '../context/AuthContext';

export default function TaskDetail({ taskId, projectId, onClose, onUpdated, onDeleted, onEdit, projectRole }) {
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!taskId) return;
    setLoading(true);
    api.get(`/projects/${projectId}/tasks/${taskId}`)
      .then(res => { setTask(res.data.task); setComments(res.data.comments); })
      .finally(() => setLoading(false));
  }, [taskId, projectId]);

  const handleStatusChange = async (status) => {
    try {
      const res = await api.put(`/projects/${projectId}/tasks/${taskId}`, { status });
      setTask(res.data.task);
      onUpdated(res.data.task);
    } catch { toast.error('Failed to update status'); }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/projects/${projectId}/tasks/${taskId}/comments`, { content: comment });
      setComments(prev => [...prev, res.data.comment]);
      setComment('');
    } catch { toast.error('Failed to add comment'); }
    finally { setSubmitting(false); }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/projects/${projectId}/tasks/${taskId}/comments/${commentId}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch { toast.error('Failed to delete comment'); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/projects/${projectId}/tasks/${taskId}`);
      toast.success('Task deleted');
      onDeleted(taskId);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete');
    }
  };

  const STATUS_OPTIONS = ['todo', 'in_progress', 'review', 'done'];

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative ml-auto w-full max-w-xl bg-slate-900 border-l border-slate-800 flex flex-col h-full overflow-hidden animate-in"
        onClick={e => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex items-center justify-center flex-1"><Spinner /></div>
        ) : !task ? (
          <div className="flex items-center justify-center flex-1 text-slate-500">Task not found</div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-800 flex-shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-white leading-snug">{task.title}</h2>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <StatusBadge status={task.status} />
                    <PriorityBadge priority={task.priority} />
                  </div>
                </div>
                <button onClick={onClose} className="text-slate-500 hover:text-slate-300 flex-shrink-0 p-1">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Description */}
              {task.description && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Description</h4>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{task.description}</p>
                </div>
              )}

              {/* Meta */}
              <div className="grid grid-cols-2 gap-4">
                {task.assignee_name && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Assignee</h4>
                    <div className="flex items-center gap-2">
                      <Avatar name={task.assignee_name} avatar={task.assignee_avatar} size="xs" />
                      <span className="text-sm text-slate-300">{task.assignee_name}</span>
                    </div>
                  </div>
                )}
                {task.due_date && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Due Date</h4>
                    <span className={`text-sm ${isPast(parseISO(task.due_date)) && task.status !== 'done' ? 'text-red-400' : 'text-slate-300'}`}>
                      {format(parseISO(task.due_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Created by</h4>
                  <span className="text-sm text-slate-300">{task.creator_name}</span>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Created</h4>
                  <span className="text-sm text-slate-300">{format(parseISO(task.created_at), 'MMM d, yyyy')}</span>
                </div>
              </div>

              {/* Status change */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Move to</h4>
                <div className="flex gap-2 flex-wrap">
                  {STATUS_OPTIONS.filter(s => s !== task.status).map(s => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comments */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Comments ({comments.length})
                </h4>
                <div className="space-y-3">
                  {comments.map(c => (
                    <div key={c.id} className="flex gap-3 group">
                      <Avatar name={c.user_name} avatar={c.user_avatar} size="xs" />
                      <div className="flex-1 bg-slate-800 rounded-xl px-4 py-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-slate-300">{c.user_name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-600">{format(parseISO(c.created_at), 'MMM d, HH:mm')}</span>
                            {(c.user_id === user.id || projectRole === 'admin') && (
                              <button
                                onClick={() => handleDeleteComment(c.id)}
                                className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-slate-300">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Comment input */}
                <form onSubmit={handleComment} className="flex gap-2 mt-3">
                  <Avatar name={user.name} avatar={user.avatar} size="xs" />
                  <div className="flex-1 flex gap-2">
                    <input
                      className="input flex-1 text-sm py-2"
                      placeholder="Add a comment..."
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                    />
                    <button type="submit" className="btn-primary px-3 text-sm" disabled={submitting || !comment.trim()}>
                      {submitting ? '...' : 'Post'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-slate-800 flex justify-between flex-shrink-0">
              <button onClick={handleDelete} className="btn-danger text-sm px-3 py-1.5">
                Delete Task
              </button>
              <button onClick={onEdit} className="btn-secondary text-sm px-3 py-1.5">
                Edit Task
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
