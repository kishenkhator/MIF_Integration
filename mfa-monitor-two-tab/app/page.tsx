'use client';

import { useEffect, useState } from 'react';
import InboundWorkOrder from './components/InboundWorkOrder';
import OutboundWorkOrder from './components/OutboundWorkOrder';

type Tab = 'outbound' | 'inbound';

export default function HomePage() {
  const [tab, setTab] = useState<Tab>('outbound');

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'inbound' || hash === 'outbound') setTab(hash);
  }, []);

  function selectTab(next: Tab) {
    setTab(next);
    window.history.replaceState(null, '', `#${next}`);
  }

  return (
    <main className="appShell">
      <header className="topBar">
        <div className="brandBlock">
          <div className="brandMark">✈</div>
          <div>
            <div className="brandName">MAXIMO FOR AVIATION</div>
            <div className="brandSubtitle">Integration Monitor</div>
          </div>
        </div>
        <div className="systemStatus"><span className="statusDot" /> System Online</div>
      </header>

      <div className="pageShell">
        <header className="pageHeader">
          <div>
            <div className="eyebrow">WORK ORDER INTEGRATION</div>
            <h1>Work Order</h1>
            <p>Two-way integration between Maximo and the local application.</p>
          </div>
        </header>

        <nav className="processTabs" aria-label="Integration process">
          <button className={tab === 'outbound' ? 'processTab active' : 'processTab'} onClick={() => selectTab('outbound')}>
            <span className="tabKicker">OUTBOUND</span>
            <span className="tabTitle">Maximo → Application</span>
          </button>
          <button className={tab === 'inbound' ? 'processTab active' : 'processTab'} onClick={() => selectTab('inbound')}>
            <span className="tabKicker">INBOUND</span>
            <span className="tabTitle">Application → Maximo</span>
          </button>
        </nav>

        {tab === 'outbound' ? <OutboundWorkOrder /> : <InboundWorkOrder />}

        <footer className="appFooter">
          <span>Maximo Integration Monitor</span>
          <span className="footerDivider">•</span>
          <span>Local Linux Deployment</span>
          <span className="footerDivider">•</span>
          <span>Work Order only</span>
        </footer>
      </div>
    </main>
  );
}
