'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Plus, Pencil, Trash2, Upload, Search, ChevronLeft, Eye, EyeOff, LogOut, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { supabase, Song } from '@/lib/supabase'

interface Props {
  isAdmin: boolean
  onLogin: () => void
  onClose: () => void
}

type AdminTab = 'songs' | 'add' | 'import'

type ImportStatus =
  | { state: 'idle' }
  | { state: 'reading' }
  | { state: 'uploading'; progress: number; total: number }
  | { state: 'done'; total_in_file: number; after_dedup: number; inserted: number; errors: string[] }
  | { state: 'error'; message: string }

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
  const [form, setForm] = useState({ artiste: '', album: '', titre: '', annee: '', paroles: '' })
  const [saving, setSaving] = useState(false)
  const [importStatus, setImportStatus] = useState<ImportStatus>({ state: 'idle' })
  const [stats, setStats] = useState({ total: 0, withLyrics: 0, artists: 0 })
  const fileRef = useRef<HTMLInputElement>(null)

  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || ''
  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || ''

  const adminToken = () =>
    typeof window !== 'undefined' ? sessionStorage.getItem('accolta_admin_token') || '' : ''

  const adminHeaders = () => ({
    'Content-Type': 'application/json',
    'x-admin-token': adminToken(),
  })

  useEffect(() => {
    if (isAdmin) { loadSongs(); loadStats() }
  }, [isAdmin])

  const loadSongs = async () => {
    setLoading(true)
    const { data } = await supabase.from('chansons').select('*').order('artiste').limit(200)
    if (data) setSongs(data)
    setLoading(false)
  }

  const loadStats = async () => {
    const res = await fetch('/api/admin?action=stats', { headers: adminHeaders() })
    if (res.ok) {
      const d = await res.json()
      setStats({ total: d.total || 0, withLyrics: d.withLyrics || 0, artists: d.artists || 0 })
    }
  }

  const handleLogin = () => {
    if (email.trim() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      // Génère un token de session simple
      const token = process.env.NEXT_PUBLIC_ADMIN_SESSION_TOKEN ||
        btoa(`${email}:${password}:${Date.now()}`)
      sessionStorage.setItem('accolta_admin_token', token)
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

  const handleSave = async () => {
    if (!form.artiste || !form.titre) return
    setSaving(true)
    const payload = {
      artiste: form.artiste.trim(),
      album: form.album.trim(),
      titre: form.titre.trim(),
      annee: form.annee ? parseInt(form.annee) : null,
      paroles: form.paroles.trim() || null,
    }

    const action = editSong ? 'update' : 'upsert'
    const body = editSong ? { action, id: editSong.id, ...payload } : { action, ...payload }

    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify(body),
    })

    setSaving(false)
    if (res.ok) {
      setForm({ artiste: '', album: '', titre: '', annee: '', paroles: '' })
      setEditSong(null)
      setTab('songs')
      loadSongs()
      loadStats()
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette chanson ?')) return
    await fetch(`/api/admin?id=${id}`, { method: 'DELETE', headers: adminHeaders() })
    loadSongs()
    loadStats()
  }

  const startEdit = (song: Song) => {
    setEditSong(song)
    setForm({
      artiste: song.artiste,
      album: song.album || '',
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

    setImportStatus({ state: 'reading' })

    try {
      // Lecture du fichier Excel côté client
      const XLSX = (await import('xlsx')).default
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rawRows: any[] = XLSX.utils.sheet_to_json(ws)

      // Mapping des colonnes (supporte plusieurs nommages)
      const mapped = rawRows
        .map(r => ({
          artiste: (r['Artistu'] || r['artiste'] || r['Artiste'] || '').toString().trim(),
          album:   (r['Dischettu'] || r['album'] || r['Album'] || '').toString().trim(),
          titre:   (r['Titulu'] || r['titre'] || r['Titre'] || '').toString().trim(),
          annee:   r['Annata'] || r['annee'] || r['Année']
            ? parseInt(r['Annata'] || r['annee'] || r['Année']) || null
            : null,
          paroles: (r['Parolle'] || r['paroles'] || r['Paroles'] || '') || null,
        }))
        .filter(r => r.artiste && r.titre)

      if (mapped.length === 0) {
        setImportStatus({ state: 'error', message: 'Aucune ligne valide trouvée. Vérifie que le fichier a les colonnes : Artistu, Titulu (ou Artiste, Titre).' })
        return
      }

      // Envoi vers l'API en un seul appel (le serveur gère le dédoublonnage et les batches)
      setImportStatus({ state: 'uploading', progress: 0, total: mapped.length })

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ action: 'import', rows: mapped }),
      })

      if (!res.ok) {
        const err = await res.json()
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

  const filtered = songs.filter(s =>
    !search ||
    s.artiste.toLowerCase().includes(search.toLowerCase()) ||
    s.titre.toLowerCase().includes(search.toLowerCase())
  )

  // ─── Écran de connexion ───────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 max-w-lg mx-auto">
        <button onClick={onClose} className="absolute top-14 left-4 w-9 h-9 rounded-xl bg-card flex items-center justify-center">
          <ChevronLeft className="w-5 h-5 text-text" />
        </button>

        <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h1 className="font-display font-bold text-2xl text-text mb-1">Espace administrateur</h1>
        <p className="text-text-muted text-sm mb-8">Accès réservé</p>

        <div className="w-full space-y-3">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border">
            <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="flex-1 bg-transparent text-text text-sm outline-none placeholder:text-muted"
            />
          </div>

          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border">
            <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <input
              type={showPwd ? 'text' : 'password'}
              placeholder="Mot de passe"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="flex-1 bg-transparent text-text text-sm outline-none placeholder:text-muted"
            />
            <button onClick={() => setShowPwd(!showPwd)}>
              {showPwd ? <EyeOff className="w-4 h-4 text-muted" /> : <Eye className="w-4 h-4 text-muted" />}
            </button>
          </div>

          {loginError && <p className="text-red-400 text-sm text-center">{loginError}</p>}

          <button
            onClick={handleLogin}
            className="w-full py-3.5 rounded-2xl accent-gradient text-white font-display font-semibold text-sm"
          >
            Se connecter
          </button>
        </div>

        <p className="text-muted text-xs mt-8 text-center">
          Accès réservé uniquement à l'administrateur.<br />
          Les visiteurs peuvent consulter et ajouter des favoris.
        </p>
      </div>
    )
  }

  // ─── Dashboard admin ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-14 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="font-display font-bold text-lg text-text">Admin</h1>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-1.5 text-muted text-sm">
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-3 px-4 py-3 border-b border-border">
        {[
          { label: 'Chansons', value: stats.total },
          { label: 'Avec paroles', value: stats.withLyrics },
          { label: 'Artistes', value: stats.artists },
        ].map(s => (
          <div key={s.label} className="flex-1 bg-card rounded-xl p-2.5 text-center">
            <p className="font-display font-bold text-accent text-lg">{s.value}</p>
            <p className="text-muted text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 py-3 border-b border-border">
        {([
          { id: 'songs', label: 'Chansons' },
          { id: 'add',   label: editSong ? 'Modifier' : 'Ajouter' },
          { id: 'import', label: 'Importer' },
        ] as { id: AdminTab; label: string }[]).map(t => (
          <button
            key={t.id}
            onClick={() => {
              setTab(t.id)
              if (t.id !== 'add') { setEditSong(null); setForm({ artiste: '', album: '', titre: '', annee: '', paroles: '' }) }
              if (t.id === 'import') setImportStatus({ state: 'idle' })
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.id ? 'bg-accent text-white' : 'bg-card text-text-muted'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 py-4">

        {/* ── Liste des chansons ── */}
        {tab === 'songs' && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-card border border-border">
                <Search className="w-4 h-4 text-muted" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher une chanson…"
                  className="flex-1 bg-transparent text-text text-sm outline-none placeholder:text-muted"
                />
              </div>
              <button
                onClick={() => { setTab('add'); setEditSong(null) }}
                className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0"
              >
                <Plus className="w-5 h-5 text-white" />
              </button>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-card pulse" />)}
              </div>
            ) : (
              <div className="space-y-2 pb-10">
                {filtered.map(song => (
                  <div key={song.id} className="flex items-center gap-3 p-3 rounded-xl bg-card">
                    <div className="flex-1 min-w-0">
                      <p className="text-text text-sm font-medium truncate">{song.artiste}</p>
                      <p className="text-text-muted text-xs truncate">{song.titre}{song.annee ? ` · ${song.annee}` : ''}</p>
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
                {filtered.length === 0 && (
                  <p className="text-center text-text-muted py-8">Aucune chanson trouvée</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Ajouter / Modifier ── */}
        {tab === 'add' && (
          <div className="space-y-3 pb-10">
            <h2 className="font-display font-semibold text-text mb-4">
              {editSong ? `Modifier "${editSong.titre}"` : 'Nouvelle chanson'}
            </h2>
            {[
              { key: 'artiste', label: 'Artiste *', placeholder: "Nom de l'artiste" },
              { key: 'titre',   label: 'Titre *',   placeholder: 'Titre de la chanson' },
              { key: 'album',   label: 'Album',      placeholder: "Nom de l'album" },
              { key: 'annee',   label: 'Année',      placeholder: '2024' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-text-muted text-xs mb-1.5 block">{label}</label>
                <input
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full px-4 py-3 rounded-xl bg-card border border-border text-text text-sm outline-none placeholder:text-muted focus:border-accent transition-colors"
                />
              </div>
            ))}
            <div>
              <label className="text-text-muted text-xs mb-1.5 block">Paroles</label>
              <textarea
                value={form.paroles}
                onChange={e => setForm(f => ({ ...f, paroles: e.target.value }))}
                placeholder="Coller les paroles ici…"
                rows={10}
                className="w-full px-4 py-3 rounded-xl bg-card border border-border text-text text-sm outline-none placeholder:text-muted focus:border-accent transition-colors resize-none"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={!form.artiste || !form.titre || saving}
              className="w-full py-3.5 rounded-xl accent-gradient text-white font-display font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader className="w-4 h-4 animate-spin" />}
              {editSong ? 'Enregistrer les modifications' : 'Ajouter la chanson'}
            </button>
          </div>
        )}

        {/* ── Import Excel ── */}
        {tab === 'import' && (
          <div className="space-y-4 pb-10">
            <div>
              <h2 className="font-display font-semibold text-text mb-1">Importer un fichier Excel</h2>
              <p className="text-text-muted text-sm">
                Les doublons sont détectés et ignorés automatiquement.
              </p>
            </div>

            {/* Format attendu */}
            <div className="p-3 rounded-xl bg-card border border-border">
              <p className="text-text-muted text-xs font-medium mb-2">Colonnes reconnues dans le fichier :</p>
              <div className="grid grid-cols-2 gap-1">
                {[
                  ['Artiste', 'Artistu / Artiste'],
                  ['Titre', 'Titulu / Titre'],
                  ['Album', 'Dischettu / Album'],
                  ['Année', 'Annata / Année'],
                  ['Paroles', 'Parolle / Paroles'],
                ].map(([label, val]) => (
                  <div key={label}>
                    <span className="text-muted text-xs">{label} : </span>
                    <span className="text-accent text-xs font-mono">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Zone de dépôt */}
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />

            {importStatus.state === 'idle' || importStatus.state === 'error' ? (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-3 py-10 rounded-2xl border-2 border-dashed border-border hover:border-accent transition-colors group"
              >
                <Upload className="w-8 h-8 text-muted group-hover:text-accent transition-colors" />
                <div className="text-center">
                  <p className="font-medium text-text">Choisir un fichier</p>
                  <p className="text-text-muted text-sm">.xlsx, .xls ou .csv</p>
                </div>
              </button>
            ) : null}

            {/* États */}
            {importStatus.state === 'reading' && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-card">
                <Loader className="w-5 h-5 text-accent animate-spin flex-shrink-0" />
                <p className="text-text text-sm">Lecture du fichier…</p>
              </div>
            )}

            {importStatus.state === 'uploading' && (
              <div className="p-4 rounded-xl bg-card space-y-2">
                <div className="flex items-center gap-3">
                  <Loader className="w-5 h-5 text-accent animate-spin flex-shrink-0" />
                  <p className="text-text text-sm">Import en cours…</p>
                </div>
                <p className="text-text-muted text-xs">{importStatus.total} chansons à importer</p>
              </div>
            )}

            {importStatus.state === 'done' && (
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <p className="text-green-400 font-semibold">Import terminé !</p>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-text-muted">
                    Lignes dans le fichier : <span className="text-text font-medium">{importStatus.total_in_file}</span>
                  </p>
                  <p className="text-text-muted">
                    Après dédoublonnage : <span className="text-text font-medium">{importStatus.after_dedup}</span>
                    {importStatus.total_in_file - importStatus.after_dedup > 0 && (
                      <span className="text-muted ml-1">({importStatus.total_in_file - importStatus.after_dedup} doublons ignorés)</span>
                    )}
                  </p>
                  <p className="text-text-muted">
                    Ajoutées / mises à jour : <span className="text-green-400 font-medium">{importStatus.inserted}</span>
                  </p>
                </div>
                {importStatus.errors.length > 0 && (
                  <div className="pt-2 border-t border-green-500/20">
                    <p className="text-yellow-400 text-xs font-medium mb-1">Avertissements :</p>
                    {importStatus.errors.map((e, i) => (
                      <p key={i} className="text-yellow-400/70 text-xs">{e}</p>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setImportStatus({ state: 'idle' })}
                  className="w-full py-2.5 rounded-xl bg-green-500/20 text-green-400 text-sm font-medium"
                >
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
