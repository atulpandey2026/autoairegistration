'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
function SuccessContent(){const q=useSearchParams();const ref=q.get('ref');return <main className="success-wrap"><div className="success-card"><div className="success-icon">✓</div><div className="eyebrow">AUTO AI EXPO 2026</div><h1>Registration received</h1><p>Thank you for registering. Our team will connect with you soon regarding further details and payment terms.</p>{ref&&<div className="reference"><span>Registration reference</span><strong>{ref}</strong></div>}<p className="muted">No online payment has been collected. Please keep your reference number for future communication.</p><a className="back-link" href="/">← Back to registration</a></div></main>}
export default function SuccessPage(){return <Suspense fallback={<main className="success-wrap">Loading…</main>}><SuccessContent/></Suspense>}
