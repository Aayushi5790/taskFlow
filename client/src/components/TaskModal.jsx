import { useState, useEffect } from 'react';
import { Modal, Select } from '../components/ui';
import api from '../api';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: 'todo', label: '○ To Do' },
  { value: 'in_progress', label: '◑ In Progress' },
  { value: 'review', label: '◕ Review' },
  { value: 'done', label: '● Done' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: '↓ Low' },
  { value: 'medium', label: '→ Medium' },
  { value: 'high', label: '↑ High' },
  { value: 'urgent', label: '⚡ Urgent' },
];

export default function TaskModal({ open, onClose, projectId, members, task, onSaved }) {
  const isEdit = !!task;
  const [form, setForm] = useState({
    title: '', description: '', status: 'todo', priority: 'medium',
    assignee_id: '', due_date: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        assignee_id: task.assignee_id || '',
        due_date: task.due_date ? task.due_date.split('T')[0] : '',
      });
    } else {
      setForm({ title: '', description: '', status: 'todo', priority: 'medium', assignee_id: '', due_date: '' });
    }
  }, [task, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      ...form,
      assignee_id: form.assignee_id ? parseInt(form.assignee_id) : null,
      due_date: form.due_date || null,
    };

    try {
      let res;
      if (isEdit) {
        res = await api.put(`/projects/${projectId}/tasks/${task.id}`, payload);
        toast.success('Task updated');
      } else {
        res = await api.post(`/projects/${projectId}/tasks`, payload);
        toast.success('Task created');
      }
      onSaved(res.data.task, isEdit);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  const memberOptions = members.map(m => ({ value: String(m.id), label: m.name }));

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Task' : 'New Task'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Task Title *</label>
          <input
            className="input" type="text" placeholder="What needs to be done?"
            value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            required autoFocus
          />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input resize-none h-24" placeholder="Add more details..."
            value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Status</label>
            <Select
              value={form.status}
              onChange={v => setForm({ ...form, status: v })}
              options={STATUS_OPTIONS}
            />
          </div>
          <div>
            <label className="label">Priority</label>
            <Select
              value={form.priority}
              onChange={v => setForm({ ...form, priority: v })}
              options={PRIORITY_OPTIONS}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Assignee</label>
            <Select
              value={form.assignee_id}
              onChange={v => setForm({ ...form, assignee_id: v })}
              options={memberOptions}
              placeholder="Unassigned"
            />
          </div>
          <div>
            <label className="label">Due Date</label>
            <input
              className="input" type="date"
              value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })}
            />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={loading}>
            {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
