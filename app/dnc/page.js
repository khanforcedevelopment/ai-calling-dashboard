'use client';

import { useEffect, useState } from 'react';
import Papa from 'papaparse';
import { api, fmtTime } from '@/lib/format';

export default function DncPage() {
  const [numbers, setNumbers] = useState([]);
  const [input, setInput] = useState('');
  const [msg, setMsg] = useState(null);

  async function load() {
    try {
      const d = await api('/api/dnc');
      setNumbers(d.numbers);
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function add(list, reason) {
    try {
      const r = await api('/api/dnc', { method: 'POST', body: JSON.stringify({ numbers: list, reason }) });
      setMsg({ type: 'ok', text: `Added ${r.added} number(s).` });
      setInput('');
      load();
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (res) => {
        const all = res.data.flat().map((v) => String(v).trim()).filter((v) => /\d{7,}/.test(v.replace(/\D/g, '')));
        if (!all.length) return setMsg({ type: 'error', text: 'No phone numbers found in the file.' });
        add(all, `Imported from ${file.name}`);
      },
    });
    e.target.value = '';
  }

  async function remove(number) {
    try {
      await api(`/api/dnc?number=${encodeURIComponent(number)}`, { method: 'DELETE' });
      load();
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }

  return (
    <>
      <h1>Do not call</h1>
      <p className="sub">These numbers are always skipped. People who ask the AI not to call again are added automatically.</p>
      {msg && <div className={`alert ${msg.type}`}>{msg.text}</div>}

      <div className="grid two">
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            const list = input.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
            if (list.length) add(list, 'Added manually');
          }}
        >
          <h2>Add numbers</h2>
          <div className="field">
            <label htmlFor="dn">Numbers (one per line)</label>
            <textarea id="dn" value={input} onChange={(e) => setInput(e.target.value)} placeholder={'0501234567\n+971521234567'} />
          </div>
          <button className="btn" disabled={!input.trim()}>Add</button>
        </form>
        <div className="card">
          <h2>Import a list</h2>
          <div className="field">
            <label htmlFor="df">CSV file</label>
            <input id="df" type="file" accept=".csv,text/csv" onChange={onFile} />
            <div className="hint">Any column containing phone numbers is picked up, e.g. a DNCR export.</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>{numbers.length} numbers</h2>
        {!numbers.length ? (
          <div className="empty">The list is empty.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Number</th><th>Reason</th><th>Added</th><th></th></tr>
              </thead>
              <tbody>
                {numbers.map((n) => (
                  <tr key={n.number}>
                    <td className="num">{n.number}</td>
                    <td>{n.reason || '—'}</td>
                    <td className="num">{fmtTime(n.created_at)}</td>
                    <td><button className="btn ghost small" onClick={() => remove(n.number)}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
