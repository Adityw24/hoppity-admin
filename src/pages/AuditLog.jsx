import { useEffect, useState, useCallback } from 'react'
import { Activity, RefreshCw, Filter } from 'lucide-react'
import { supabase } from '../lib/supabase'

const ACTION_STYLES = {
  create:        'badge-green',
  update:        'badge-purple',
  delete:        'badge-red',
  toggle_active: 'badge-amber',
}

const ACTION_LABELS = {
  create:        '＋ Created',
  update:        '✎ Updated',
  delete:        '✕ Deleted',
  toggle_active: '⇄ Toggled',
}

export default function AuditLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('All')
  const [adminFilter, setAdminFilter] = useState('All')
  const [admins, setAdmins] = useState([])
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 30

  const load = useCallback(async (reset = false) => {
    const currentPage = reset ? 0 : page
    if (reset) setPage(0)
    setLoading(true)

    let q = supabase
      .from('Admin_logs')
      .select('id,admin_email,action,entity_type,entity_id,entity_title,changes,created_at')
      .order('created_at', { ascending: false })
      .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1)

    if (actionFilter !== 'All') q = q.eq('action', actionFilter)
    if (adminFilter !== 'All') q = q.eq('admin_email', adminFilter)

    const { data } = await q
    if (reset || currentPage === 0) {
      setLogs(data || [])
    } else {
      setLogs(prev => [...prev, ...(data || [])])
    }

    // Build admin list on first load
    if (currentPage === 0) {
      const { data: allLogs } = await supabase
        .from('Admin_logs')
        .select('admin_email')
      const unique = [...new Set((allLogs || []).map(l => l.admin_email))]
      setAdmins(unique)
    }

    setLoading(false)
  }, [page, actionFilter, adminFilter])

  useEffect(() => { load(true) }, [actionFilter, adminFilter])
  useEffect(() => { if (page > 0) load() }, [page])

  const formatDate = (d) => new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity size={20} style={{ color: 'var(--purple-light)' }} />
            Audit Log
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Every create, edit, delete, and toggle by all admins
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => load(true)}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Filter size={12} style={{ color: 'var(--text-dim)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Action:</span>
          {['All', 'create', 'update', 'delete', 'toggle_active'].map(a => (
            <button key={a} className="btn btn-ghost btn-sm"
              onClick={() => setActionFilter(a)}
              style={{ borderColor: actionFilter === a ? 'var(--border-active)' : undefined, color: actionFilter === a ? 'var(--text)' : undefined }}
            >
              {a === 'All' ? 'All' : ACTION_LABELS[a]}
            </button>
          ))}
        </div>
        {admins.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Admin:</span>
            {['All', ...admins].map(a => (
              <button key={a} className="btn btn-ghost btn-sm"
                onClick={() => setAdminFilter(a)}
                style={{ borderColor: adminFilter === a ? 'var(--border-active)' : undefined, color: adminFilter === a ? 'var(--text)' : undefined }}
              >
                {a === 'All' ? 'All' : a.split('@')[0]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Log table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading && logs.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            <Activity size={32} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--text-dim)' }} />
            No activity recorded yet. Actions from the admin panel will appear here.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ borderBottom: '1px solid var(--border)' }}>
                <tr>
                  {['Time', 'Admin', 'Action', 'Entity', 'ID', 'Details'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Time */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {formatDate(log.created_at)}
                      </span>
                    </td>

                    {/* Admin */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{log.admin_email?.split('@')[0]}</div>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--text-dim)' }}>{log.admin_email}</div>
                    </td>

                    {/* Action */}
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${ACTION_STYLES[log.action] || 'badge-purple'}`}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>

                    {/* Entity title */}
                    <td style={{ padding: '12px 16px', maxWidth: 220 }}>
                      <span style={{ fontSize: 13, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.entity_title || '—'}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{log.entity_type}</span>
                    </td>

                    {/* Entity ID → HOP format */}
                    <td style={{ padding: '12px 16px' }}>
                      {log.entity_id ? (
                        <span className="mono badge badge-purple" style={{ fontSize: 10 }}>
                          HOP-{String(log.entity_id).padStart(4, '0')}
                        </span>
                      ) : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                    </td>

                    {/* Changes summary */}
                    <td style={{ padding: '12px 16px', maxWidth: 200 }}>
                      {log.changes ? (
                        <details style={{ cursor: 'pointer' }}>
                          <summary style={{ fontSize: 11, color: 'var(--purple-light)', listStyle: 'none', cursor: 'pointer' }}>
                            View diff ▾
                          </summary>
                          <pre style={{
                            marginTop: 8, fontSize: 10, color: 'var(--text-muted)',
                            background: 'var(--surface-2)', padding: 8, borderRadius: 6,
                            maxHeight: 160, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                          }}>
                            {JSON.stringify(
                              Object.fromEntries(
                                Object.entries(log.changes)
                                  .filter(([k]) => !['images','itinerary_days','highlights','inclusions','exclusions','tips','city_stops'].includes(k))
                              ),
                              null, 2
                            )}
                          </pre>
                        </details>
                      ) : <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Load more */}
            {logs.length >= PAGE_SIZE && (
              <div style={{ padding: 16, textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setPage(p => p + 1)} disabled={loading}>
                  {loading ? <div className="spinner" style={{ width: 12, height: 12 }} /> : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
