'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, fmtTime } from '@/lib/format';
import ScriptSelect from './components/ScriptSelect';

function Stat({ label, value }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">{value ?? '—'}</div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [qc, setQc] = useState({ name: '', number: '', scriptId: null });
  const [qcMsg, setQcMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      await api('/api/sync', { method: 'POST' }).catch(() => {});
      setStats(await api('/api/stats'));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  async function quickCall(e) {
    e.preventDefault();
    setBusy(true);
    setQcMsg(null);
    try {
      const { id } = await api('/api/quick-call', { method: 'POST', body: JSON.stringify(qc) });
      setQcMsg({ type: 'ok', text: 'Call started.', id });
      setQc({ ...qc, name: '', number: '' });
      load();
    } catch (err) {
      setQcMsg({ type: 'error', text: err.message });
    }
    setBusy(false);
  }

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <div>
          <h1>Dashboard</h1>
          <p className="sub" style={{ margin: 0 }}>Overview of all AI calls.</p>
        </div>
        <div className="spacer" />
        <Link href="/campaigns/new" className="btn">
          + New campaign
        </Link>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="grid stats">
        <Stat label="Calls placed" value={stats?.placed} />
        <Stat label="Connected (15s+)" value={stats?.connected} />
        <Stat label="No answer" value={stats?.noAnswer} />
        <Stat label="Buyers" value={stats?.buyers} />
        <Stat label="Sellers" value={stats?.sellers} />
        <Stat label="In progress / waiting" value={stats?.pending} />
      </div>

      <div className="grid two">
        <form className="card" onSubmit={quickCall}>
          <h2>Quick call</h2>
          {qcMsg && (
            <div className={`alert ${qcMsg.type}`}>
              {qcMsg.text} {qcMsg.id && <Link href={`/campaigns/${qcMsg.id}`}>View call</Link>}
            </div>
          )}
          <div className="field">
            <label htmlFor="qn">Name</label>
            <input id="qn" type="text" value={qc.name} onChange={(e) => setQc({ ...qc, name: e.target.value })} placeholder="Ahmed" />
          </div>
          <div className="field">
            <label htmlFor="qp">Phone number</label>
            <input id="qp" type="tel" value={qc.number} onChange={(e) => setQc({ ...qc, number: e.target.value })} placeholder="0501234567 or +971501234567" />
          </div>
          <ScriptSelect value={qc.scriptId} onChange={(scriptId) => setQc({ ...qc, scriptId })} />
          <button className="btn" disabled={busy || !qc.number}>
            {busy ? 'Calling…' : 'Call now'}
          </button>
        </form>

        <div className="card">
          <h2>Recent campaigns</h2>
          {!stats?.campaigns?.length ? (
            <div className="empty">No campaigns yet.</div>
          ) : (
            <table>
              <tbody>
                {stats.campaigns.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/campaigns/${c.id}`}>{c.name}</Link>
                      {c.cancelled && <span className="badge muted" style={{ marginLeft: 6 }}>Cancelled</span>}
                    </td>
                    <td className="num">{c.total} contacts</td>
                    <td className="num">{fmtTime(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
