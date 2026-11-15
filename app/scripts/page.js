'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, fmtTime } from '@/lib/format';

export default function ScriptsPage() {
  const [scripts, setScripts] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/scripts')
      .then((d) => setScripts(d.scripts))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <div>
          <h1>Scripts</h1>
          <p className="sub" style={{ margin: 0 }}>What the AI says: the first message and the instructions (system prompt).</p>
        </div>
        <div className="spacer" />
        <Link href="/scripts/new" className="btn">+ New script</Link>
      </div>
      {error && <div className="alert error">{error}</div>}

      <div className="card">
        {!scripts ? (
          <div className="empty">Loading…</div>
        ) : !scripts.length ? (
          <div className="empty">No scripts yet. Calls will use the default script.</div>
        ) : (
          <table>
            <thead>
              <tr><th>Name</th><th>First message</th><th>Updated</th></tr>
            </thead>
            <tbody>
              {scripts.map((s) => (
                <tr key={s.id}>
                  <td><Link href={`/scripts/${s.id}`}>{s.name}</Link></td>
                  <td style={{ color: 'var(--muted)' }}>{(s.first_message || '').slice(0, 90)}{s.first_message?.length > 90 ? '…' : ''}</td>
                  <td className="num">{fmtTime(s.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
