'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { api, downloadCsv } from '@/lib/format';
import { normalizeNumber } from '@/lib/phone';
import ScriptSelect from '../../components/ScriptSelect';

function guess(headers, pattern) {
  return headers.find((h) => pattern.test(h)) || '';
}

export default function NewCampaign() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [nameCol, setNameCol] = useState('');
  const [phoneCol, setPhoneCol] = useState('');
  const [fileName, setFileName] = useState('');
  const [mode, setMode] = useState('now');
  const [when, setWhen] = useState('');
  const [scriptId, setScriptId] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setFileName(file.name);
    if (!name) setName(file.name.replace(/\.csv$/i, ''));
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const hs = (res.meta.fields || []).filter(Boolean);
        if (!hs.length) return setError('Could not read any columns. Make sure the first row has headers like name, phone.');
        setHeaders(hs);
        setRows(res.data);
        setNameCol(guess(hs, /name/i));
        setPhoneCol(guess(hs, /phone|mobile|number|contact|tel|whatsapp/i) || hs[0]);
      },
      error: (err) => setError(err.message),
    });
  }

  const contacts = useMemo(
    () =>
      rows.map((r) => {
        const raw = r[phoneCol];
        return { name: nameCol ? (r[nameCol] || '').toString().trim() : '', raw, number: normalizeNumber(raw) };
      }),
    [rows, nameCol, phoneCol]
  );
  const valid = contacts.filter((c) => c.number);
  const unique = new Set(valid.map((c) => c.number)).size;

  function sample() {
    downloadCsv('sample-contacts.csv', [
      { name: 'Ahmed Khan', phone: '0501234567' },
      { name: 'Sara Ali', phone: '+971521234567' },
    ]);
  }

  async function submit() {
    setError('');
    if (!valid.length) return setError('No valid phone numbers to call.');
    if (mode === 'later' && !when) return setError('Pick a date and time.');
    setBusy(true);
    try {
      const res = await api('/api/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: name || 'Untitled campaign',
          contacts: valid.map((c) => ({ name: c.name, number: c.number })),
          scheduledAt: mode === 'later' ? when : null,
          scriptId,
        }),
      });
      router.push(`/campaigns/${res.id}`);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <>
      <h1>New campaign</h1>
      <p className="sub">Upload a CSV of contacts, choose a script, and call now or schedule.</p>
      {error && <div className="alert error">{error}</div>}

      <div className="grid two">
        <div className="card">
          <h2>1. Contacts</h2>
          <div className="field">
            <label htmlFor="file">CSV file</label>
            <input id="file" type="file" accept=".csv,text/csv" onChange={onFile} />
            <div className="hint">
              First row must be headers, e.g. <code>name,phone</code>. Numbers like 0501234567 are treated as UAE.{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); sample(); }}>Download sample CSV</a>
            </div>
          </div>

          {headers.length > 0 && (
            <div className="grid two">
              <div className="field">
                <label>Name column</label>
                <select value={nameCol} onChange={(e) => setNameCol(e.target.value)}>
                  <option value="">(none)</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Phone column</label>
                <select value={phoneCol} onChange={(e) => setPhoneCol(e.target.value)}>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {rows.length > 0 && (
            <div className="alert info">
              {fileName}: {rows.length} rows · <b>{unique}</b> valid numbers to call
              {contacts.length - valid.length > 0 && ` · ${contacts.length - valid.length} invalid (skipped)`}
              {valid.length - unique > 0 && ` · ${valid.length - unique} duplicates (skipped)`}
            </div>
          )}
        </div>

        <div className="card">
          <h2>2. Settings</h2>
          <div className="field">
            <label htmlFor="cname">Campaign name</label>
            <input id="cname" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Marina leads – Nov" />
          </div>
          <ScriptSelect value={scriptId} onChange={setScriptId} />
          <div className="field">
            <label>When</label>
            <div className="radio">
              <label><input type="radio" checked={mode === 'now'} onChange={() => setMode('now')} /> Call now</label>
              <label><input type="radio" checked={mode === 'later'} onChange={() => setMode('later')} /> Schedule</label>
            </div>
            {mode === 'later' && <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />}
            <div className="hint">
              Times are UAE time. Calls only go out between the allowed hours (default 9am–6pm); anything outside is moved to the next allowed time. Numbers on the Do-not-call list are skipped.
            </div>
          </div>
          <button className="btn" onClick={submit} disabled={busy || !valid.length}>
            {busy ? 'Creating…' : mode === 'now' ? `Start calling ${unique || ''}` : 'Schedule campaign'}
          </button>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="card">
          <h2>Preview (first 10)</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Name</th><th>Number in file</th><th>Will call</th></tr>
              </thead>
              <tbody>
                {contacts.slice(0, 10).map((c, i) => (
                  <tr key={i}>
                    <td>{c.name || '—'}</td>
                    <td className="num">{c.raw || '—'}</td>
                    <td className="num">{c.number || <span className="badge bad">Invalid</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
