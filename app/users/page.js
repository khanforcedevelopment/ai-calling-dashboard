'use client';

import { useEffect, useState } from 'react';
import { api, fmtTime } from '@/lib/format';

const EMPTY = { name: '', username: '', password: '', role: 'user' };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setUsers((await api('/api/users')).users);
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api('/api/users', { method: 'POST', body: JSON.stringify(form) });
      setMsg({ type: 'ok', text: `User "${form.username.toLowerCase()}" created. Share the username and password with them.` });
      setForm(EMPTY);
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
    setBusy(false);
  }

  async function remove(u) {
    if (!window.confirm(`Delete user "${u.username}"? They will be logged out immediately.`)) return;
    try {
      await api(`/api/users/${u.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  }

  return (
    <>
      <h1>Users</h1>
      <p className="sub">Create logins for your team or the client. The main admin login is username <b>admin</b> with the dashboard password.</p>
      {msg && <div className={`alert ${msg.type}`}>{msg.text}</div>}

      <div className="grid two">
        <form className="card" onSubmit={create}>
          <h2>Add user</h2>
          <div className="field">
            <label htmlFor="un">Name</label>
            <input id="un" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Petra City Sales" />
          </div>
          <div className="field">
            <label htmlFor="uu">Username</label>
            <input id="uu" type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="e.g. petra" autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="up">Password</label>
            <input id="up" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="ur">Role</label>
            <select id="ur" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="user">User (can use everything except Users page)</option>
              <option value="admin">Admin (can also manage users)</option>
            </select>
          </div>
          <button className="btn" disabled={busy || !form.username || !form.password}>{busy ? 'Creating…' : 'Create user'}</button>
        </form>

        <div className="card">
          <h2>{users.length} users</h2>
          {!users.length ? (
            <div className="empty">No extra users yet.</div>
          ) : (
            <table>
              <thead>
                <tr><th>Name</th><th>Username</th><th>Role</th><th>Created</th><th></th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.username}</td>
                    <td><span className={`badge ${u.role === 'admin' ? 'live' : 'muted'}`}>{u.role}</span></td>
                    <td className="num">{fmtTime(u.created_at)}</td>
                    <td><button className="btn ghost small" onClick={() => remove(u)}>Delete</button></td>
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
