'use client';

import { useEffect, useMemo, useState } from 'react';

type WorkOrder = {
  wonum?: string; workrequired?: string; description?: string; worktype?: string; status?: string;
  workperformed?: string; parentwo?: string; parent?: string; statuscode?: string; failureclass?: string;
  customer?: string; reporteddate?: string; reportedby?: string; [key: string]: unknown;
};

type OutboundResponse = {
  ok?: boolean; event?: WorkOrder | null; receivedAt?: string | null; error?: string;
  persistence?: string; status?: number; id?: number | null;
};

const fields: Array<[keyof WorkOrder, string]> = [
  ['wonum', 'Work Order'], ['workrequired', 'Work Required'], ['worktype', 'Work Type'], ['status', 'Status'],
  ['workperformed', 'Work Performed'], ['parentwo', 'Parent WO'], ['statuscode', 'Status Code'],
  ['failureclass', 'Failure Class'], ['customer', 'Customer'], ['reporteddate', 'Reported Date'], ['reportedby', 'Reported By'],
];

function display(v: unknown) { return v === undefined || v === null || v === '' ? '—' : String(v); }

export default function OutboundWorkOrder() {
  const [data, setData] = useState<OutboundResponse>({ event: null });
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const response = await fetch(`/api/latest?t=${Date.now()}`, { cache: 'no-store' });
      setData((await response.json()) as OutboundResponse);
    } catch {
      setData({ ok: false, event: null, error: 'Unable to reach the outbound API.' });
    } finally { setLoading(false); }
  }

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2000);
    return () => window.clearInterval(timer);
  }, []);

  const event = data.event;
  const eventTime = useMemo(() => {
    if (!data.receivedAt) return '—';
    const parsed = new Date(data.receivedAt);
    return Number.isNaN(parsed.getTime()) ? data.receivedAt : parsed.toLocaleString();
  }, [data.receivedAt]);

  return (
    <section className="processPanel">
      <div className="panelTopline">
        <div>
          <div className="eyebrow">OUTBOUND</div>
          <h2>Work Order Events</h2>
          <p>Work Order changes made in Maximo are received here automatically.</p>
        </div>
        <div className={`directionBadge ${data.error ? 'errorBadge' : ''}`}>
          <span className="directionDot" /> {data.error ? 'Storage unavailable' : loading ? 'Connecting…' : 'Maximo → Web App'}
        </div>
      </div>

      {event ? (
        <>
          <div className="eventMeta">
            <span>Latest Work Order Event</span>
            <span>{eventTime}</span>
          </div>
          <div className="outboundGrid">
            {fields.map(([key, label]) => (
              <div key={String(key)} className={`outboundField ${key === 'workrequired' || key === 'workperformed' ? 'fieldWide' : ''}`}>
                <span>{label}</span>
                <strong>{display(event[key])}</strong>
              </div>
            ))}
          </div>
          <div className="rawSection">
            <div className="rawHeader">
              <div><div className="eyebrow">RECEIVED PAYLOAD</div><h3>Maximo Event</h3></div>
              <span>Event ID: {data.id ?? '—'}</span>
            </div>
            <pre>{JSON.stringify(event, null, 2)}</pre>
          </div>
        </>
      ) : (
        <div className="emptyState">
          <div className="pulse" />
          <h3>{data.persistence === 'not-configured' ? 'Outbound storage is ready for the MySQL schema' : 'Waiting for a Maximo Work Order event'}</h3>
          <p>
            {data.persistence === 'not-configured'
              ? 'MySQL is connected, but the outbound event table has intentionally not been created yet. Create the approved schema before enabling persistence.'
              : 'Change and save a Work Order in Maximo. The outbound payload will appear here automatically.'}
          </p>
        </div>
      )}
      {data.error && <div className="errorBox">{data.error}</div>}
    </section>
  );
}
