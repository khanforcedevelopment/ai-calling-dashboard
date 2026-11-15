'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/format';

export default function ScriptEditor() {
  const { id } = useParams();
  const router = useRouter();
  const isNew = id === 'new';
  const [form, setForm] = useState({ name: '', first_message: '', system_prompt: '' });
  const [loading, setLoading] = useState(!isNew);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isNew) return;
    api(`/api/scripts/${id}`)
      .then((d) => setForm({ name: d.script.name, first_message: d.script.first_message, system_prompt: d.script.system_prompt }))
      .catch((e) => setMsg({ type: 'error', text: e.message }))
      .finally(() => setLoading(false));
  }, [id, isNew]);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (isNew) {
        const d = await api('/api/scripts', { method: 'POST', body: JSON.stringify(form) });
        router.replace(`/scripts/${d.script.id}`);
        return;
      }
      await api(`/api/scripts/${id}`, { method: 'PUT', body: JSON.stringify(form) });
      setMsg({ type: 'ok', text: 'Saved. New calls will use this version.' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
    setBusy(false);
  }

  async function remove() {
    if (!window.confirm('Delete this script?')) return;
    try {
      await api(`/api/scripts/${id}`, { method: 'DELETE' });
      router.push('/scripts');
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  }

  if (loading) return <div className="empty">Loading…</div>;

  return (
    <form onSubmit={save}>
      <Link href="/scripts">← Scripts</Link>
      <div className="row" style={{ margin: '6px 0 16px' }}>
        <h1>{isNew ? 'New script' : form.name || 'Script'}</h1>
        <div className="spacer" />
        {!isNew && <button type="button" className="btn ghost small" onClick={remove}>Delete</button>}
        <button className="btn" disabled={busy || !form.name.trim()}>{busy ? 'Saving…' : 'Save script'}</button>
      </div>
      {msg && <div className={`alert ${msg.type}`}>{msg.text}</div>}

      <div className="card">
        <div className="field">
          <label htmlFor="sn">Script name</label>
          <input id="sn" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Petra City – Buy/Sell" />
        </div>
        <div className="field">
          <label htmlFor="fm">First message</label>
          <textarea id="fm" value={form.first_message} onChange={(e) => setForm({ ...form, first_message: e.target.value })} placeholder="Hello, good afternoon! This is Ali, an AI assistant calling from …" />
          <div className="hint">The first thing the AI says when the call is answered. Leave empty to use the one set in Vapi.</div>
        </div>
        <div className="field">
          <label htmlFor="sp">System prompt (instructions)</label>
          <textarea id="sp" className="tall" value={form.system_prompt} onChange={(e) => setForm({ ...form, system_prompt: e.target.value })} placeholder="You are Ali, a friendly and professional AI voice assistant…" />
          <div className="hint">
            How the AI should behave, the call flow and the rules. Use <code>{'{{name}}'}</code> to insert the contact's name from the CSV. Leave empty to use the prompt set in Vapi.
          </div>
        </div>
      </div>
    </form>
  );
}
