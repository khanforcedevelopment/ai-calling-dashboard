// Safe to use in the browser.
export function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Dubai', dateStyle: 'medium', timeStyle: 'short' });
}

export function fmtDuration(sec) {
  if (sec === null || sec === undefined) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const NO_ANSWER = ['customer-did-not-answer', 'customer-busy', 'voicemail'];

export const STATUS_LABELS = {
  pending: 'Waiting',
  scheduled: 'Scheduled',
  queued: 'Queued',
  ringing: 'Ringing',
  'in-progress': 'On call',
  forwarding: 'Transferring',
  ended: 'Ended',
  error: 'Error',
  cancelled: 'Cancelled',
  skipped_dnc: 'Skipped (DNC)',
};

export function statusTone(status) {
  if (['ringing', 'in-progress', 'forwarding'].includes(status)) return 'live';
  if (['pending', 'scheduled', 'queued'].includes(status)) return 'wait';
  if (status === 'ended') return 'done';
  if (status === 'error') return 'bad';
  return 'muted';
}

export function outcome(call) {
  if (call.status !== 'ended') return null;
  const intent = call.structured_data?.intent;
  if (intent === 'buy') return { label: 'Buyer', tone: 'good' };
  if (intent === 'sell') return { label: 'Seller', tone: 'good' };
  if (intent === 'call_back') return { label: 'Call back', tone: 'wait' };
  if (intent === 'not_interested') return { label: 'Not interested', tone: 'muted' };
  if (NO_ANSWER.includes(call.ended_reason)) return { label: call.ended_reason === 'voicemail' ? 'Voicemail' : 'No answer', tone: 'muted' };
  if (call.ended_reason && /error|failed|fault/i.test(call.ended_reason)) return { label: 'Failed', tone: 'bad' };
  return { label: 'Answered', tone: 'done' };
}

// Turn a list of objects into a CSV file download.
export function downloadCsv(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  if (res.status === 401 && typeof window !== 'undefined') {
    window.location.href = '/login';
    throw new Error('Please log in');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}
