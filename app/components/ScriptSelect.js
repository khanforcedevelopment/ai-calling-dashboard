'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/format';

export default function ScriptSelect({ value, onChange }) {
  const [scripts, setScripts] = useState([]);

  useEffect(() => {
    api('/api/scripts')
      .then((d) => setScripts(d.scripts))
      .catch(() => setScripts([]));
  }, []);

  return (
    <div className="field">
      <label htmlFor="script">Script</label>
      <select id="script" value={value || ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">Default script</option>
        {scripts.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <div className="hint">
        Pick a saved script, or <Link href="/scripts/new">write a new one</Link>.
      </div>
    </div>
  );
}
