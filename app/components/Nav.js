'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/campaigns/new', label: 'New campaign' },
  { href: '/scripts', label: 'Scripts' },
  { href: '/calls', label: 'Call logs' },
  { href: '/leads', label: 'Leads' },
  { href: '/dnc', label: 'Do not call' },
];

export default function Nav() {
  const pathname = usePathname();
  const [me, setMe] = useState(null);
  const onLogin = pathname.startsWith('/login');

  useEffect(() => {
    if (onLogin) return;
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then(setMe)
      .catch(() => setMe(null));
  }, [onLogin]);

  if (onLogin) return null;

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  const links = me?.role === 'admin' ? [...LINKS, { href: '/users', label: 'Users' }] : LINKS;

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand">
          <span className="brand-dot" /> AI Calling
        </Link>
        <nav className="nav-links">
          {links.map((l) => {
            const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} className={active ? 'active' : ''}>
                {l.label}
              </Link>
            );
          })}
        </nav>
        {me && <span className="hint" style={{ margin: 0 }}>{me.name || me.username}</span>}
        <button className="btn ghost small" onClick={logout}>
          Log out
        </button>
      </div>
    </header>
  );
}
