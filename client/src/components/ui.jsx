import { useState } from 'react';

// ── Modal ──────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={`relative w-full ${sizes[size]} card p-6 animate-in shadow-2xl`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Status Badge ───────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const labels = { todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };
  const icons = {
    todo: '○', in_progress: '◑', review: '◕', done: '●'
  };
  return (
    <span className={`badge status-${status}`}>
      {icons[status]} {labels[status]}
    </span>
  );
}

// ── Priority Badge ─────────────────────────────────────────────────────────
export function PriorityBadge({ priority }) {
  const labels = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' };
  const icons = { low: '↓', medium: '→', high: '↑', urgent: '⚡' };
  return (
    <span className={`badge priority-${priority}`}>
      {icons[priority]} {labels[priority]}
    </span>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────────
export function Avatar({ name, avatar, size = 'sm' }) {
  const sizes = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-base', lg: 'w-12 h-12 text-lg' };
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const colors = ['bg-sky-600', 'bg-violet-600', 'bg-emerald-600', 'bg-amber-600', 'bg-pink-600'];
  const color = colors[name?.charCodeAt(0) % colors.length] || 'bg-slate-600';

  if (avatar && avatar.startsWith('http')) {
    return <img src={avatar} alt={name} className={`${sizes[size]} rounded-full object-cover`} />;
  }
  return (
    <div className={`${sizes[size]} ${color} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0`}>
      {initials}
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-slate-300 mb-2">{title}</h3>
      <p className="text-slate-500 text-sm mb-6 max-w-xs">{description}</p>
      {action}
    </div>
  );
}

// ── Spinner ────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };
  return (
    <div className={`${sizes[size]} border-2 border-slate-700 border-t-sky-500 rounded-full animate-spin`} />
  );
}

// ── Confirm Dialog ─────────────────────────────────────────────────────────
export function ConfirmDialog({ open, onClose, onConfirm, title, message, danger = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-slate-400 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button
          className={danger ? 'btn-danger' : 'btn-primary'}
          onClick={() => { onConfirm(); onClose(); }}
        >
          Confirm
        </button>
      </div>
    </Modal>
  );
}

// ── Select ─────────────────────────────────────────────────────────────────
export function Select({ value, onChange, options, placeholder, className = '' }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`input ${className}`}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

// ── Progress Bar ───────────────────────────────────────────────────────────
export function ProgressBar({ value, max, color = 'sky' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const colors = { sky: 'bg-sky-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500' };
  return (
    <div className="w-full bg-slate-800 rounded-full h-1.5">
      <div
        className={`${colors[color]} h-1.5 rounded-full transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Role Badge ─────────────────────────────────────────────────────────────
export function RoleBadge({ role }) {
  return (
    <span className={`badge ${role === 'admin' ? 'bg-violet-500/15 text-violet-400' : 'bg-slate-700/50 text-slate-400'}`}>
      {role === 'admin' ? '👑 Admin' : '👤 Member'}
    </span>
  );
}
