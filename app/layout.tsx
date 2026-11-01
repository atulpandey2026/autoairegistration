import type { Metadata } from 'next';
import './styles.css';
import SiteChrome from './components/SiteChrome';
export const metadata: Metadata = { title: 'Delegate Registration | Auto AI Expo | 25th - 26th Feb 2027 | Bengaluru', description: 'Auto AI Expo | 25th - 26th Feb 2027 | Bengaluru' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><SiteChrome>{children}</SiteChrome></body></html>; }
