'use client';
import { useState } from 'react';
import NavBar from '../NavBar';

type InboundResult = { ok: boolean; error?: string; record?: unknown; status?: number; wonum?: string } | null;

export default function InboundPage() {
  const [wonum, setWonum] = useState('');
  const [siteid, setSiteid] = useState('AVIATION');
  const [orgid, setOrgid] = useState('EAGLE');
  const [description, setDescription] = useState('');
  const [worktype, setWorktype] = useState('CM');
  const [status, setStatus] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [result, setResult] = useState<InboundResult>(null);

  async function runGet() {
    setLoadingAction('get'); setResult(null);
    try {
      const r = await fetch(`/api/maximo/inbound?wonum=${encodeURIComponent(wonum)}&siteid=${encodeURIComponent(siteid)}`);
      const j = await r.json();
      setResult(j);
    } catch {
      setResult({ ok: false, error: 'Network error calling inbound API' });
    } finally { setLoadingAction(null); }
  }

  async function runCreate() {
    setLoadingAction('create'); setResult(null);
    try {
      const r = await fetch('/api/maximo/inbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'create', siteid, orgid, description, worktype, status: status || undefined }),
      });
      const j = await r.json();
      setResult(j);
    } catch {
      setResult({ ok: false, error: 'Network error calling inbound API' });
    } finally { setLoadingAction(null); }
  }

  async function runUpdate() {
    setLoadingAction('update'); setResult(null);
    try {
      const r = await fetch('/api/maximo/inbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'update', wonum, siteid, description: description || undefined, worktype: worktype || undefined, status: status || undefined }),
      });
      const j = await r.json();
      setResult(j);
    } catch {
      setResult({ ok: false, error: 'Network error calling inbound API' });
    } finally { setLoadingAction(null); }
  }

  return (
    <main className="shell">
      <NavBar active="inbound" />

      <header className="hero">
        <div>
          <div className="eyebrow">MAXIMO FOR AVIATION</div>
          <h1>Inbound Requests</h1>
          <p>Send GET, Create, or Update requests directly to Maximo&apos;s REST API — no Postman needed.</p>
        </div>
      </header>

      <div className="card inbound" style={{ marginTop: 24 }}>
        <div className="eyebrow">INBOUND</div>
        <h3>Maximo REST calls</h3>
        <p>Fill in the fields below, then use the matching button for the operation you want.</p>

        <div className="fieldRow">
          <label>WONUM<input value={wonum} onChange={e=>setWonum(e.target.value)} placeholder="1090" /></label>
          <label>Site<input value={siteid} onChange={e=>setSiteid(e.target.value)} /></label>
          <label>Org<input value={orgid} onChange={e=>setOrgid(e.target.value)} /></label>
        </div>
        <div className="fieldRow">
          <label className="wideField">Description<input value={description} onChange={e=>setDescription(e.target.value)} placeholder="Work order description" /></label>
          <label>Work Type<input value={worktype} onChange={e=>setWorktype(e.target.value)} /></label>
          <label>Status<input value={status} onChange={e=>setStatus(e.target.value)} placeholder="optional" /></label>
        </div>

        <div className="btnRow">
          <button disabled={!wonum || !!loadingAction} onClick={runGet}>{loadingAction==='get' ? 'Fetching…' : 'Retrieve (GET)'}</button>
          <button disabled={!!loadingAction} onClick={runCreate}>{loadingAction==='create' ? 'Creating…' : 'Create (POST)'}</button>
          <button disabled={!wonum || !!loadingAction} onClick={runUpdate}>{loadingAction==='update' ? 'Updating…' : 'Update (POST + override)'}</button>
        </div>

        {result && (
          <div className={result.ok ? 'inboundResult ok' : 'inboundResult err'}>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>

      <footer><span>Inbound: this app → Maximo REST</span><span>Outbound: Maximo MIF → Vercel</span></footer>
    </main>
  );
}
