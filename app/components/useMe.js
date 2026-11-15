'use client';

import { useEffect, useState } from 'react';

let cached = null;

// Who is logged in: { username, name, role }
export default function useMe() {
  const [me, setMe] = useState(null);
  useEffect(() => {
    if (!cached) cached = fetch('/api/me').then((r) => (r.ok ? r.json() : null)).catch(() => null);
    cached.then(setMe);
  }, []);
  return me;
}
