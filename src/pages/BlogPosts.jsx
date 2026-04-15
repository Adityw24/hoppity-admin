import { useEffect, useState, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import CharacterCount from '@tiptap/extension-character-count'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  CheckCircle, Clock, XCircle, Pause, Eye, EyeOff, Edit3,
  PlusCircle, Bold, Italic, UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered, Quote,
  Code, AlignLeft, AlignCenter, AlignRight, Image as ImageIcon,
  Link as LinkIcon, Highlighter, RotateCcw, RotateCw, X,
} from 'lucide-react'

const STATUS_CONFIG = {
  draft:    { label: 'Draft',    color: '#6b7280', bg: '#f9fafb' },
  pending:  { label: 'Pending',  color: '#3b82f6', bg: '#eff6ff' },
  approved: { label: 'Approved', color: '#16a34a', bg: '#f0fdf4' },
  on_hold:  { label: 'On Hold',  color: '#d97706', bg: '#fffbeb' },
  rejected: { label: 'Rejected', color: '#dc2626', bg: '#fef2f2' },
}

const CATEGORIES = ['Heritage', 'Trekking', 'Adventure', 'Wildlife', 'Culinary', 'Spiritual', 'Cultural']

// ── Toolbar button ────────────────────────────────────────────────────
function TBtn({ onClick, active, disabled, title, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 6, border: 'none',
        background: active ? 'rgba(124,58,237,0.15)' : 'transparent',
        color: active ? 'var(--purple)' : 'var(--text-dim)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.1s',
        fontFamily: 'DM Sans, sans-serif',
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'rgba(124,58,237,0.08)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      {children}
    </button>
  )
}

// ── TipTap Editor ─────────────────────────────────────────────────────
function RichEditor({ content, onChange, readOnly = false }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
      }),
      Underline,
      Image.configure({ resizable: true }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Write your story here… Tell readers about the experience, the places, the people.' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      CharacterCount,
    ],
    content: content || '',
    editable: !readOnly,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
    editorProps: {
      attributes: {
        style: 'outline: none; min-height: 400px; padding: 16px; font-size: 15px; line-height: 1.75; font-family: DM Sans, sans-serif;',
      },
    },
  })

  // Update content when post changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '')
    }
  }, [content])

  const addImage = useCallback(() => {
    const url = window.prompt('Image URL:')
    if (url && editor) editor.chain().focus().setImage({ src: url }).run()
  }, [editor])

  const setLink = useCallback(() => {
    const url = window.prompt('URL:')
    if (url && editor) editor.chain().focus().setLink({ href: url }).run()
    else if (editor) editor.chain().focus().unsetLink().run()
  }, [editor])

  const uploadImage = useCallback(async () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return

      // Client-side canvas compression
      const compressed = await compressImage(file, 1280, 0.78)
      const { data: { session } } = await supabase.auth.getSession()
      const path = `${session.user.id}/${Date.now()}.jpg`

      const { error } = await supabase.storage.from('blog-media').upload(path, compressed, {
        contentType: 'image/jpeg', upsert: true
      })
      if (!error) {
        const { data } = supabase.storage.from('blog-media').getPublicUrl(path)
        if (editor) editor.chain().focus().setImage({ src: data.publicUrl }).run()
      }
    }
    input.click()
  }, [editor])

  if (!editor) return <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>Loading editor…</div>

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: 'var(--surface)' }}>
      {/* Toolbar */}
      {!readOnly && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 2, padding: '6px 8px',
          borderBottom: '1px solid var(--border)', background: 'var(--surface-2)',
        }}>
          <TBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><Bold size={14} /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><Italic size={14} /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><UnderlineIcon size={14} /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><Strikethrough size={14} /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Highlight"><Highlighter size={14} /></TBtn>

          <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '3px 4px' }} />

          <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1"><Heading1 size={14} /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2"><Heading2 size={14} /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3"><Heading3 size={14} /></TBtn>

          <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '3px 4px' }} />

          <TBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list"><List size={14} /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list"><ListOrdered size={14} /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote"><Quote size={14} /></TBtn>
          <TBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline code"><Code size={14} /></TBtn>

          <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '3px 4px' }} />

          <TBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left"><AlignLeft size={14} /></TBtn>
          <TBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Center"><AlignCenter size={14} /></TBtn>
          <TBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right"><AlignRight size={14} /></TBtn>

          <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '3px 4px' }} />

          <TBtn onClick={uploadImage} title="Upload & insert image (auto-optimised)"><ImageIcon size={14} /></TBtn>
          <TBtn onClick={addImage} title="Embed image from URL"><LinkIcon size={14} /></TBtn>
          <TBtn onClick={setLink} active={editor.isActive('link')} title="Add link"><LinkIcon size={14} /></TBtn>

          <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '3px 4px' }} />

          <TBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo"><RotateCcw size={14} /></TBtn>
          <TBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo"><RotateCw size={14} /></TBtn>

          <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', paddingRight: 4 }}>
            {editor.storage.characterCount.words()} words
          </div>
        </div>
      )}

      {/* Editor body */}
      <div className="tiptap-editor" style={{ maxHeight: readOnly ? 'none' : 500, overflowY: 'auto' }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

// ── Canvas image compression ──────────────────────────────────────────
async function compressImage(file, maxSide = 1280, quality = 0.78) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        if (width > height && width > maxSide) {
          height = Math.round(height * maxSide / width)
          width = maxSide
        } else if (height > maxSide) {
          width = Math.round(width * maxSide / height)
          height = maxSide
        }
        canvas.width = width; canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(resolve, 'image/jpeg', quality)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

// ── Main BlogPosts page ───────────────────────────────────────────────
export default function BlogPosts() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All')
  const [mode, setMode] = useState('list')   // 'list' | 'compose' | 'review'
  const [selectedPost, setSelectedPost] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')

  // Compose state
  const [composeTitle, setComposeTitle] = useState('')
  const [composeHtml, setComposeHtml] = useState('')
  const [composeCover, setComposeCover] = useState('')
  const [composeCategory, setComposeCategory] = useState('')
  const [composeTags, setComposeTags] = useState('')
  const [composeSaving, setComposeSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('Blog_Posts')
      .select('*, Users!Blog_Posts_author_id_fkey(full_name, username, email, profile_pic, is_creator)')
      .order('created_at', { ascending: false })
    setPosts(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = statusFilter === 'All' ? posts : posts.filter(p => p.status === statusFilter)
  const counts = {}
  posts.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1 })

  const takeAction = async (action) => {
    if (!selectedPost || actionLoading) return
    setActionLoading(true)

    let payload = { admin_notes: adminNotes || null, reviewed_by: user.email, reviewed_at: new Date().toISOString() }

    if (action === 'approve') {
      payload.status = 'approved'
      payload.published_at = new Date().toISOString()
    } else {
      payload.status = action
    }

    await supabase.from('Blog_Posts').update(payload).eq('id', selectedPost.id)

    // Log
    await supabase.from('Admin_logs').insert({
      admin_email: user.email, action, entity_type: 'blog_post',
      entity_title: selectedPost.title,
    })

    setActionLoading(false)
    setSelectedPost(null)
    setAdminNotes('')
    setMode('list')
    load()
  }

  const saveAdminPost = async (submit = false) => {
    if (!composeTitle.trim()) return alert('Add a title first')
    setComposeSaving(true)

    const payload = {
      author_id:       user.id,
      title:           composeTitle,
      content_html:    composeHtml,
      cover_image_url: composeCover || null,
      category:        composeCategory || null,
      tags:            composeTags.split(',').map(t => t.trim()).filter(Boolean),
      status:          submit ? 'approved' : 'draft',
      published_at:    submit ? new Date().toISOString() : null,
    }

    const { data, error } = selectedPost
      ? await supabase.from('Blog_Posts').update(payload).eq('id', selectedPost.id).select('id').single()
      : await supabase.from('Blog_Posts').insert(payload).select('id').single()

    setComposeSaving(false)
    if (!error) {
      alert(submit ? 'Post published!' : 'Draft saved!')
      setMode('list'); load()
    } else {
      alert('Error: ' + error.message)
    }
  }

  const openCompose = (post = null) => {
    setSelectedPost(post)
    setComposeTitle(post?.title || '')
    setComposeHtml(post?.content_html || '')
    setComposeCover(post?.cover_image_url || '')
    setComposeCategory(post?.category || '')
    setComposeTags((post?.tags || []).join(', '))
    setAdminNotes('')
    setMode('compose')
  }

  const s = { fontFamily: 'DM Sans, sans-serif' }

  // ── Compose view ──────────────────────────────────────────────────
  if (mode === 'compose') {
    return (
      <div style={{ ...s, padding: '24px 32px', maxWidth: 900 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => setMode('list')}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-muted)', fontSize: 12,
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
            ← Back
          </button>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            {selectedPost ? 'Edit Post' : 'New Blog Post'}
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Cover image */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600,
              color: 'var(--text-muted)', marginBottom: 6,
              textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cover Image URL</label>
            <input
              value={composeCover} onChange={e => setComposeCover(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--surface-2)', color: 'var(--text)', fontSize: 13,
                fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }}
            />
            {composeCover && (
              <img src={composeCover} alt="" style={{ marginTop: 8, maxHeight: 160,
                borderRadius: 8, objectFit: 'cover', width: '100%' }} />
            )}
          </div>

          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600,
              color: 'var(--text-muted)', marginBottom: 6,
              textTransform: 'uppercase', letterSpacing: '0.05em' }}>Title *</label>
            <input
              value={composeTitle} onChange={e => setComposeTitle(e.target.value)}
              placeholder="Your post title…"
              style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--surface-2)', color: 'var(--text)', fontSize: 18,
                fontWeight: 700, fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }}
            />
          </div>

          {/* Category + Tags */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600,
                color: 'var(--text-muted)', marginBottom: 6,
                textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</label>
              <select value={composeCategory} onChange={e => setComposeCategory(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--surface-2)', color: 'var(--text)', fontSize: 13,
                  fontFamily: 'DM Sans, sans-serif' }}>
                <option value="">Select category…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600,
                color: 'var(--text-muted)', marginBottom: 6,
                textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tags (comma-separated)</label>
              <input value={composeTags} onChange={e => setComposeTags(e.target.value)}
                placeholder="meghalaya, trekking, solo"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--surface-2)', color: 'var(--text)', fontSize: 13,
                  fontFamily: 'DM Sans, sans-serif' }} />
            </div>
          </div>

          {/* TipTap editor */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600,
              color: 'var(--text-muted)', marginBottom: 6,
              textTransform: 'uppercase', letterSpacing: '0.05em' }}>Content *</label>
            <RichEditor content={composeHtml} onChange={setComposeHtml} />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingBottom: 32 }}>
            <button onClick={() => saveAdminPost(false)} disabled={composeSaving}
              style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              {composeSaving ? 'Saving…' : 'Save Draft'}
            </button>
            <button onClick={() => saveAdminPost(true)} disabled={composeSaving}
              style={{ padding: '10px 20px', borderRadius: 8, border: 'none',
                background: '#16a34a', color: 'white', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              {composeSaving ? 'Publishing…' : 'Publish Now'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Review view ───────────────────────────────────────────────────
  if (mode === 'review' && selectedPost) {
    return (
      <div style={{ ...s, padding: '24px 32px', maxWidth: 900 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => { setMode('list'); setSelectedPost(null) }}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-muted)', fontSize: 12,
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>← Back</button>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)', flex: 1 }}>
            Review: {selectedPost.title}
          </h2>
          <span style={{
            padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            color: STATUS_CONFIG[selectedPost.status]?.color,
            background: STATUS_CONFIG[selectedPost.status]?.bg,
          }}>
            {STATUS_CONFIG[selectedPost.status]?.label}
          </span>
        </div>

        {/* Cover */}
        {selectedPost.cover_image_url && (
          <img src={selectedPost.cover_image_url} alt=""
            style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 12, marginBottom: 20 }} />
        )}

        {/* Author + meta */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 13, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
          <span>👤 {selectedPost.Users?.full_name || selectedPost.Users?.username}</span>
          <span>✉️ {selectedPost.Users?.email}</span>
          {selectedPost.category && <span>🏷️ {selectedPost.category}</span>}
          <span>🕐 {new Date(selectedPost.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>

        {/* TipTap read-only preview */}
        <RichEditor content={selectedPost.content_html} readOnly />

        {/* Admin notes + actions */}
        <div style={{ marginTop: 24, padding: 20, background: 'var(--surface-2)', borderRadius: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600,
            color: 'var(--text-muted)', marginBottom: 8,
            textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Admin Notes (optional — shown to author)
          </label>
          <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
            rows={3} placeholder="Feedback for the author…"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--surface)', color: 'var(--text)', fontSize: 13,
              resize: 'vertical', fontFamily: 'DM Sans, sans-serif', boxSizing: 'border-box' }} />

          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <button onClick={() => takeAction('approved')} disabled={actionLoading}
              style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none',
                background: '#16a34a', color: 'white', fontSize: 13, fontWeight: 700,
                cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.6 : 1,
                fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <CheckCircle size={14} /> {actionLoading ? 'Processing…' : 'Approve & Publish'}
            </button>
            <button onClick={() => takeAction('on_hold')} disabled={actionLoading}
              style={{ flex: 1, padding: '10px 16px', borderRadius: 8,
                border: '1px solid #d97706', background: '#fffbeb',
                color: '#d97706', fontSize: 13, fontWeight: 700,
                cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.6 : 1,
                fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Pause size={14} /> On Hold
            </button>
            <button onClick={() => takeAction('rejected')} disabled={actionLoading}
              style={{ flex: 1, padding: '10px 16px', borderRadius: 8,
                border: '1px solid #dc2626', background: '#fef2f2',
                color: '#dc2626', fontSize: 13, fontWeight: 700,
                cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.6 : 1,
                fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <XCircle size={14} /> Reject
            </button>
            <button onClick={() => openCompose(selectedPost)}
              style={{ padding: '10px 16px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--surface)',
                color: 'var(--text)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Edit3 size={14} /> Edit
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── List view ─────────────────────────────────────────────────────
  return (
    <div style={{ ...s, padding: '28px 32px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>
            Blog Posts
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Review & approve community stories, or write official Hoppity content
          </p>
        </div>
        <button onClick={() => openCompose()}
          style={{ display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 18px', borderRadius: 10, border: 'none',
            background: 'var(--purple)', color: 'white', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            boxShadow: '0 2px 8px rgba(124,58,237,0.3)' }}>
          <PlusCircle size={15} /> New Post
        </button>
      </div>

      {/* Status filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {['All', 'pending', 'approved', 'on_hold', 'rejected', 'draft'].map(s => {
          const active = statusFilter === s
          const cfg = s === 'All' ? null : STATUS_CONFIG[s]
          const count = s === 'All' ? posts.length : (counts[s] || 0)
          return (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{ padding: '5px 14px', borderRadius: 20,
                border: `2px solid ${active ? (cfg?.color || 'var(--purple)') : 'var(--border)'}`,
                background: active ? (cfg?.bg || 'var(--surface-2)') : 'transparent',
                color: active ? (cfg?.color || 'var(--purple)') : 'var(--text-muted)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'DM Sans, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
              {s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}
              <span style={{ background: active ? (cfg?.color || 'var(--purple)') : 'var(--border)',
                color: active ? 'white' : 'var(--text-muted)',
                borderRadius: 99, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>
                {count}
              </span>
            </button>
          )
        })}
        <button onClick={load}
          style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--surface-2)',
            color: 'var(--text)', fontSize: 12, cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif' }}>
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 14 }}>
          Loading posts…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 14 }}>
          No {statusFilter === 'All' ? '' : statusFilter.replace('_', ' ')} posts yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(post => {
            const cfg = STATUS_CONFIG[post.status] || STATUS_CONFIG.draft
            const author = post.Users
            return (
              <div key={post.id} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '14px 18px',
                display: 'grid', gridTemplateColumns: '56px 1fr auto',
                gap: 14, alignItems: 'start',
              }}>
                {/* Cover thumbnail */}
                <div style={{ width: 56, height: 56, borderRadius: 8, overflow: 'hidden',
                  background: 'var(--surface-2)', flexShrink: 0 }}>
                  {post.cover_image_url ? (
                    <img src={post.cover_image_url} alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📝</div>
                  )}
                </div>

                {/* Info */}
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                    {post.title}
                  </p>
                  <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--text-muted)',
                    flexWrap: 'wrap', marginBottom: 4 }}>
                    <span>👤 {author?.full_name || author?.username || '—'}</span>
                    {post.category && <span>🏷️ {post.category}</span>}
                    <span>🕐 {new Date(post.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    <span>👁️ {post.views_count} views</span>
                    <span>❤️ {post.likes_count}</span>
                    <span>💬 {post.comments_count}</span>
                  </div>
                  {post.admin_notes && (
                    <p style={{ margin: 0, fontSize: 11, color: cfg.color,
                      background: cfg.bg, padding: '3px 8px', borderRadius: 6, display: 'inline-block' }}>
                      Note: {post.admin_notes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 11, fontWeight: 700, color: cfg.color,
                    background: cfg.bg, padding: '3px 10px', borderRadius: 20 }}>
                    {cfg.label}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => { setSelectedPost(post); setAdminNotes(post.admin_notes || ''); setMode('review') }}
                      style={{ padding: '4px 10px', borderRadius: 6,
                        border: '1px solid var(--purple)', background: 'rgba(124,58,237,0.08)',
                        color: 'var(--purple)', fontSize: 11, fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                      Review →
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* TipTap prose styles */}
      <style>{`
        .tiptap-editor .ProseMirror h1 { font-size: 26px; font-weight: 800; margin: 20px 0 10px; }
        .tiptap-editor .ProseMirror h2 { font-size: 20px; font-weight: 700; margin: 16px 0 8px; }
        .tiptap-editor .ProseMirror h3 { font-size: 17px; font-weight: 700; margin: 14px 0 6px; }
        .tiptap-editor .ProseMirror p { margin: 0 0 12px; line-height: 1.75; }
        .tiptap-editor .ProseMirror blockquote { border-left: 3px solid #7C3AED; padding-left: 14px; color: #64748b; font-style: italic; margin: 12px 0; }
        .tiptap-editor .ProseMirror ul, .tiptap-editor .ProseMirror ol { padding-left: 24px; margin-bottom: 12px; }
        .tiptap-editor .ProseMirror li { margin-bottom: 4px; }
        .tiptap-editor .ProseMirror code { background: #F3F4F6; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
        .tiptap-editor .ProseMirror img { max-width: 100%; border-radius: 10px; margin: 8px 0; }
        .tiptap-editor .ProseMirror a { color: #7C3AED; text-decoration: underline; }
        .tiptap-editor .ProseMirror .is-editor-empty:first-child::before { color: #94a3b8; content: attr(data-placeholder); float: left; height: 0; pointer-events: none; }
        mark { background-color: #fef9c3; padding: 1px 2px; border-radius: 3px; }
      `}</style>
    </div>
  )
}
