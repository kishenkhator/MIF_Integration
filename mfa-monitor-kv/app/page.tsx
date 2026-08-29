'use client';
import { useEffect, useState } from 'react';

type EventPayload = { wonum?: string; siteid?: string; orgid?: string; description?: string; status?: string; worktype?: string; event?: string; receivedAt?: string; [key:string]: unknown };
type Latest = { event: EventPayload | null; updatedAt?: string | null; error?: string };

const display = (v: unknown) => v === undefined || v === null || v === '' ? '—' : String(v);

export default function Home() {
  const [data,setData] = useState<Latest>({event:null});
  const [lastPoll,setLastPoll] = useState<Date | null>(null);

  async function refresh() {
    try {
      const r = await fetch(`/api/latest?t=${Date.now()}`, {cache:'no-store'});
      const j = await r.json() as Latest;
      setData(j);
      setLastPoll(new Date());
    } catch {
      setData({event:null,error:'Unable to reach receiver API'});
    }
  }

  useEffect(() => { refresh(); const id = setInterval(refresh,2000); return () => clearInterval(id); }, []);

  const e = data.event;
  return (
    <main className="shell">
      <header className="hero">
        <div>
          <div className="eyebrow">MAXIMO FOR AVIATION</div>
          <h1>Integration Monitor</h1>
          <p>Live view of outbound Work Order events received from Maximo.</p>
        </div>
        <div className="status"><span className="dot"/>{data.error ? 'API issue' : 'Listening'}</div>
      </header>

      <div className="flow">
        {['WORKORDER SAVE','PUBLISH CHANNEL','JMS','END POINT','VERCEL WEBHOOK'].map((x,i)=>
          <span key={x} className={i===4?'node active':'node'}>{x}{i<4 && <b> → </b>}</span>
        )}
      </div>

      <section className="grid">
        <div className="card main">
          <div className="cardHead">
            <div><div className="eyebrow">LATEST OUTBOUND EVENT</div><h2>{e ? 'Event received' : 'Waiting for Maximo'}</h2></div>
            <small>{e?.receivedAt ? new Date(e.receivedAt).toLocaleString() : lastPoll ? 'Polling…' : '—'}</small>
          </div>
          {e ? <div className="details">
            <div><label>Work Order</label><strong>{display(e.wonum)}</strong></div>
            <div><label>Site</label><strong>{display(e.siteid)}</strong></div>
            <div><label>Organization</label><strong>{display(e.orgid)}</strong></div>
            <div><label>Status</label><strong>{display(e.status)}</strong></div>
            <div><label>Work Type</label><strong>{display(e.worktype)}</strong></div>
            <div className="wide"><label>Description</label><strong>{display(e.description)}</strong></div>
          </div> : <div className="empty"><div className="pulse"/><h3>Waiting for an outbound event</h3><p>Change and save a Work Order in Maximo. The new payload will appear here automatically.</p></div>}
        </div>

        <div className="card">
          <div className="eyebrow">RECEIVER</div><h3>Vercel Webhook</h3>
          <p>Maximo sends its outbound HTTP message to:</p>
          <code>/api/maximo/webhook</code>
          <div className="row"><span>Refresh</span><b>2 sec</b></div>
          <div className="row"><span>History</span><b>Latest only</b></div>
        </div>

        <div className="card">
          <div className="eyebrow">RAW JSON</div><h3>Received payload</h3>
          <pre>{JSON.stringify(e ?? {waiting:true}, null, 2)}</pre>
        </div>
      </section>

      {data.error && <div className="error">{data.error}</div>}
      <footer><span>Inbound: Postman → Maximo REST</span><span>Outbound: Maximo MIF → Vercel</span></footer>
    </main>
  );
}
