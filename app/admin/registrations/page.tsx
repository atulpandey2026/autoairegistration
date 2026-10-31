'use client';

import { useEffect, useMemo, useState } from 'react';

type Delegate = {
  id: number;
  registration_id: number;
  full_name: string;
  email: string;
  phone: string;
  designation: string;
  company: string;
};

type Row = {
  id: number;
  registration_code: string;
  contact_name: string;
  email: string;
  phone: string;
  company: string;
  designation: string;
  pass_name: string;
  delegate_count: number;
  saved_delegates: number;
  subtotal: number;
  gst_amount: number;
  total: number;
  payment_status: string;
  status: string;
  created_at: string;
  delegates: Delegate[];
};

const money = (n: number) => '₹' + Number(n || 0).toLocaleString('en-IN');
const csvCell = (v: unknown) => '"' + String(v ?? '').replaceAll('"', '""').replace(/^[=+@\-\t\r]/, m => "'" + m) + '"';

export default function AdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState<any>({});
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(true);
  const [expanded, setExpanded] = useState<number[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saving, setSaving] = useState<number | null>(null);

  async function load() {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/admin/registrations', { cache: 'no-store' });
      if (r.status === 401) { location.href = '/admin/login'; return; }
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Unable to load registrations.');
      setRows(d.rows || []);
      setStats(d.stats || {});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load data');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter(r => [
    r.registration_code, r.contact_name, r.email, r.phone, r.company,
    ...(r.delegates || []).flatMap(d => [d.full_name, d.email, d.phone, d.company, d.designation]),
  ].some(x => String(x || '').toLowerCase().includes(query.toLowerCase()))), [rows, query]);

  async function update(row: Row, status: string, payment_status: string) {
    setError('');
    setNotice('');
    setSaving(row.id);
    try {
      const r = await fetch('/api/admin/registrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, status, payment_status }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Update failed.');
      if (d.emailWarnings?.length) setNotice(d.emailWarnings.join(' '));
      else if (row.status !== status || row.payment_status !== payment_status) setNotice('Status updated. Notification email sent for each status that changed.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed.');
      throw e;
    } finally {
      setSaving(null);
    }
  }

  async function deleteRegistration(row: Row) {
    const confirmed = window.confirm(`Delete registration ${row.registration_code} for ${row.contact_name}? This permanently deletes the registration and all its nominated delegate records. No email notification will be sent. This action cannot be undone.`);
    if (!confirmed) return;
    setDeleting(`registration-${row.id}`);
    setError(''); setNotice('');
    try {
      const r = await fetch('/api/admin/registrations', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'registration', id: row.id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not delete registration.');
      setNotice(`Registration ${row.registration_code} and its nominated delegate records were deleted. No email was sent.`);
      setExpanded(old => old.filter(id => id !== row.id));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete registration.');
    } finally { setDeleting(null); }
  }

  async function deleteDelegate(registration: Row, delegate: Delegate) {
    const confirmed = window.confirm(`Delete nominee ${delegate.full_name} (${delegate.email}) from ${registration.registration_code}? No email notification will be sent.`);
    if (!confirmed) return;
    setDeleting(`delegate-${delegate.id}`);
    setError(''); setNotice('');
    try {
      const r = await fetch('/api/admin/registrations', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'delegate', id: delegate.id, registration_id: registration.id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not delete nominee.');
      setNotice(`Nominee ${delegate.full_name} was deleted. No email was sent.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete nominee.');
    } finally { setDeleting(null); }
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    location.href = '/admin/login';
  }

  function exportCsv() {
    const head = ['Registration Ref', 'Record Type', 'Delegate Number', 'Full Name', 'Email', 'Phone', 'Designation', 'Company', 'Pass', 'Total Delegates', 'Registration Status', 'Payment Status', 'Registration Date', 'Subtotal', 'GST', 'Total'];
    const data: unknown[][] = [];
    for (const r of filtered) {
      const base = [r.registration_code];
      const tail = [r.pass_name, r.delegate_count, r.status, r.payment_status, r.created_at, r.subtotal, r.gst_amount, r.total];
      data.push([...base, 'Primary Contact', '', r.contact_name, r.email, r.phone, r.designation, r.company, ...tail]);
      for (const [i, d] of (r.delegates || []).entries()) data.push([...base, 'Nominated Delegate', i + 1, d.full_name, d.email, d.phone, d.designation, d.company, ...tail]);
    }
    const csv = '\uFEFF' + [head, ...data].map(row => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = 'auto-ai-expo-all-contacts-and-delegates.csv';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <main className="admin-wrap">
    <header className="admin-header">
      <div><div className="eyebrow">AUTO AI EXPO · REGISTRATION ADMIN</div><h1>Registrations</h1><p>View primary contacts, every nominated delegate and payment status.</p></div>
      <div className="admin-actions"><a className="secondary-button" href="/">Open registration ↗</a><button className="secondary-button" onClick={logout}>Sign out</button></div>
    </header>

    <section className="stats-grid">
      {([['Registrations', stats.registrations || 0], ['Nominated delegates', stats.delegates || 0], ['Registration value', money(stats.value || 0)], ['Paid value', money(stats.paid || 0)]] as [string, string | number][]).map(([k, v]) => <div className="stat-card" key={k}><span>{k}</span><strong>{v}</strong></div>)}
    </section>

    <section className="panel admin-table-panel">
      <div className="table-toolbar"><input aria-label="Search registrations and nominees" placeholder="Search reference, primary contact, nominee, email or company…" value={query} onChange={e => setQuery(e.target.value)} /><button className="secondary-button" onClick={exportCsv} disabled={busy}>Export all contacts + delegates CSV ↓</button><button className="secondary-button" onClick={load}>Refresh ↻</button></div>
      {error && <div className="error">{error}</div>}
      {notice && <div className="admin-notice" role="status">{notice}</div>}
      {busy ? <p>Loading registrations…</p> : <div className="table-scroll"><table><thead><tr><th>Registration</th><th>Primary contact</th><th>Company</th><th>Nominated delegates</th><th>Total</th><th>Registration status</th><th>Payment status</th><th>Update</th><th>Delete</th></tr></thead><tbody>
        {filtered.map(r => {
          const open = expanded.includes(r.id);
          return <FragmentRow key={r.id} row={r} open={open} deleting={deleting} toggle={() => setExpanded(old => open ? old.filter(x => x !== r.id) : [...old, r.id])} saving={saving === r.id} update={update} deleteRegistration={deleteRegistration} deleteDelegate={deleteDelegate} />;
        })}
      </tbody></table>{filtered.length === 0 && <p className="empty">No registrations found.</p>}</div>}
    </section>
    <p className="admin-note">CSV export includes one primary-contact row and one row per nominated delegate. Primary contacts are not automatically counted as nominees unless they were entered as delegates. The dashboard displays the latest 500 registrations. Status selections are not saved or emailed until you click Save. Only saved changes trigger notifications. Deleting a registration or nominee sends no email.</p>
    <style jsx global>{`.admin-notice{background:#eef9f1;border:1px solid #c9ead2;color:#176b35;padding:11px 13px;border-radius:7px;margin:12px 0;font-size:12px}.delete-button{border:1px solid #f0c5c0;background:#fff7f6;color:#a12626;border-radius:7px;padding:7px 10px;font-size:11px;font-weight:700;white-space:nowrap}.delete-button:hover{background:#fff0ee;border-color:#ee4123}.delete-button:disabled{opacity:.55;cursor:wait}.nominee-table .delete-button{padding:6px 8px}`}</style>
  </main>;
}

function FragmentRow({ row: r, open, toggle, update, deleteRegistration, deleteDelegate, deleting, saving }: {
  row: Row;
  open: boolean;
  toggle: () => void;
  update: (r: Row, s: string, p: string) => Promise<void>;
  deleteRegistration: (r: Row) => Promise<void>;
  deleteDelegate: (r: Row, d: Delegate) => Promise<void>;
  deleting: string | null;
  saving: boolean;
}) {
  const [draftStatus, setDraftStatus] = useState(r.status);
  const [draftPaymentStatus, setDraftPaymentStatus] = useState(r.payment_status);
  const [localSaving, setLocalSaving] = useState(false);
  useEffect(() => {
    setDraftStatus(r.status);
    setDraftPaymentStatus(r.payment_status);
  }, [r.status, r.payment_status]);
  const changed = draftStatus !== r.status || draftPaymentStatus !== r.payment_status;
  async function save() {
    if (!changed || saving || localSaving) return;
    setLocalSaving(true);
    try {
      await update(r, draftStatus, draftPaymentStatus);
    } catch {
      // Parent displays the error; retain unsaved selections for retry.
    } finally {
      setLocalSaving(false);
    }
  }
  return <>
    <tr>
      <td><strong>{r.registration_code}</strong><small>{new Date(r.created_at).toLocaleString()}</small></td>
      <td>{r.contact_name}<small>{r.email}</small><small>{r.phone}</small><small>{r.designation}</small></td>
      <td>{r.company}<small>{r.pass_name}</small></td>
      <td><button className="delegate-toggle" type="button" aria-expanded={open} onClick={toggle}>{r.delegate_count} registered · {r.delegates?.length || 0} saved {open ? '▲' : '▼'}<span>{open ? 'Hide nominee details' : 'View all nominee details'}</span></button></td>
      <td>{money(r.total)}<small>GST {money(r.gst_amount)}</small></td>
      <td><select aria-label={`Registration status for ${r.registration_code}`} value={draftStatus} onChange={e => setDraftStatus(e.target.value)}><option>Pending</option><option>Confirmed</option><option>Cancelled</option></select></td>
      <td><select aria-label={`Payment status for ${r.registration_code}`} value={draftPaymentStatus} onChange={e => setDraftPaymentStatus(e.target.value)}><option>Pending</option><option>Partially Paid</option><option>Paid</option><option>Refunded</option><option>Cancelled</option></select></td>
      <td><button type="button" className="save-mini" disabled={!changed || saving || localSaving} onClick={save}>{saving || localSaving ? "Saving…" : "Save"}</button></td>
      <td><button className="delete-button" disabled={deleting === `registration-${r.id}`} onClick={() => deleteRegistration(r)}>{deleting === `registration-${r.id}` ? 'Deleting…' : 'Delete registration'}</button></td>
    </tr>
    {open && <tr className="nominee-row"><td colSpan={9}><div className="nominee-box"><h3>Nominated delegates · {r.registration_code}</h3>{r.delegates?.length ? <div className="nominee-table-wrap"><table className="nominee-table"><thead><tr><th>#</th><th>Full name</th><th>Email</th><th>Mobile</th><th>Designation</th><th>Company</th><th>Action</th></tr></thead><tbody>{r.delegates.map((d, i) => <tr key={d.id}><td>{i + 1}</td><td><strong>{d.full_name}</strong></td><td>{d.email}</td><td>{d.phone || '—'}</td><td>{d.designation || '—'}</td><td>{d.company}</td><td><button className="delete-button" disabled={deleting === `delegate-${d.id}`} onClick={() => deleteDelegate(r, d)}>{deleting === `delegate-${d.id}` ? 'Deleting…' : 'Delete nominee'}</button></td></tr>)}</tbody></table></div> : <p>No nominated delegate records were found for this registration. Check the database if the count is greater than zero.</p>}</div></td></tr>}
  </>;
}
