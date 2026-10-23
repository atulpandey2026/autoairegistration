```tsx
'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';

const ROOT = 'https://autoaiexpo.com';
const LOGO = 'https://autoaiexpo.com/assets/images/AutoAI.webp';

const links = [
  ['Home', '#home'],
  ['About', '#about'],
  ['Highlights', '#Highlights'],
  ['Core Focus Areas', '#tracks'],
  ['Who Will Attend', '#attendees'],
  ['Loyalty Program', '#loyalty-program'],
  ['Agenda', '#agenda'],
  ['Contact', '#contact'],
];

export default function SiteChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = path.startsWith('/admin');

  if (isAdmin) return <>{children}</>;

  return (
    <>
      <header className="site-nav">
        <div className="site-nav-inner">
          <a
            className="site-brand"
            href={ROOT + '/#home'}
            aria-label="Auto AI Expo homepage"
          >
            <img src={LOGO} alt="Auto AI Expo" />
          </a>

          <nav className="site-nav-links" aria-label="Main navigation">
            {links.map(([label, anchor]) => (
              <a key={label} href={ROOT + '/' + anchor}>
                {label}
              </a>
            ))}
          </nav>

          <button
            type="button"
            className="site-menu-button"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>

        {menuOpen && (
          <nav className="site-mobile-nav" aria-label="Mobile navigation">
            {links.map(([label, anchor]) => (
              <a
                key={label}
                href={ROOT + '/' + anchor}
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </a>
            ))}
          </nav>
        )}
      </header>

      <div className="site-content">{children}</div>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <div className="site-footer-top">
            <a href={ROOT + '/'} aria-label="Auto AI Expo homepage">
              <img src={LOGO} alt="Auto AI Expo Logo" />
            </a>

            <div>
              <h3>
                A Platform for the Entire Automotive Technology Ecosystem
              </h3>

              <p>
                Auto AI Expo 2027 aims to become a meeting point for the people
                building the next generation of mobility. From AI algorithms
                to autonomous vehicles, from EV batteries to automotive
                cybersecurity, from intelligent factories to connected
                infrastructure, the event will bring the complete ecosystem
                together in Bengaluru.
              </p>
            </div>
          </div>

          <div className="site-footer-bottom">
            © 2027 Auto AI Expo. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  );
}
```
