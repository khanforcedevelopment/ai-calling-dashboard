'use client';

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
  if (pathname.startsWith('/login')) return null;

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand">
          <span className="brand-dot" /> AI Calling
        </Link>
        <nav className="nav-links">
          {LINKS.map((l) => {
            const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} className={active ? 'active' : ''}>
                {l.label}
              </Link>
            );
          })}
        </nav>
        <button className="btn ghost small" onClick={logout}>
          Log out
        </button>
      </div>
    </header>
  );
}
