'use client';

import { useEffect, useState } from 'react';
import { api, fmtTime, downloadCsv } from '@/lib/format';

const COLUMNS = {
  buy: [
    ['customer_name', 'Name'],
    ['customer_number', 'Number'],
    ['whatsapp_number', 'WhatsApp'],
    ['buy_property_type', 'Off-plan / ready'],
    ['preferred_area', 'Area'],
    ['budget', 'Budget'],
  ],
  sell: [
    ['customer_name', 'Name'],
    ['customer_number', 'Number'],
    ['sell_property_type', 'Type'],
    ['sell_location', 'Location'],
    ['sell_bedrooms', 'Beds'],
    ['sell_area_sqft', 'Sq ft'],
    ['sell_status', 'Status'],
    ['sell_expected_price', 'Expected price'],
  ],
};

function flatten(lead) {
  const d = lead.structured_data || {};
  return {
    customer_name: d.contact_name || lead.customer_name || '',
    customer_number: lead.customer_number,
    ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v === true ? 'Yes' : v === false ? 'No' : v ?? ''])),
    campaign: lead.campaigns?.name || '',
    call_time: lead.ended_at || '',
    summary: lead.summary || '',
    recording_url: lead.recording_url || '',
  };
}

export default function LeadsPage() {
  const [type, setType] = useState('buy');
  const [leads, setLeads] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api(`/api/leads?type=${type}`)
      .then((d) => {
        setLeads(d.leads.map(flatten));
        setError('');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [type]);

  const cols = COLUMNS[type];

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <div>
          <h1>Leads</h1>
          <p className="sub" style={{ margin: 0 }}>People the AI marked as buyers or sellers.</p>
        </div>
        <div className="spacer" />
        <button
          className="btn small"
          disabled={!leads.length}
          onClick={() => downloadCsv(`${type === 'buy' ? 'buyers' : 'sellers'}.csv`, leads)}
        >
          Export CSV
        </button>
      </div>
      {error && <div className="alert error">{error}</div>}

      <div className="tabs">
        <button className={type === 'buy' ? 'active' : ''} onClick={() => setType('buy')}>Buyers</button>
        <button className={type === 'sell' ? 'active' : ''} onClick={() => setType('sell')}>Sellers</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="empty">Loading…</div>
        ) : !leads.length ? (
          <div className="empty">No {type === 'buy' ? 'buyers' : 'sellers'} yet.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {cols.map(([, label]) => <th key={label}>{label}</th>)}
                  <th>Campaign</th>
                  <th>Call time</th>
                  <th>Recording</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l, i) => (
                  <tr key={i}>
                    {cols.map(([k]) => (
                      <td key={k} className={k.includes('number') ? 'num' : ''}>{l[k] || '—'}</td>
                    ))}
                    <td>{l.campaign || '—'}</td>
                    <td className="num">{fmtTime(l.call_time)}</td>
                    <td>{l.recording_url ? <a href={l.recording_url} target="_blank" rel="noreferrer">Listen</a> : '—'}</td>
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
