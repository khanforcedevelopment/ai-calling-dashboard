'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, STATUS_LABELS } from '@/lib/format';
import CallTable from '../components/CallTable';

export default function CallsPage() {
  const [calls, setCalls] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const size = 50;

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (status) params.set('status', status);
      if (search) params.set('q', search);
      const d = await api(`/api/calls?${params}`);
      setCalls(d.calls);
      setTotal(d.total);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [page, status, search]);

  useEffect(() => {
    load();
  }, [load]);

  async function refresh() {
    await api('/api/sync', { method: 'POST' }).catch(() => {});
    load();
  }

  const pages = Math.max(1, Math.ceil(total / size));

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <div>
          <h1>Call logs</h1>
          <p className="sub" style={{ margin: 0 }}>Click a call to see the recording, transcript and details.</p>
        </div>
        <div className="spacer" />
        <button className="btn ghost small" onClick={refresh}>Refresh</button>
      </div>
      {error && <div className="alert error">{error}</div>}

      <div className="card">
        <form
          className="row"
          style={{ marginBottom: 12 }}
          onSubmit={(e) => {
            e.preventDefault();
            setPage(0);
            setSearch(q.trim());
          }}
        >
          <input type="text" placeholder="Search name or number" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 280 }} />
          <select value={status} onChange={(e) => { setPage(0); setStatus(e.target.value); }} style={{ maxWidth: 200 }}>
            <option value="">All statuses</option>
            {['scheduled', 'queued', 'ringing', 'in-progress', 'ended', 'error', 'cancelled'].map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <button className="btn small">Search</button>
          <div className="spacer" />
          <span className="hint">{total} calls</span>
        </form>

        <CallTable calls={calls} showCampaign />

        {pages > 1 && (
          <div className="row" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
            <button className="btn ghost small" disabled={page === 0} onClick={() => setPage(page - 1)}>← Prev</button>
            <span className="hint">Page {page + 1} of {pages}</span>
            <button className="btn ghost small" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next →</button>
          </div>
        )}
      </div>
    </>
  );
}
