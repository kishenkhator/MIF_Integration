'use client';

import { useState } from 'react';

type WorkOrder = {
  wonum?: string;
  workrequired?: string;
  description?: string;
  worktype?: string;
  status?: string;
  workperformed?: string;
  parentwo?: string;
  parent?: string;
  statuscode?: string;
  failureclass?: string;
  customer?: string;
  reporteddate?: string;
  reportedby?: string;
  [key: string]: unknown;
};

type Result = {
  ok: boolean;
  error?: string;
  record?: WorkOrder;
  status?: number;
  wonum?: string;
  href?: string;
} | null;

const empty: WorkOrder = {
  wonum: '', workrequired: '', worktype: '', status: '', workperformed: '',
  parentwo: '', statuscode: '', failureclass: '', customer: '', reporteddate: '', reportedby: '',
};

const fields: Array<{ key: keyof WorkOrder; label: string; placeholder: string; wide?: boolean }> = [
  { key: 'wonum', label: 'Work Order', placeholder: 'Enter Work Order' },
  { key: 'workrequired', label: 'Work Required', placeholder: 'Enter work required', wide: true },
  { key: 'worktype', label: 'Work Type', placeholder: 'Enter work type' },
  { key: 'status', label: 'Status', placeholder: 'Enter status' },
  { key: 'workperformed', label: 'Work Performed', placeholder: 'Enter work performed', wide: true },
  { key: 'parentwo', label: 'Parent WO', placeholder: 'Enter parent WO' },
  { key: 'statuscode', label: 'Status Code', placeholder: 'Enter status code' },
  { key: 'failureclass', label: 'Failure Class', placeholder: 'Enter failure class' },
  { key: 'customer', label: 'Customer', placeholder: 'Enter customer' },
  { key: 'reporteddate', label: 'Reported Date', placeholder: 'Select date and time' },
  { key: 'reportedby', label: 'Reported By', placeholder: 'Enter reported by' },
];

function value(record: WorkOrder | undefined, key: keyof WorkOrder) {
  return record?.[key] === undefined || record?.[key] === null ? '' : String(record[key]);
}

export default function InboundWorkOrder() {
  const [form, setForm] = useState<WorkOrder>(empty);
  const [loadingAction, setLoadingAction] = useState<'retrieve' | 'create' | 'update' | null>(null);
  const [result, setResult] = useState<Result>(null);

  function setField(key: keyof WorkOrder, next: string) {
    setForm((current) => ({ ...current, [key]: next }));
  }

  function applyRecord(record: WorkOrder) {
    setForm((current) => ({
      ...current,
      wonum: value(record, 'wonum') || current.wonum,
      workrequired: value(record, 'workrequired') || value(record, 'description'),
      worktype: value(record, 'worktype'),
      status: value(record, 'status'),
      workperformed: value(record, 'workperformed'),
      parentwo: value(record, 'parentwo') || value(record, 'parent'),
      statuscode: value(record, 'statuscode'),
      failureclass: value(record, 'failureclass'),
      customer: value(record, 'customer'),
      reporteddate: value(record, 'reporteddate'),
      reportedby: value(record, 'reportedby'),
    }));
  }

  async function call(url: string, init?: RequestInit) {
    const response = await fetch(url, init);
    const json = (await response.json()) as Result;
    setResult(json);
    if (json?.ok && json.record && typeof json.record === 'object') applyRecord(json.record);
  }

  async function retrieve() {
    if (!form.wonum) return;
    setLoadingAction('retrieve');
    setResult(null);
    try { await call(`/api/maximo/inbound?wonum=${encodeURIComponent(String(form.wonum))}`); }
    catch { setResult({ ok: false, error: 'Network error calling Maximo.' }); }
    finally { setLoadingAction(null); }
  }

  async function create() {
    setLoadingAction('create');
    setResult(null);
    try {
      await call('/api/maximo/inbound', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'create', ...form }),
      });
    } catch { setResult({ ok: false, error: 'Network error calling Maximo.' }); }
    finally { setLoadingAction(null); }
  }

  async function update() {
    if (!form.wonum) return;
    setLoadingAction('update');
    setResult(null);
    try {
      await call('/api/maximo/inbound', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'update', ...form }),
      });
    } catch { setResult({ ok: false, error: 'Network error calling Maximo.' }); }
    finally { setLoadingAction(null); }
  }

  return (
    <section className="processPanel">
      <div className="panelTopline">
        <div>
          <div className="eyebrow">INBOUND</div>
          <h2>Work Order</h2>
          <p>Enter Work Order information and send the selected operation directly to Maximo.</p>
        </div>
        <div className="directionBadge"><span className="directionDot" /> Web App → Maximo</div>
      </div>

      <div className="maximoForm">
        {fields.map((field) => (
          <label key={String(field.key)} className={`maximoField ${field.wide ? 'fieldWide' : ''}`}>
            <span>{field.label}{field.key === 'wonum' ? ' *' : ''}</span>
            {field.key === 'workrequired' || field.key === 'workperformed' ? (
              <textarea
                value={String(form[field.key] ?? '')}
                onChange={(e) => setField(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
              />
            ) : (
              <input
                value={String(form[field.key] ?? '')}
                onChange={(e) => setField(field.key, e.target.value)}
                placeholder={field.placeholder}
                type={field.key === 'reporteddate' ? 'datetime-local' : 'text'}
              />
            )}
          </label>
        ))}
      </div>

      <div className="actionRow">
        <button className="actionButton primary" disabled={!form.wonum || !!loadingAction} onClick={retrieve}>
          {loadingAction === 'retrieve' ? 'Retrieving…' : 'Retrieve the Work Order Details'}
        </button>
        <button className="actionButton" disabled={!!loadingAction} onClick={create}>
          {loadingAction === 'create' ? 'Creating…' : 'Create the Work Order'}
        </button>
        <button className="actionButton" disabled={!form.wonum || !!loadingAction} onClick={update}>
          {loadingAction === 'update' ? 'Updating…' : 'Update the Work Order'}
        </button>
      </div>

      {result && (
        <div className={`resultBox ${result.ok ? 'success' : 'failure'}`}>
          <div className="resultHeading">{result.ok ? 'Request successful' : 'Request failed'}</div>
          {result.error && <div className="resultText">{result.error}</div>}
          {result.record && (
            <div className="resultSummary">
              <span>Work Order</span><strong>{value(result.record, 'wonum') || '—'}</strong>
              <span>Status</span><strong>{value(result.record, 'status') || '—'}</strong>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
