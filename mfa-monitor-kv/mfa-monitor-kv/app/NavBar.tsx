'use client';
import Link from 'next/link';

export default function NavBar({ active }: { active: 'outbound' | 'inbound' }) {
  return (
    <nav className="navbar">
      <Link href="/" className={active === 'outbound' ? 'navLink active' : 'navLink'}>Outbound Monitor</Link>
      <Link href="/inbound" className={active === 'inbound' ? 'navLink active' : 'navLink'}>Inbound Requests</Link>
    </nav>
  );
}
