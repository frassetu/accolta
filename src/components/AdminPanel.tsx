'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, Upload, Search, ChevronLeft, Eye, EyeOff, LogOut, CheckCircle, AlertCircle, Loader, X, Download } from 'lucide-react'
import { supabase, Song } from '@/lib/supabase'

interface Props {
  isAdmin: boolean
  onLogin: () => void
  onClose: () => void
}

type AdminTab = 'songs' | 'add' | 'import'

type ImportStatus =
  | { state: 'idle' }
  | { state: 'uploading' }
  | { state: 'done'; total_in_file: number; after_dedup: number; inserted: number; errors: string[] }
  | { state: 'error'; message: string }

const emptyForm = { artiste: '', album: '', numero: '', titre: '', annee: '', paroles: '' }

export default function AdminPanel({ isAdmin, onLogin, onClose }: Props) {
  const [tab, setTab] = useState<AdminTab>('songs')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [songs, setSongs] = useState<Song[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [editSong, setEditSong] = useState<Song | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [importStatus, setImportStatus] = useState<ImportStatus>({ state: 'idle' })
  const [stats, setStats] = useState({ total: 0, withLyrics: 0, artists: 0 })
  const [artistSuggestions, setArtistSuggestions] = useState<string[]>([])
  const [albumSuggestions, setAlbumSuggestions] = useState<string[]>([])
  const [showArtistSug, setShowArtistSug] = useState(false)
  const [showAlbumSug, setShowAlbumSug] = useState(false)
  const [exporting, setExporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''
  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || ''

  const getToken = () =>
    typeof window !== 'undefined' ? sessionStorage.getItem('accolta_admin_token') || '' : ''

  useEffect(() => {
    if (isAdmin) { loadSongs(); loadStats() }
  }, [isAdmin])

  // FIX: load ALL songs (no limit), with server-side search
  const loadSongs = async (q?: string) => {
    setLoading(true)
    let query = supabase.from('chansons').select('*').order('artiste')

    if (q && q.trim()) {
      query = query.or(`artiste.ilike.%${q}%,titre.ilike.%${q}%,album.ilike.%${q}%`)
    }

    // Paginate to get all results
    let allData: Song[] = []
    let from = 0
    const pageSize = 1000
    while (true) {
      const { data } = await query.range(from, from + pageSize - 1)
      if (!data || data.length === 0) break
      allData = [...allData, ...data]
      if (data.length < pageSize) break
      from += pageSize
    }
    setSongs(allData)
    setLoading(false)
  }

  const loadStats = async () => {
    const res = await fetch('/api/admin?action=stats', {
      headers: { 'x-admin-token': getToken() },
    })
    if (res.ok) {
      const d = await res.json()
      setStats({ total: d.total || 0, withLyrics: d.withLyrics || 0, artists: d.artists || 0 })
    }
  }

  // Debounced search
  const searchRef = useRef<NodeJS.Timeout>()
  const handleSearchChange = (val: string) => {
    setSearch(val)
    clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => loadSongs(val), 400)
  }

  const handleExportCSV = async () => {
    setExporting(true)
    const res = await fetch('/api/admin?action=export', {
      headers: { 'x-admin-token': getToken() },
    })
    if (res.ok) {
      const data: Song[] = await res.json()
      const headers = ['id', 'artiste', 'album', 'titre', 'annee', 'numero', 'paroles']
      const escape = (v: any) => {
        if (v == null) return ''
        const str = String(v).replace(/"/g, '""')
        return str.includes(',') || str.includes('\n') || str.includes('"') ? `"${str}"` : str
      }
      const rows = [headers.join(','), ...data.map(s =>
        headers.map(h => escape((s as any)[h])).join(',')
      )].join('\n')
      const blob = new Blob(['\uFEFF' + rows], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `accolta_export_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
    setExporting(false)
  }

  const searchArtists = async (val: string) => {
    if (!val.trim()) { setArtistSuggestions([]); return }
    const { data } = await supabase.from('chansons').select('artiste').ilike('artiste', `${val}%`).limit(8)
   if (data) setArtistSuggestions(Array.from(new Set(data.map((r) => r.artiste))))
  }

  const searchAlbums = async (val: string, artiste: string) => {
    if (!val.trim()) { setAlbumSuggestions([]); return }
    let q = supabase.from('chansons').select('album').ilike('album', `${val}%`).limit(8)
    if (artiste.trim()) q = q.ilike('artiste', `%${artiste}%`)
    const { data } = await q
    if (data) setAlbumSuggestions(Array.from(new Set(data.map((r) => r.album).filter(Boolean))))
  }

  const handleLogin = () => {
    if (email.trim() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      sessionStorage.setItem('accolta_admin_token', password)
      onLogin()
      setLoginError('')
    } else {
      setLoginError('Email ou mot de passe incorrect')
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('accolta_admin')
    sessionStorage.removeItem('accolta_admin_token')
    onClose()
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditSong(null)
    setSaveError('')
    setArtistSuggestions([])
    setAlbumSuggestions([])
  }

  const handleSave = async () => {
    if (!form.artiste.trim() || !form.titre.trim()) return
    setSaving(true)
    setSaveError('')
    const payload = {
      artiste: form.artiste.trim(),
      album: form.album.trim(),
      numero: form.numero ? parseInt(form.numero) : null,
      titre: form.titre.trim(),
      annee: form.annee ? parseInt(form.annee) : null,
      paroles: form.paroles.trim() || null,
    }
    const action = editSong ? 'update' : 'upsert'
    const body = editSong ? { action, id: editSong.id, ...payload } : { action, ...payload }
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': getToken() },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (res.ok) {
      resetForm()
      setTab(editSong ? 'songs' : 'add')
      loadSongs(search)
      loadStats()
    } else {
      const err = await res.json().catch(() => ({ error: 'Erreur inconnue' }))
      setSaveError(err.error || 'Erreur lors de la sauvegarde')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette chanson ?')) return
    await fetch(`/api/admin?id=${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-token': getToken() },
    })
    loadSongs(search)
    loadStats()
  }

  const startEdit = (song: Song) => {
    setEditSong(song)
    setForm({
      artiste: song.artiste,
      album: song.album || '',
      numero: (song as any).numero?.toString() || '',
      titre: song.titre,
      annee: song.annee?.toString() || '',
      paroles: song.paroles || '',
    })
    setTab('add')
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImportStatus({ state: 'uploading' })
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'x-admin-token': getToken() },
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur serveur' }))
        setImportStatus({ state: 'error', message: err.error || 'Erreur serveur' })
        return
      }
      const result = await res.json()
      setImportStatus({
        state: 'done',
        total_in_file: result.total_in_file,
        after_dedup: result.after_dedup,
        inserted: result.inserted,
        errors: result.errors || [],
      })
      loadStats()
      loadSongs()
    } catch (err: any) {
      setImportStatus({ state: 'error', message: err.message || 'Erreur inconnue' })
    }
  }

  // Login screen
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-bg flex flex-col max-w-lg mx-auto">
        <button onClick={onClose} className="absolute top-14 left-4 w-9 h-9 rounded-xl bg-card flex items-center justify-center z-10">
          <ChevronLeft className="w-5 h-5 text-text" />
        </button>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="font-display font-bold text-2xl text-text mb-1">Espace administrateur</h1>
          <p className="text-text-muted text-sm mb-8">Acces reserve</p>
          <div className="w-full space-y-3">
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border">
              <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent text-text text-sm outline-none placeholder:text-muted" />
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border">
              <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input type={showPwd ? 'text' : 'password'} placeholder="Mot de passe" value={password}
                onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="flex-1 bg-transparent text-text text-sm outline-none placeholder:text-muted" />
              <button onClick={() => setShowPwd(!showPwd)}>
                {showPwd ? <EyeOff className="w-4 h-4 text-muted" /> : <Eye className="w-4 h-4 text-muted" />}
              </button>
            </div>
            {loginError && <p className="text-red-400 text-sm text-center">{loginError}</p>}
            <button onClick={handleLogin}
              className="w-full py-3.5 rounded-2xl accent-gradient text-white font-display font-semibold text-sm">
              Se connecter
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-14 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-card flex items-center justify-center">
            <X className="w-4 h-4 text-text" />
          </button>
          <h1 className="font-display font-bold text-lg text-text">Admin</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium"
          >
            {exporting ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Export CSV
          </button>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-muted text-sm">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3 px-4 py-3 border-b border-border">
        {[{ label: 'Chansons', value: stats.total }, { label: 'Avec paroles', value: stats.withLyrics }, { label: 'Artistes', value: stats.artists }].map((s) => (
          <div key={s.label} className="flex-1 bg-card rounded-xl p-2.5 text-center">
            <p className="font-display font-bold text-accent text-lg">{s.value}</p>
            <p className="text-muted text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 py-3 border-b border-border">
        {(['songs', 'add', 'import'] as AdminTab[]).map((t) => (
          <button key={t} onClick={() => { setTab(t); if (t !== 'add') resetForm(); if (t === 'import') setImportStatus({ state: 'idle' }) }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t ? 'bg-accent text-white' : 'bg-card text-text-muted'}`}>
            {t === 'songs' ? 'Chansons' : t === 'add' ? (editSong ? 'Modifier' : 'Ajouter') : 'Importer'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto px-4 py-4">

        {/* SONGS LIST — server-side search, no limit */}
        {tab === 'songs' && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-card border border-border">
                <Search className="w-4 h-4 text-muted" />
                <input value={search} onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Rechercher dans toutes les chansons…"
                  className="flex-1 bg-transparent text-text text-sm outline-none placeholder:text-muted" />
                {search && <button onClick={() => { setSearch(''); loadSongs() }}><X className="w-4 h-4 text-muted" /></button>}
              </div>
              <button onClick={() => { resetForm(); setTab('add') }}
                className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                <Plus className="w-5 h-5 text-white" />
              </button>
            </div>
            {loading ? (
              <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-card pulse" />)}</div>
            ) : (
              <div className="space-y-2 pb-10">
                {songs.length === 0 && <p className="text-center text-text-muted py-8">Aucune chanson trouvée</p>}
                {songs.map((song) => (
                  <div key={song.id} className="flex items-center gap-3 p-3 rounded-xl bg-card">
                    <div className="flex-1 min-w-0">
                      <p className="text-text text-sm font-medium truncate">{song.artiste}</p>
                      <p className="text-text-muted text-xs truncate">{song.titre}{song.annee ? ` - ${song.annee}` : ''}</p>
                    </div>
                    {!song.paroles && (
                      <span className="text-xs text-muted bg-border px-2 py-0.5 rounded-full flex-shrink-0">Sans paroles</span>
                    )}
                    <button onClick={() => startEdit(song)} className="p-1.5 flex-shrink-0">
                      <Pencil className="w-4 h-4 text-accent" />
                    </button>
                    <button onClick={() => handleDelete(song.id)} className="p-1.5 flex-shrink-0">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FORM */}
        {tab === 'add' && (
          <div className="pb-10">
            <div className="flex items-center gap-3 mb-5">
              <button onClick={() => { setTab('songs'); resetForm() }}
                className="w-8 h-8 rounded-xl bg-card flex items-center justify-center flex-shrink-0">
                <ChevronLeft className="w-4 h-4 text-text" />
              </button>
              <h2 className="font-display font-semibold text-text">{editSong ? 'Modifier la chanson' : 'Nouvelle chanson'}</h2>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <label className="text-text-muted text-xs mb-1.5 block">Artiste *</label>
                <input type="text" value={form.artiste}
                  onChange={(e) => { setForm((f) => ({ ...f, artiste: e.target.value })); searchArtists(e.target.value); setShowArtistSug(true) }}
                  onBlur={() => setTimeout(() => setShowArtistSug(false), 150)}
                  placeholder="Nom de l'artiste"
                  className="w-full px-4 py-3 rounded-xl bg-card border border-border text-text text-sm outline-none placeholder:text-muted focus:border-accent transition-colors" />
                {showArtistSug && artistSuggestions.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-xl overflow-hidden shadow-lg">
                    {artistSuggestions.map((a) => (
                      <button key={a} className="w-full text-left px-4 py-2.5 text-sm text-text hover:bg-border transition-colors"
                        onMouseDown={() => { setForm((f) => ({ ...f, artiste: a })); setShowArtistSug(false); setArtistSuggestions([]) }}>{a}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <label className="text-text-muted text-xs mb-1.5 block">Album</label>
                <input type="text" value={form.album}
                  onChange={(e) => { setForm((f) => ({ ...f, album: e.target.value })); searchAlbums(e.target.value, form.artiste); setShowAlbumSug(true) }}
                  onBlur={() => setTimeout(() => setShowAlbumSug(false), 150)}
                  placeholder="Nom de l'album"
                  className="w-full px-4 py-3 rounded-xl bg-card border border-border text-text text-sm outline-none placeholder:text-muted focus:border-accent transition-colors" />
                {showAlbumSug && albumSuggestions.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-xl overflow-hidden shadow-lg">
                    {albumSuggestions.map((a) => (
                      <button key={a} className="w-full text-left px-4 py-2.5 text-sm text-text hover:bg-border transition-colors"
                        onMouseDown={() => { setForm((f) => ({ ...f, album: a })); setShowAlbumSug(false); setAlbumSuggestions([]) }}>{a}</button>
                    ))}
                  </div>
                )}
              </div>
              {[
                { key: 'numero', label: 'N° de piste', placeholder: '1', type: 'number' },
                { key: 'titre', label: 'Titre *', placeholder: 'Titre de la chanson', type: 'text' },
                { key: 'annee', label: 'Annee', placeholder: '2024', type: 'number' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="text-text-muted text-xs mb-1.5 block">{label}</label>
                  <input type={type} inputMode={type === 'number' ? 'numeric' : undefined} value={(form as any)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                    className="w-full px-4 py-3 rounded-xl bg-card border border-border text-text text-sm outline-none placeholder:text-muted focus:border-accent transition-colors" />
                </div>
              ))}
              <div>
                <label className="text-text-muted text-xs mb-1.5 block">Paroles</label>
                <textarea value={form.paroles} onChange={(e) => setForm((f) => ({ ...f, paroles: e.target.value }))}
                  placeholder="Coller les paroles ici..." rows={10}
                  className="w-full px-4 py-3 rounded-xl bg-card border border-border text-text text-sm outline-none placeholder:text-muted focus:border-accent transition-colors resize-none" />
              </div>
            </div>
            {saveError && (
              <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                <p className="text-red-400 text-sm">{saveError}</p>
              </div>
            )}
            <button onClick={handleSave} disabled={!form.artiste.trim() || !form.titre.trim() || saving}
              className="mt-4 w-full py-3.5 rounded-xl accent-gradient text-white font-display font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader className="w-4 h-4 animate-spin" />}
              {editSong ? 'Enregistrer les modifications' : 'Ajouter la chanson'}
            </button>
            {!editSong && <p className="text-center text-text-muted text-xs mt-3">Le formulaire se videra après ajout</p>}
          </div>
        )}

        {/* IMPORT */}
        {tab === 'import' && (
          <div className="space-y-4 pb-10">
            <div>
              <h2 className="font-display font-semibold text-text mb-1">Importer un fichier Excel</h2>
              <p className="text-text-muted text-sm">Les doublons sont detectes automatiquement.</p>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border text-xs space-y-1">
              <p className="text-text-muted font-medium mb-2">Colonnes reconnues :</p>
              {[['Artiste','Artistu / Artiste'],['Titre','Titulu / Titre'],['Album','Dischettu / Album'],['Annee','Annata / Annee'],['Paroles','Parolle / Paroles']].map(([l,v])=>(
                <p key={l}><span className="text-muted">{l} : </span><span className="text-accent font-mono">{v}</span></p>
              ))}
            </div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
            {(importStatus.state === 'idle' || importStatus.state === 'error') && (
              <button onClick={() => fileRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-3 py-10 rounded-2xl border-2 border-dashed border-border hover:border-accent transition-colors group">
                <Upload className="w-8 h-8 text-muted group-hover:text-accent transition-colors" />
                <div className="text-center">
                  <p className="font-medium text-text">Choisir un fichier</p>
                  <p className="text-text-muted text-sm">.xlsx, .xls ou .csv</p>
                </div>
              </button>
            )}
            {importStatus.state === 'uploading' && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-card">
                <Loader className="w-5 h-5 text-accent animate-spin flex-shrink-0" />
                <p className="text-text text-sm">Import en cours...</p>
              </div>
            )}
            {importStatus.state === 'done' && (
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <p className="text-green-400 font-semibold">Import terminé !</p>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-text-muted">Lignes : <span className="text-text font-medium">{importStatus.total_in_file}</span></p>
                  <p className="text-text-muted">Après dédoublonnage : <span className="text-text font-medium">{importStatus.after_dedup}</span></p>
                  <p className="text-text-muted">Importées : <span className="text-green-400 font-medium">{importStatus.inserted}</span></p>
                </div>
                {importStatus.errors.map((e, i) => <p key={i} className="text-yellow-400 text-xs">{e}</p>)}
                <button onClick={() => setImportStatus({ state: 'idle' })}
                  className="w-full py-2.5 rounded-xl bg-green-500/20 text-green-400 text-sm font-medium">
                  Importer un autre fichier
                </button>
              </div>
            )}
            {importStatus.state === 'error' && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-semibold text-sm">Erreur</p>
                    <p className="text-red-400/80 text-xs mt-1">{importStatus.message}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
