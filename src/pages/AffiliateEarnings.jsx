import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: '#d97706', bg: '#fffbeb' },
  paid:      { label: 'Paid',      color: '#16a34a', bg: '#f0fdf4' },
  cancelled: { label: 'Cancelled', color: '#6b7280', bg: '#f9fafb' },
}

export default function AffiliateEarnings() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All')
  const [summary, setSummary] = useState({ total: 0, pending: 0, paid: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('Affiliate_Earnings')
      .select(`
        id, creator_id, booking_id, booking_amount,
        commission_rate, commission_amount, status, created_at,
        Bookings(total_amount, num_persons, booking_date,
          Itineraries(title)),
        Users!Affiliate_Earnings_creator_id_fkey(username, full_name, email)
      `)
      .order('created_at', { ascending: false })

    const items = data || []
    setRows(items)

    // Compute summary
    const pending = items.filter(r => r.status === 'pending')
      .reduce((s, r) => s + Number(r.commission_amount || 0), 0)
    const paid = items.filter(r => r.status === 'paid')
      .reduce((s, r) => s + Number(r.commission_amount || 0), 0)
    const total = items.reduce((s, r) => s + Number(r.commission_amount || 0), 0)
    setSummary({ total, pending, paid })

    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const markPaid = async (id) => {
    if (!confirm('Mark this earning as paid?')) return
    await supabase.from('Affiliate_Earnings').update({ status: 'paid' }).eq('id', id)
    load()
  }

  const filtered = statusFilter === 'All'
    ? rows
    : rows.filter(r => r.status === statusFilter)

  const s = { fontFamily: 'DM Sans, sans-serif' }

  return (
    <div style={{ ...s, padding: '28px 32px', maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
          Affiliate Earnings
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
          5% commission auto-credited to creators on each confirmed booking
        </p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Commissions', value: `₹${summary.total.toFixed(0)}`, color: 'var(--purple)' },
          { label: 'Pending Payout',    value: `₹${summary.pending.toFixed(0)}`, color: '#d97706' },
          { label: 'Total Paid Out',    value: `₹${summary.paid.toFixed(0)}`,    color: '#16a34a' },
        ].map(c => (
          <div key={c.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 20px',
          }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['All', 'pending', 'paid', 'cancelled'].map(f => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            style={{
              padding: '5px 14px', borderRadius: 20, border: '1px solid var(--border)',
              background: statusFilter === f ? 'var(--surface-2)' : 'transparent',
              color: statusFilter === f ? 'var(--text)' : 'var(--text-muted)',
              fontSize: 12, fontWeight: statusFilter === f ? 600 : 400,
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <button
          onClick={load}
          style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--surface-2)',
            color: 'var(--text)', fontSize: 12, cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif' }}
        >
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 14 }}>
          Loading earnings…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 14 }}>
          No earnings yet
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              {['Creator', 'Tour', 'Booking Amount', 'Commission (5%)', 'Date', 'Status', ''].map(h => (
                <th key={h} style={{
                  padding: '8px 12px', textAlign: 'left', fontSize: 11,
                  fontWeight: 700, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(row => {
              const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.pending
              const creator = row.Users
              const tour = row.Bookings?.Itineraries
              return (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px', color: 'var(--text)' }}>
                    <div style={{ fontWeight: 600 }}>{creator?.full_name || creator?.username || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{creator?.email}</div>
                  </td>
                  <td style={{ padding: '12px', color: 'var(--text-dim)', maxWidth: 200 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tour?.title || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text)' }}>
                    ₹{Number(row.booking_amount || 0).toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '12px', fontWeight: 800, color: 'var(--purple)', fontSize: 15 }}>
                    ₹{Number(row.commission_amount || 0).toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: 12 }}>
                    {new Date(row.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center',
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      color: cfg.color, background: cfg.bg,
                    }}>
                      {cfg.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {row.status === 'pending' && (
                      <button
                        onClick={() => markPaid(row.id)}
                        style={{
                          padding: '4px 12px', borderRadius: 6,
                          border: '1px solid #16a34a', background: '#f0fdf4',
                          color: '#16a34a', fontSize: 11, fontWeight: 700,
                          cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                        }}
                      >
                        Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
