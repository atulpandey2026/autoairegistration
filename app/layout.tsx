import type { Metadata } from 'next';
import './styles.css';
import SiteChrome from './components/SiteChrome';
export const metadata: Metadata = { title: 'Auto AI Expo 2026 | Delegate Registration', description: 'Register delegates for Auto AI Expo.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><SiteChrome>{children}</SiteChrome></body></html>; }
