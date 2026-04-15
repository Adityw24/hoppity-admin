import { useEffect, useState, useCallback } from 'react'
import { CheckCircle, Clock, XCircle, Pause, Play, Eye, Filter } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const STATUS_OPTIONS = ['All', 'pending', 'approved', 'on_hold', 'rejected']

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  color: '#3b82f6', bg: '#eff6ff', icon: Clock },
  approved: { label: 'Approved', color: '#16a34a', bg: '#f0fdf4', icon: CheckCircle },
  on_hold:  { label: 'On Hold',  color: '#d97706', bg: '#fffbeb', icon: Pause },
  rejected: { label: 'Rejected', color: '#dc2626', bg: '#fef2f2', icon: XCircle },
}

export default function CreatorSubmissions() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All')
  const [selected, setSelected] = useState(null)   // row being actioned
  const [actionLoading, setActionLoading] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [counts, setCounts] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('Creator_Submissions')
      .select(`
        id, user_id, submission_type, itinerary_id, proposed_title,
        proposed_category, proposed_location, video_url, thumbnail_url,
        caption, hashtags, status, admin_notes, commission_rate,
        created_at, reviewed_at, reviewed_by,
        Itineraries(id, title, cover_image_url),
        Users!Creator_Submissions_user_id_fkey(username, full_name, email, profile_pic)
      `)
      .order('created_at', { ascending: false })

    const items = data || []
    setRows(items)
    // Count by status
    const c = {}
    items.forEach(r => { c[r.status] = (c[r.status] || 0) + 1 })
    setCounts(c)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = statusFilter === 'All'
    ? rows
    : rows.filter(r => r.status === statusFilter)

  const takeAction = async (action) => {
    if (!selected || actionLoading) return
    setActionLoading(true)

    let error
    if (action === 'approve') {
      const { error: e } = await supabase.rpc('approve_creator_submission', {
        p_submission_id: selected.id,
        p_admin_email:   user.email,
        p_admin_notes:   adminNotes || null,
      })
      error = e
    } else {
      const { error: e } = await supabase.rpc('update_submission_status', {
        p_submission_id: selected.id,
        p_status:        action,
        p_admin_email:   user.email,
        p_admin_notes:   adminNotes || null,
      })
      error = e
    }

    setActionLoading(false)
    if (error) {
      alert('Error: ' + error.message)
    } else {
      setSelected(null)
      setAdminNotes('')
      load()
    }
  }

  const s = { fontFamily: 'DM Sans, sans-serif' }

  return (
    <div style={{ ...s, padding: '28px 32px', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
            Creator Submissions
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Review videos, approve to go live in The Hub, earn 5% affiliates for creators
          </p>
        </div>
        <button
          onClick={load}
          style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--surface-2)', color: 'var(--text)', fontSize: 13,
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Status summary pills */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {STATUS_OPTIONS.map(s => {
          const active = statusFilter === s
          const count = s === 'All' ? rows.length : (counts[s] || 0)
          const cfg = s === 'All' ? null : STATUS_CONFIG[s]
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '6px 14px', borderRadius: 20,
                border: `2px solid ${active ? (cfg?.color || 'var(--purple)') : 'var(--border)'}`,
                background: active ? (cfg?.bg || 'var(--surface-2)') : 'transparent',
                color: active ? (cfg?.color || 'var(--purple)') : 'var(--text-muted)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}
              <span style={{
                background: active ? (cfg?.color || 'var(--purple)') : 'var(--border)',
                color: active ? 'white' : 'var(--text-muted)',
                borderRadius: 99, padding: '1px 7px', fontSize: 11, fontWeight: 700,
              }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 14 }}>
          Loading submissions…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 14 }}>
          No {statusFilter === 'All' ? '' : statusFilter} submissions yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(row => (
            <SubmissionCard
              key={row.id}
              row={row}
              onAction={() => { setSelected(row); setAdminNotes(row.admin_notes || '') }}
              onPreview={() => setPreviewUrl(row.video_url)}
            />
          ))}
        </div>
      )}

      {/* Action modal */}
      {selected && (
        <ActionModal
          row={selected}
          adminNotes={adminNotes}
          onNotesChange={setAdminNotes}
          onAction={takeAction}
          onClose={() => { setSelected(null); setAdminNotes('') }}
          loading={actionLoading}
        />
      )}

      {/* Video preview modal */}
      {previewUrl && (
        <div
          onClick={() => setPreviewUrl(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
        >
          <video
            src={previewUrl}
            controls
            autoPlay
            style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: 12 }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

function SubmissionCard({ row, onAction, onPreview }) {
  const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.pending
  const StatusIcon = cfg.icon
  const user = row.Users
  const itin = row.Itineraries

  const displayTitle = row.submission_type === 'existing'
    ? (itin?.title || `Tour ID ${row.itinerary_id}`)
    : (row.proposed_title || 'New tour proposal')

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '16px 20px',
      display: 'grid', gridTemplateColumns: '56px 1fr auto', gap: 16, alignItems: 'start',
    }}>
      {/* Thumbnail */}
      <div style={{ width: 56, height: 56, borderRadius: 8, overflow: 'hidden',
        background: 'var(--surface-2)', flexShrink: 0 }}>
        {row.thumbnail_url ? (
          <img src={row.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 24 }}>🎬</div>
        )}
      </div>

      {/* Details */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{displayTitle}</span>
          {row.submission_type === 'existing' && itin?.id && (
            <span style={{ fontSize: 10, background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 4, padding: '1px 6px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              ID: {itin.id}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, flexWrap: 'wrap' }}>
          <span>👤 {user?.full_name || user?.username || 'Unknown'}</span>
          <span>✉️ {user?.email || '—'}</span>
          <span>📅 {new Date(row.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <span>💰 {row.commission_rate}% commission</span>
          <span style={{ textTransform: 'capitalize' }}>
            🏷️ {row.submission_type === 'existing' ? 'Existing tour' : `New: ${row.proposed_category || '—'}`}
          </span>
        </div>
        {row.caption && (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-dim)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 500 }}>
            {row.caption}
          </p>
        )}
        {row.admin_notes && (
          <p style={{ margin: '6px 0 0', fontSize: 11, color: cfg.color,
            background: cfg.bg, padding: '4px 8px', borderRadius: 6, display: 'inline-block' }}>
            Admin note: {row.admin_notes}
          </p>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12,
          fontWeight: 700, color: cfg.color, background: cfg.bg,
          padding: '4px 10px', borderRadius: 20 }}>
          <StatusIcon size={12} />
          {cfg.label}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={onPreview}
            style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'var(--surface-2)', color: 'var(--text)', fontSize: 11,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              fontFamily: 'DM Sans, sans-serif' }}
          >
            <Play size={11} /> Preview
          </button>
          <button
            onClick={onAction}
            style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--purple)',
              background: 'rgba(124,58,237,0.08)', color: 'var(--purple)', fontSize: 11,
              cursor: 'pointer', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}
          >
            Review →
          </button>
        </div>
      </div>
    </div>
  )
}

function ActionModal({ row, adminNotes, onNotesChange, onAction, onClose, loading }) {
  const displayTitle = row.submission_type === 'existing'
    ? (row.Itineraries?.title || `Tour ID ${row.itinerary_id}`)
    : row.proposed_title

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 16, padding: 28,
        width: '100%', maxWidth: 500, border: '1px solid var(--border)',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>
          Review Submission
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)' }}>
          {displayTitle}
        </p>

        <label style={{ display: 'block', fontSize: 12, fontWeight: 600,
          color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Admin Notes (optional — shown to creator)
        </label>
        <textarea
          value={adminNotes}
          onChange={e => onNotesChange(e.target.value)}
          rows={3}
          placeholder="Feedback for the creator…"
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--surface-2)',
            color: 'var(--text)', fontSize: 13, resize: 'vertical',
            fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box',
          }}
        />

        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          <button
            onClick={() => onAction('approve')}
            disabled={loading}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none',
              background: '#16a34a', color: 'white', fontSize: 13, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
              fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6,
            }}
          >
            <CheckCircle size={14} />
            {loading ? 'Processing…' : 'Approve & Publish'}
          </button>
          <button
            onClick={() => onAction('on_hold')}
            disabled={loading}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 8,
              border: '1px solid #d97706', background: '#fffbeb',
              color: '#d97706', fontSize: 13, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
              fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6,
            }}
          >
            <Pause size={14} /> On Hold
          </button>
          <button
            onClick={() => onAction('rejected')}
            disabled={loading}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 8,
              border: '1px solid #dc2626', background: '#fef2f2',
              color: '#dc2626', fontSize: 13, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
              fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6,
            }}
          >
            <XCircle size={14} /> Reject
          </button>
        </div>

        <button
          onClick={onClose}
          disabled={loading}
          style={{
            width: '100%', marginTop: 10, padding: '8px', borderRadius: 8,
            border: 'none', background: 'transparent', color: 'var(--text-muted)',
            fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
