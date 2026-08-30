import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'MFA Integration Monitor', description: 'Maximo for Aviation outbound integration monitor' };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
