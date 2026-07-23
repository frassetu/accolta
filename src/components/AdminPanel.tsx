'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, Upload, Search, ChevronLeft, Eye, EyeOff, LogOut, CheckCircle, AlertCircle, Loader, X, Download, Music2 } from 'lucide-react'
import { supabase, Song } from '@/lib/supabase'
import { sanitizeSearch } from '@/lib/format'
import { invalidateSongs, getAllSongs } from '@/lib/songs'
import TopBar from './TopBar'

interface Props {
  isAdmin: boolean
  onLogin: () => void
  onLogout: () => void
  onClose: () => void
}

type AdminTab = 'missing' | 'add' | 'import'
type MissingView = 'artists' | 'albums' | 'songs'

interface MissingSong {
  id: number
  artiste: string
  album: string | null
  titre: string
  numero: number | null
  annee: number | null
  paroles: string | null
}
interface MissingArtist { name: string; count: number; albums: string[] }
interface MissingAlbum { name: string; count: number }

type ImportStatus =
  | { state: 'idle' }
  | { state: 'uploading' }
  | { state: 'done'; total_in_file: number; inserted: number; errors: string[] }
  | { state: 'error'; message: string }

const emptyForm = { artiste: '', album: '', numero: '', titre: '', annee: '', paroles: '' }

export default function AdminPanel({ isAdmin, onLogin, onLogout, onClose }: Props) {
  const [tab, setTab] = useState<AdminTab>('missing')
  const [missingView, setMissingView] = useState<MissingView>('artists')
  const [missingSongs, setMissingSongs] = useState<MissingSong[]>([])
  const [missingArtists, setMissingArtists] = useState<MissingArtist[]>([])
  const [missingSelectedArtist, setMissingSelectedArtist] = useState<string | null>(null)
  const [missingSelectedAlbum, setMissingSelectedAlbum] = useState<string | null>(null)
  const [loadingMissing, setLoadingMissing] = useState(false)
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
  const [allSongsCache, setAllSongsCache] = useState<Song[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const [loggingIn, setLoggingIn] = useState(false)

  useEffect(() => {
    if (isAdmin) { loadSongs(); loadStats(); loadMissing(); getAllSongs().then(setAllSongsCache) }
  }, [isAdmin])

  const loadMissing = async () => {
    setLoadingMissing(true)
    const res = await fetch('/api/admin?action=missing-lyrics')
    if (res.ok) {
      const data: MissingSong[] = await res.json()
      setMissingSongs(data)
      // Grouper par artiste
      const map = new Map<string, { count: number; albums: Set<string> }>()
      for (const s of data) {
        if (!map.has(s.artiste)) map.set(s.artiste, { count: 0, albums: new Set() })
        const entry = map.get(s.artiste)!
        entry.count++
        if (s.album) entry.albums.add(s.album)
      }
      const list: MissingArtist[] = Array.from(map.entries()).map(([name, v]) => ({
        name,
        count: v.count,
        albums: Array.from(v.albums).sort(),
      })).sort((a, b) => a.name.localeCompare(b.name))
      setMissingArtists(list)
    }
    setLoadingMissing(false)
  }

  // FIX: load ALL songs (no limit), with server-side search
  const loadSongs = async (q?: string) => {
    setLoading(true)
    let query = supabase.from('chansons').select('*').order('artiste')

    const safe = q ? sanitizeSearch(q) : ''
    if (safe) {
      query = query.or(`artiste.ilike.%${safe}%,titre.ilike.%${safe}%,album.ilike.%${safe}%`)
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
    const res = await fetch('/api/admin?action=stats')
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
    const res = await fetch('/api/admin?action=export')
    if (res.ok) {
      const data: Song[] = await res.json()
      const headers = ['id', 'artiste', 'album', 'numero', 'titre', 'annee', 'paroles']
      const rows = data.map(s => {
        const row: Record<string, any> = {}
        headers.forEach(h => { row[h] = (s as any)[h] ?? '' })
        return row
      })
      const XLSX = await import('xlsx')
      const ws = XLSX.utils.json_to_sheet(rows, { header: headers })
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Chansons')
      XLSX.writeFile(wb, `accolta_export_${new Date().toISOString().slice(0, 10)}.xlsx`)
    }
    setExporting(false)
  }

  // Normalise les apostrophes (droite ' vs typographique ' / ') : Excel
  // convertit parfois automatiquement l'une en l'autre à l'import, ce qui
  // faisait échouer la comparaison entre ce qui est tapé et ce qui est
  // stocké en base pour des noms comme "L'Arcusgi".
  const normalizeApostrophe = (s: string) => s.replace(/[\u2018\u2019\u02BC]/g, "'")

  const searchArtists = (val: string) => {
    const safe = normalizeApostrophe(sanitizeSearch(val)).toLowerCase()
    if (!safe) { setArtistSuggestions([]); return }
    const uniqueArtists = Array.from(new Set(allSongsCache.map((s) => s.artiste)))
    setArtistSuggestions(
      uniqueArtists.filter((a) => normalizeApostrophe(a).toLowerCase().startsWith(safe)).sort().slice(0, 8)
    )
  }

  const searchAlbums = (val: string, artiste: string) => {
    const safe = normalizeApostrophe(sanitizeSearch(val)).toLowerCase()
    if (!safe) { setAlbumSuggestions([]); return }
    const safeArtiste = normalizeApostrophe(sanitizeSearch(artiste)).toLowerCase()
    const relevant = safeArtiste
      ? allSongsCache.filter((s) => normalizeApostrophe(s.artiste).toLowerCase().includes(safeArtiste))
      : allSongsCache
    const uniqueAlbums = Array.from(new Set(relevant.map((s) => s.album).filter(Boolean))) as string[]
    setAlbumSuggestions(
      uniqueAlbums.filter((a) => normalizeApostrophe(a).toLowerCase().startsWith(safe)).sort().slice(0, 8)
    )
  }

  const handleLogin = async () => {
    setLoggingIn(true)
    setLoginError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      if (res.ok) {
        onLogin()
      } else {
        const err = await res.json().catch(() => ({ error: 'Email ou mot de passe incorrect' }))
        setLoginError(err.error || 'Email ou mot de passe incorrect')
      }
    } catch {
      setLoginError('Erreur de connexion au serveur')
    } finally {
      setLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {})
    onLogout()
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (res.ok) {
      invalidateSongs()
      resetForm()
      setTab(editSong ? 'missing' : 'add')
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
    })
    invalidateSongs()
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
        inserted: result.inserted,
        errors: result.errors || [],
      })
      invalidateSongs()
      loadStats()
      loadSongs()
    } catch (err: any) {
      setImportStatus({ state: 'error', message: err.message || 'Erreur inconnue' })
    }
  }

  const handleSyncSheet = async () => {
    setImportStatus({ state: 'uploading' })
    try {
      const res = await fetch('/api/sync-sheet')
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur serveur' }))
        setImportStatus({ state: 'error', message: err.error || 'Erreur serveur' })
        return
      }
      const result = await res.json()
      setImportStatus({
        state: 'done',
        total_in_file: result.total_in_file,
        inserted: result.inserted,
        errors: result.errors || [],
      })
      invalidateSongs()
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
        <TopBar />
        <button onClick={onClose} className="absolute top-[68px] left-4 w-9 h-9 rounded-xl bg-card flex items-center justify-center z-10">
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
            <button onClick={handleLogin} disabled={loggingIn || !email.trim() || !password}
              className="w-full py-3.5 rounded-2xl accent-gradient text-white font-display font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {loggingIn && <Loader className="w-4 h-4 animate-spin" />}
              Se connecter
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col max-w-lg mx-auto">
      <TopBar />
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-[68px] pb-3 border-b border-border">
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
            Export Excel
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
      <div className="flex gap-2 px-4 py-3 border-b border-border overflow-x-auto">
        {(['missing', 'add', 'import'] as AdminTab[]).map((t) => (
          <button key={t} onClick={() => { setTab(t); if (t !== 'add') resetForm(); if (t === 'import') setImportStatus({ state: 'idle' }); if (t === 'missing') { setMissingView('artists'); setMissingSelectedArtist(null); setMissingSelectedAlbum(null) } }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${tab === t ? 'bg-accent text-white' : 'bg-card text-text-muted'}`}>
            {t === 'missing' ? 'Paroles manquantes' : t === 'add' ? (editSong ? 'Modifier' : 'Ajouter') : 'Importer'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto px-4 py-4">

        {/* PAROLES MANQUANTES */}
        {tab === 'missing' && (
          <div>
            {/* Sous-header navigation */}
            {missingView !== 'artists' && (
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => {
                    if (missingView === 'songs') { setMissingView('albums') }
                    else { setMissingView('artists'); setMissingSelectedArtist(null) }
                  }}
                  className="w-8 h-8 rounded-xl bg-card flex items-center justify-center flex-shrink-0">
                  <ChevronLeft className="w-4 h-4 text-text" />
                </button>
                <div className="min-w-0">
                  {missingView === 'albums' && <h2 className="font-display font-bold text-text truncate">{missingSelectedArtist}</h2>}
                  {missingView === 'songs' && (
                    <>
                      <p className="text-muted text-xs">{missingSelectedArtist}</p>
                      <h2 className="font-display font-bold text-text truncate">{missingSelectedAlbum || 'Sans album'}</h2>
                    </>
                  )}
                </div>
              </div>
            )}

            {loadingMissing ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-card pulse" />)}</div>
            ) : (
              <>
                {/* Liste des artistes */}
                {missingView === 'artists' && (
                  <div className="space-y-2 pb-10">
                    <p className="text-xs text-muted mb-3">{missingArtists.length} artiste{missingArtists.length > 1 ? 's' : ''} avec paroles manquantes</p>
                    {missingArtists.length === 0 && (
                      <p className="text-center text-muted py-8">Toutes les paroles sont complètes 🎉</p>
                    )}
                    {missingArtists.map(artist => (
                      <button key={artist.name}
                        onClick={() => { setMissingSelectedArtist(artist.name); setMissingView('albums') }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-border transition-colors text-left">
                        <div className="flex-1 min-w-0">
                          <p className="text-text text-sm font-medium truncate">{artist.name}</p>
                          <p className="text-muted text-xs">{artist.count} chanson{artist.count > 1 ? 's' : ''} sans paroles</p>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-muted rotate-180 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Albums de l'artiste avec manques */}
                {missingView === 'albums' && missingSelectedArtist && (() => {
                  const artistSongs = missingSongs.filter(s => s.artiste === missingSelectedArtist)
                  const albumMap = new Map<string, number>()
                  for (const s of artistSongs) {
                    const key = s.album || ''
                    albumMap.set(key, (albumMap.get(key) || 0) + 1)
                  }
                  const albums = Array.from(albumMap.entries()).sort(([a], [b]) => a.localeCompare(b))
                  return (
                    <div className="space-y-2 pb-10">
                      {albums.map(([album, count]) => (
                        <button key={album}
                          onClick={() => { setMissingSelectedAlbum(album || null); setMissingView('songs') }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-border transition-colors text-left">
                          <div className="w-10 h-10 rounded-xl bg-border flex items-center justify-center flex-shrink-0">
                            <Music2 className="w-5 h-5 text-muted" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-text font-medium text-sm truncate">{album || 'Sans album'}</p>
                            <p className="text-muted text-xs">{count} chanson{count > 1 ? 's' : ''} sans paroles</p>
                          </div>
                          <ChevronLeft className="w-4 h-4 text-muted rotate-180 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )
                })()}

                {/* Chansons de l'album sans paroles */}
                {missingView === 'songs' && missingSelectedArtist && (() => {
                  const albumSongs = missingSongs
                    .filter(s => s.artiste === missingSelectedArtist && (s.album || '') === (missingSelectedAlbum || ''))
                    .sort((a, b) => (a.numero || 999) - (b.numero || 999))
                  return (
                    <div className="space-y-2 pb-10">
                      {albumSongs.map(song => (
                        <div key={song.id} className="flex items-center gap-3 p-3 rounded-xl bg-card">
                          <div className="flex-1 min-w-0">
                            {song.numero && <p className="text-muted text-xs">Piste {song.numero}</p>}
                            <p className="text-text text-sm font-medium truncate">{song.titre}</p>
                            <p className="text-muted text-xs">{song.annee || ''}</p>
                          </div>
                          <span className="text-xs text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full flex-shrink-0">Sans paroles</span>
                          <button onClick={() => { startEdit(song as any); setTab('add') }} className="p-1.5 flex-shrink-0">
                            <Pencil className="w-4 h-4 text-accent" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </>
            )}
          </div>
        )}


        {/* FORM */}
        {tab === 'add' && (
          <div className="pb-10">
            <div className="flex items-center gap-3 mb-5">
              <button onClick={() => { setTab('missing'); resetForm() }}
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
              <h2 className="font-display font-semibold text-text mb-1">Synchroniser depuis Google Sheets</h2>
              <p className="text-text-muted text-sm">Se synchronise automatiquement 4 fois par jour. Vous pouvez aussi forcer une synchro immédiate ci-dessous.</p>
            </div>
            {(importStatus.state === 'idle' || importStatus.state === 'error') && (
              <button onClick={handleSyncSheet}
                className="w-full py-3 rounded-xl accent-gradient text-white font-display font-semibold text-sm">
                Synchroniser maintenant
              </button>
            )}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-muted text-xs">ou importer un fichier manuellement</span>
              <div className="flex-1 h-px bg-border" />
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
                <p className="text-text text-sm">Synchronisation en cours...</p>
              </div>
            )}
            {importStatus.state === 'done' && (
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <p className="text-green-400 font-semibold">Synchro terminée !</p>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-text-muted">Lignes : <span className="text-text font-medium">{importStatus.total_in_file}</span></p>
                  <p className="text-text-muted">Importées : <span className="text-green-400 font-medium">{importStatus.inserted}</span></p>
                </div>
                {importStatus.errors.map((e, i) => <p key={i} className="text-yellow-400 text-xs">{e}</p>)}
                <button onClick={() => setImportStatus({ state: 'idle' })}
                  className="w-full py-2.5 rounded-xl bg-green-500/20 text-green-400 text-sm font-medium">
                  OK
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
