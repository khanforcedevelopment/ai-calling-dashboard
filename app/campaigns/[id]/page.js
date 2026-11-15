'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, fmtTime, downloadCsv, STATUS_LABELS } from '@/lib/format';
import CallTable from '../../components/CallTable';

const ACTIVE = ['pending', 'scheduled', 'queued', 'ringing', 'in-progress', 'forwarding'];

export default function CampaignPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const dispatchingRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const d = await api(`/api/campaigns/${id}`);
      setData(d);
      setError('');
      return d;
    } catch (e) {
      setError(e.message);
      return null;
    }
  }, [id]);

  // Send pending calls in small batches.
  const dispatch = useCallback(async () => {
    if (dispatchingRef.current) return;
    dispatchingRef.current = true;
    setDispatching(true);
    try {
      for (let i = 0; i < 1000; i++) {
        const r = await api(`/api/campaigns/${id}/dispatch`, { method: 'POST' });
        await load();
        if (!r.remaining || !r.processed) break;
      }
    } catch (e) {
      setError(e.message);
    }
    dispatchingRef.current = false;
    setDispatching(false);
  }, [id, load]);

  useEffect(() => {
    let stop = false;
    (async () => {
      const d = await load();
      if (d && !d.campaign.cancelled && d.counts.pending) dispatch();
    })();
    const t = setInterval(async () => {
      if (stop) return;
      await api(`/api/sync?campaignId=${id}`, { method: 'POST' }).catch(() => {});
      load();
    }, 15000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [id, load, dispatch]);

  async function refresh() {
    await api(`/api/sync?campaignId=${id}`, { method: 'POST' }).catch(() => {});
    load();
  }

  async function cancel() {
    if (!window.confirm || !window.confirm('Cancel all calls that have not started yet?')) return;
    try {
      await api(`/api/campaigns/${id}/cancel`, { method: 'POST' });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  function exportCsv() {
    downloadCsv(`${data.campaign.name}.csv`, data.calls.map((c) => ({
      name: c.customer_name || '',
      number: c.customer_number,
      status: c.status,
      intent: c.structured_data?.intent || '',
      ended_reason: c.ended_reason || '',
      started_at: c.started_at || '',
      duration_seconds: c.duration_seconds ?? '',
      summary: c.summary || '',
      details: c.structured_data ? JSON.stringify(c.structured_data) : '',
      recording: c.recording_url ? `${window.location.origin}/api/recording/${c.id}` : '',
    })));
  }

  if (!data) return error ? <div className="alert error">{error}</div> : <div className="empty">Loading…</div>;

  const { campaign, calls, counts } = data;
  const total = calls.length;
  const done = calls.filter((c) => !ACTIVE.includes(c.status)).length;
  const active = calls.some((c) => ACTIVE.includes(c.status));

  return (
    <>
      <div className="row" style={{ marginBottom: 6 }}>
        <div>
          <Link href="/">← Dashboard</Link>
          <h1 style={{ marginTop: 6 }}>{campaign.name}</h1>
          <p className="sub" style={{ margin: 0 }}>
            Created {fmtTime(campaign.created_at)}
            {campaign.scheduled_at && <> · Scheduled for {fmtTime(campaign.scheduled_at)}</>}
            {campaign.cancelled && <> · <span className="badge muted">Cancelled</span></>}
          </p>
        </div>
        <div className="spacer" />
        <button className="btn ghost small" onClick={refresh}>Refresh</button>
        <button className="btn ghost small" onClick={exportCsv} disabled={!total}>Export CSV</button>
        {active && !campaign.cancelled && (
          <button className="btn danger small" onClick={cancel}>Cancel campaign</button>
        )}
      </div>

      {error && <div className="alert error" style={{ marginTop: 12 }}>{error}</div>}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="row" style={{ marginBottom: 8 }}>
          <b>{done} / {total} finished</b>
          {dispatching && <span className="badge live">Starting calls… keep this page open</span>}
          <div className="spacer" />
          {Object.entries(counts).map(([s, n]) => (
            <span key={s} className="badge muted">{STATUS_LABELS[s] || s}: {n}</span>
          ))}
        </div>
        <div className="progress"><div style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
      </div>

      <div className="card">
        <CallTable calls={calls} onRefresh={load} />
      </div>
    </>
  );
}
