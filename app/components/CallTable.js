'use client';

import { Fragment, useState } from 'react';
import { fmtTime, fmtDuration, STATUS_LABELS, statusTone, outcome } from '@/lib/format';

const LABELS = {
  intent: 'Intent',
  contact_name: 'Name given',
  whatsapp_number: 'WhatsApp',
  interested_in_uae_investment: 'Interested in UAE investment',
  buy_property_type: 'Off-plan / ready',
  preferred_area: 'Preferred area',
  budget: 'Budget',
  sell_property_type: 'Property type',
  sell_location: 'Location',
  sell_bedrooms: 'Bedrooms',
  sell_area_sqft: 'Area (sq ft)',
  sell_status: 'Status',
  sell_expected_price: 'Expected price',
  callback_time: 'Call back',
  do_not_call: 'Do not call',
};

function show(v) {
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  if (v === null || v === undefined || v === '') return null;
  return typeof v === 'object' ? JSON.stringify(v) : String(v);
}

export function CallDetail({ call }) {
  const data = call.structured_data || {};
  const fields = Object.entries(data)
    .map(([k, v]) => [LABELS[k] || k, show(v)])
    .filter(([, v]) => v !== null);

  return (
    <div className="grid two">
      <div>
        {call.recording_url && (
          <div className="field">
            <label>Recording</label>
            <audio controls preload="none" src={call.recording_url} style={{ width: '100%' }} />
          </div>
        )}
        {call.summary && (
          <div className="field">
            <label>Summary</label>
            <div>{call.summary}</div>
          </div>
        )}
        {fields.length > 0 && (
          <div className="field">
            <label>Details captured by AI</label>
            <dl className="kv">
              {fields.map(([k, v]) => (
                <Fragment key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </Fragment>
              ))}
            </dl>
          </div>
        )}
        {call.error && <div className="alert error">{call.error}</div>}
        <div className="hint">
          Ended reason: {call.ended_reason || '—'} · Cost: {call.cost != null ? `$${Number(call.cost).toFixed(3)}` : '—'}
        </div>
      </div>
      <div>
        <label>Transcript</label>
        <pre>{call.transcript || 'No transcript yet.'}</pre>
      </div>
    </div>
  );
}

export default function CallTable({ calls, showCampaign = false }) {
  const [open, setOpen] = useState(null);
  if (!calls.length) return <div className="empty">No calls yet.</div>;
  const cols = showCampaign ? 8 : 7;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Number</th>
            {showCampaign && <th>Campaign</th>}
            <th>Status</th>
            <th>Outcome</th>
            <th>Time (UAE)</th>
            <th>Duration</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {calls.map((c) => {
            const o = outcome(c);
            const isOpen = open === c.id;
            return (
              <Fragment key={c.id}>
                <tr className="clickable" onClick={() => setOpen(isOpen ? null : c.id)}>
                  <td>{c.customer_name || '—'}</td>
                  <td className="num">{c.customer_number}</td>
                  {showCampaign && <td>{c.campaigns?.name || '—'}</td>}
                  <td>
                    <span className={`badge ${statusTone(c.status)}`}>{STATUS_LABELS[c.status] || c.status}</span>
                  </td>
                  <td>{o ? <span className={`badge ${o.tone}`}>{o.label}</span> : '—'}</td>
                  <td className="num">{fmtTime(c.started_at || c.scheduled_for)}</td>
                  <td className="num">{fmtDuration(c.duration_seconds)}</td>
                  <td>{isOpen ? '▲' : '▼'}</td>
                </tr>
                {isOpen && (
                  <tr>
                    <td colSpan={cols} className="detail">
                      <CallDetail call={c} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
