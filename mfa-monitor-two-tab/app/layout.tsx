import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Maximo for Aviation | Work Orders',
  description: 'Two-way Maximo Work Order integration: outbound events and inbound REST operations.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
