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

type AdminTab = 'missing' | 'browse' | 'add' | 'import'
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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [bulkArtiste, setBulkArtiste] = useState('')
  const [bulkAlbum, setBulkAlbum] = useState('')
  const [bulkAnnee, setBulkAnnee] = useState('')
  const [bulkEditing, setBulkEditing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [loggingIn, setLoggingIn] = useState(false)
  const [tracks, setTracks] = useState<{ numero: string; titre: string }[]>([{ numero: '', titre: '' }])
  const [forceSyncing, setForceSyncing] = useState(false)
  const [forceSyncProgress, setForceSyncProgress] = useState<{ done: number; total: number } | null>(null)
  const [forceSyncError, setForceSyncError] = useState('')

  useEffect(() => {
    if (isAdmin) { loadSongs(); loadStats(); loadMissing(); getAllSongs().then(setAllSongsCache) }
  }, [isAdmin])

  const loadMissing = async () => {
    setLoadingMissing(true)
    const res = await fetch('/api/admin?action=missing-lyrics')
    if (res.ok) {
      const data: MissingSong[] = await res.json()
      setMissingSongs(data)
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

  const loadSongs = async (q?: string) => {
    setLoading(true)
    let query = supabase.from('chansons').select('*').order('artiste')

    const safe = q ? sanitizeSearch(q) : ''
    if (safe) {
      query = query.or(`artiste.ilike.%${safe}%,titre.ilike.%${safe}%,album.ilike.%${safe}%`)
    }

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

  const searchRef = useRef<NodeJS.Timeout>()
  const handleSearchChange = (val: string) => {
    setSearch(val)
    setSelectedIds(new Set())
    clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => loadSongs(val), 400)
  }

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIds(prev => (prev.size === songs.length ? new Set() : new Set(songs.map(s => s.id))))
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Supprimer ${selectedIds.size} chanson${selectedIds.size > 1 ? 's' : ''} ? Cette action est irréversible.`)) return
    setBulkDeleting(true)
    const results = await Promise.all(Array.from(selectedIds).map(id => fetch(`/api/admin?id=${id}`, { method: 'DELETE' })))
    setBulkDeleting(false)
    const failed = results.filter(r => !r.ok).length
    setSelectedIds(new Set())
    invalidateSongs()
    loadSongs(search)
    loadStats()
    loadMissing()
    if (failed > 0) alert(`${failed} suppression(s) ont échoué. Réessayez.`)
  }

  const handleBulkEdit = async () => {
    if (selectedIds.size === 0 || (!bulkArtiste.trim() && !bulkAlbum.trim() && !bulkAnnee.trim())) return
    setBulkEditing(true)
    const targets = songs.filter(s => selectedIds.has(s.id))
    await Promise.all(targets.map(s => fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update',
        id: s.id,
        artiste: bulkArtiste.trim() ? bulkArtiste.trim() : s.artiste,
        album: bulkAlbum.trim() ? bulkAlbum.trim() : (s.album || ''),
        titre: s.titre,
        annee: bulkAnnee.trim() ? parseInt(bulkAnnee) : (s.annee ?? null),
        numero: (s as any).numero ?? null,
        paroles: s.paroles ?? null,
      }),
    })))
    setBulkEditing(false)
    setBulkEditOpen(false)
    setBulkArtiste('')
    setBulkAlbum('')
    setBulkAnnee('')
    setSelectedIds(new Set())
    invalidateSongs()
    loadSongs(search)
    loadStats()
    loadMissing()
  }

  const handleExportCSV = async () => {
    setExporting(true)
    const res = await fetch('/api/admin?action=export')
    if (res.ok) {
      const data: Song[] = await res.json()
      const fields = ['id', 'artiste', 'album', 'numero', 'titre', 'annee', 'paroles']
      const headerLabels: Record<string, string> = {
        id: 'id', artiste: 'Artiste', album: 'Album', numero: 'Numero', titre: 'Titre', annee: 'Annee', paroles: 'Paroles',
      }
      const rows = data.map(s => {
        const row: Record<string, any> = {}
        fields.forEach(f => { row[headerLabels[f]] = (s as any)[f] ?? '' })
        return row
      })
      const XLSX = await import('xlsx')
      const ws = XLSX.utils.json_to_sheet(rows, { header: fields.map(f => headerLabels[f]) })
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Chansons')
      XLSX.writeFile(wb, `accolta_export_${new Date().toISOString().slice(0, 10)}.xlsx`)
    }
    setExporting(false)
  }

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

  const selectAlbumSuggestion = (album: string) => {
    const matches = allSongsCache.filter((s) => s.album === album)
    const distinctArtists = Array.from(new Set(matches.map((s) => s.artiste)))
    setForm((f) => {
      const next = { ...f, album }
      if (distinctArtists.length === 1) {
        next.artiste = distinctArtists[0]
        const withYear = matches.find((s) => s.annee)
        if (withYear?.annee) next.annee = String(withYear.annee)
      }
      return next
    })
    setShowAlbumSug(false)
    setAlbumSuggestions([])
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
    setTracks([{ numero: '', titre: '' }])
    setEditSong(null)
    setSaveError('')
    setArtistSuggestions([])
    setAlbumSuggestions([])
  }

  const addTrackRow = () => {
    setTracks(prev => {
      const last = prev[prev.length - 1]
      const n = last.numero.trim() && !isNaN(parseInt(last.numero)) ? String(parseInt(last.numero) + 1) : ''
      return [...prev, { numero: n, titre: '' }]
    })
  }

  const removeTrackRow = (i: number) => {
    setTracks(prev => prev.filter((_, ti) => ti !== i))
  }

  const handleSave = async () => {
    if (!form.artiste.trim()) return

    if (editSong) {
      if (!form.titre.trim()) return
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
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', id: editSong.id, ...payload }),
      })
      setSaving(false)
      if (res.ok) {
        invalidateSongs()
        resetForm()
        setTab('missing')
        loadSongs(search)
        loadStats()
        loadMissing()
      } else {
        const err = await res.json().catch(() => ({ error: 'Erreur inconnue' }))
        setSaveError(err.error || 'Erreur lors de la sauvegarde')
      }
      return
    }

    // Ajout (éventuellement en lot) : chaque ligne numéro/titre devient une
    // chanson à part, partageant le même artiste/album/année.
    if (tracks.some(t => !t.titre.trim())) return
    setSaving(true)
    setSaveError('')
    const results = await Promise.all(tracks.map(t => fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upsert',
        artiste: form.artiste.trim(),
        album: form.album.trim(),
        numero: t.numero ? parseInt(t.numero) : null,
        titre: t.titre.trim(),
        annee: form.annee ? parseInt(form.annee) : null,
        // Les paroles ne s'appliquent qu'en ajout d'une seule chanson —
        // aucun sens de dupliquer le même texte sur plusieurs titres.
        paroles: tracks.length === 1 ? (form.paroles.trim() || null) : null,
      }),
    })))
    setSaving(false)
    if (results.every(r => r.ok)) {
      invalidateSongs()
      resetForm()
      setTab('add')
      loadSongs(search)
      loadStats()
      loadMissing()
    } else {
      setSaveError("Certaines chansons n'ont pas pu être ajoutées.")
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette chanson ?')) return
    const res = await fetch(`/api/admin?id=${id}`, {
      method: 'DELETE',
    })
    invalidateSongs()
    loadSongs(search)
    loadStats()
    loadMissing()
    if (!res.ok) alert('La suppression a échoué. Réessayez.')
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

  const handleForceSync = async () => {
    if (!confirm("Forcer une synchro complète vers Google Sheets ? Ça peut prendre une minute ou deux, ne quittez pas cette page pendant l'opération.")) return
    setForceSyncing(true)
    setForceSyncError('')
    setForceSyncProgress({ done: 0, total: 0 })
    let offset = 0
    let hasMore = true
    let failed = false
    try {
      while (hasMore) {
        const res = await fetch(`/api/admin?action=force-sync-sheet&offset=${offset}`)
        const result = await res.json()
        if (!res.ok || result.error) {
          setForceSyncError(result.error || 'Erreur inconnue')
          failed = true
          break
        }
        offset = result.nextOffset
        hasMore = result.hasMore
        setForceSyncProgress({ done: offset, total: result.total })
      }
      // Une fois toutes les chansons envoyées, on nettoie les lignes du
      // Sheet qui correspondent à des chansons supprimées dans l'appli.
      if (!failed) {
        const pruneRes = await fetch('/api/admin?action=prune-orphans-sheet')
        const pruneResult = await pruneRes.json()
        if (!pruneRes.ok || pruneResult.error) {
          setForceSyncError(pruneResult.error || 'Erreur lors du nettoyage des lignes supprimées')
        }
      }
    } catch (e: any) {
      setForceSyncError(e.message || 'Erreur réseau')
    }
    setForceSyncing(false)
  }

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

      <div className="flex gap-3 px-4 py-3 border-b border-border">
        {[
          { label: 'Chansons', value: stats.total },
          { label: 'Avec paroles', value: stats.withLyrics, sub: stats.total ? `${Math.round((stats.withLyrics / stats.total) * 100)}%` : undefined },
          { label: 'Artistes', value: stats.artists },
        ].map((s) => (
          <div key={s.label} className="flex-1 bg-card rounded-xl p-2.5 text-center">
            <p className="font-display font-bold text-accent text-lg">
              {s.value}
              {s.sub && <span className="text-muted text-xs font-normal ml-1">({s.sub})</span>}
            </p>
            <p className="text-muted text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 px-4 py-3 border-b border-border overflow-x-auto">
        {(['missing', 'browse', 'add', 'import'] as AdminTab[]).map((t) => (
          <button key={t} onClick={() => { setTab(t); if (t !== 'add') resetForm(); if (t === 'import') setImportStatus({ state: 'idle' }); if (t === 'missing') { setMissingView('artists'); setMissingSelectedArtist(null); setMissingSelectedAlbum(null) }; if (t === 'browse') { setSearch(''); setSelectedIds(new Set()); loadSongs('') } }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${tab === t ? 'bg-accent text-white' : 'bg-card text-text-muted'}`}>
            {t === 'missing' ? 'Paroles manquantes' : t === 'browse' ? 'Gérer' : t === 'add' ? (editSong ? 'Modifier' : 'Ajouter') : 'Importer'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto px-4 py-4">

        {tab === 'missing' && (
          <div>
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
                          <button onClick={() => handleDelete(song.id)} className="p-1.5 flex-shrink-0">
                            <Trash2 className="w-4 h-4 text-red-400" />
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

              <div className="flex gap-3">
                <div className="w-24 flex-shrink-0">
                  <label className="text-text-muted text-xs mb-1.5 block">Annee</label>
                  <input type="number" inputMode="numeric" value={form.annee}
                    onChange={(e) => setForm((f) => ({ ...f, annee: e.target.value }))} placeholder="2024"
                    className="w-full px-3 py-3 rounded-xl bg-card border border-border text-text text-sm outline-none placeholder:text-muted focus:border-accent transition-colors" />
                </div>
                <div className="flex-1 relative">
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
                          onMouseDown={() => selectAlbumSuggestion(a)}>{a}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {editSong ? (
                <div className="flex gap-3">
                  <div className="w-20 flex-shrink-0">
                    <label className="text-text-muted text-xs mb-1.5 block">N°</label>
                    <input type="number" inputMode="numeric" value={form.numero}
                      onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} placeholder="1"
                      className="w-full px-3 py-3 rounded-xl bg-card border border-border text-text text-sm outline-none placeholder:text-muted focus:border-accent transition-colors" />
                  </div>
                  <div className="flex-1">
                    <label className="text-text-muted text-xs mb-1.5 block">Titre *</label>
                    <input type="text" value={form.titre}
                      onChange={(e) => setForm((f) => ({ ...f, titre: e.target.value }))} placeholder="Titre de la chanson"
                      className="w-full px-4 py-3 rounded-xl bg-card border border-border text-text text-sm outline-none placeholder:text-muted focus:border-accent transition-colors" />
                  </div>
                </div>
              ) : (
                <>
                  {tracks.map((t, i) => (
                    <div key={i} className="flex gap-3 items-end">
                      <div className="w-20 flex-shrink-0">
                        {i === 0 && <label className="text-text-muted text-xs mb-1.5 block">N°</label>}
                        <input type="number" inputMode="numeric" value={t.numero}
                          onChange={(e) => setTracks(ts => ts.map((tt, ti) => ti === i ? { ...tt, numero: e.target.value } : tt))}
                          placeholder="1"
                          className="w-full px-3 py-3 rounded-xl bg-card border border-border text-text text-sm outline-none placeholder:text-muted focus:border-accent transition-colors" />
                      </div>
                      <div className="flex-1">
                        {i === 0 && <label className="text-text-muted text-xs mb-1.5 block">Titre *</label>}
                        <input type="text" value={t.titre}
                          onChange={(e) => setTracks(ts => ts.map((tt, ti) => ti === i ? { ...tt, titre: e.target.value } : tt))}
                          placeholder="Titre de la chanson"
                          className="w-full px-4 py-3 rounded-xl bg-card border border-border text-text text-sm outline-none placeholder:text-muted focus:border-accent transition-colors" />
                      </div>
                      {tracks.length > 1 && (
                        <button onClick={() => removeTrackRow(i)} className="p-2.5 flex-shrink-0">
                          <X className="w-4 h-4 text-muted" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={addTrackRow}
                    className="w-full py-2.5 rounded-xl border border-dashed border-border text-accent text-sm font-medium flex items-center justify-center gap-1.5">
                    <Plus className="w-4 h-4" />
                    Ajouter une autre chanson
                  </button>
                </>
              )}

              {(editSong || tracks.length === 1) && (
                <div>
                  <label className="text-text-muted text-xs mb-1.5 block">Paroles</label>
                  <textarea value={form.paroles} onChange={(e) => setForm((f) => ({ ...f, paroles: e.target.value }))}
                    placeholder="Coller les paroles ici..." rows={10}
                    className="w-full px-4 py-3 rounded-xl bg-card border border-border text-text text-sm outline-none placeholder:text-muted focus:border-accent transition-colors resize-none" />
                </div>
              )}
            </div>
            {saveError && (
              <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                <p className="text-red-400 text-sm">{saveError}</p>
              </div>
            )}
            <button onClick={handleSave} disabled={!form.artiste.trim() || (editSong ? !form.titre.trim() : tracks.some(t => !t.titre.trim())) || saving}
              className="mt-4 w-full py-3.5 rounded-xl accent-gradient text-white font-display font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader className="w-4 h-4 animate-spin" />}
              {editSong ? 'Enregistrer les modifications' : tracks.length > 1 ? `Ajouter ${tracks.length} chansons` : 'Ajouter la chanson'}
            </button>
            {!editSong && <p className="text-center text-text-muted text-xs mt-3">Le formulaire se videra après ajout</p>}
          </div>
        )}

        {tab === 'browse' && (
          <div className="pb-10">
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-card border border-border mb-4">
              <Search className="w-4 h-4 text-muted flex-shrink-0" />
              <input
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Artiste, album ou titre..."
                className="flex-1 bg-transparent text-text text-sm outline-none placeholder:text-muted"
              />
            </div>

            {!search.trim() && (
              <p className="text-center text-muted py-10 text-sm px-4">Tapez pour chercher une chanson, un album ou un artiste. Cherchez un nom d'artiste ou d'album pour faire apparaître toutes ses chansons d'un coup, sélectionnez-les, puis supprimez-les ou modifiez-les en une fois.</p>
            )}

            {search.trim() && loading && (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-card pulse" />)}</div>
            )}

            {search.trim() && !loading && (
              songs.length === 0 ? (
                <p className="text-center text-muted py-10">Aucun résultat</p>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-accent">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedIds.size === songs.length && songs.length > 0 ? 'bg-accent border-accent' : 'border-border'}`}>
                        {selectedIds.size === songs.length && songs.length > 0 && <span className="text-white text-[10px]">✓</span>}
                      </div>
                      Tout sélectionner ({songs.length})
                    </button>
                    {selectedIds.size > 0 && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => setBulkEditOpen(o => !o)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium">
                          <Pencil className="w-3.5 h-3.5" />
                          Modifier ({selectedIds.size})
                        </button>
                        <button onClick={handleBulkDelete} disabled={bulkDeleting}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium">
                          {bulkDeleting ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          Supprimer ({selectedIds.size})
                        </button>
                      </div>
                    )}
                  </div>
                  {bulkEditOpen && selectedIds.size > 0 && (
                    <div className="p-3 rounded-xl bg-card border border-border mb-3 space-y-2">
                      <p className="text-text-muted text-xs">Laissez un champ vide pour ne pas y toucher. S'applique aux {selectedIds.size} chanson{selectedIds.size > 1 ? 's' : ''} sélectionnée{selectedIds.size > 1 ? 's' : ''}.</p>
                      <input value={bulkArtiste} onChange={e => setBulkArtiste(e.target.value)} placeholder="Nouveau nom d'artiste"
                        className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text text-sm outline-none placeholder:text-muted focus:border-accent" />
                      <input value={bulkAlbum} onChange={e => setBulkAlbum(e.target.value)} placeholder="Nouveau nom d'album"
                        className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text text-sm outline-none placeholder:text-muted focus:border-accent" />
                      <input value={bulkAnnee} onChange={e => setBulkAnnee(e.target.value)} placeholder="Nouvelle année" type="number" inputMode="numeric"
                        className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text text-sm outline-none placeholder:text-muted focus:border-accent" />
                      <button onClick={handleBulkEdit} disabled={bulkEditing || (!bulkArtiste.trim() && !bulkAlbum.trim() && !bulkAnnee.trim())}
                        className="w-full py-2.5 rounded-lg accent-gradient text-white text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2">
                        {bulkEditing && <Loader className="w-4 h-4 animate-spin" />}
                        Appliquer
                      </button>
                    </div>
                  )}
                  <div className="space-y-2">
                    {songs.map(song => (
                      <div key={song.id} className="flex items-center gap-3 p-3 rounded-xl bg-card">
                        <button onClick={() => toggleSelect(song.id)} className="flex-shrink-0">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedIds.has(song.id) ? 'bg-accent border-accent' : 'border-border'}`}>
                            {selectedIds.has(song.id) && <span className="text-white text-[10px]">✓</span>}
                          </div>
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-text text-sm font-medium truncate">{song.titre}</p>
                          <p className="text-muted text-xs truncate">{song.artiste}{song.album ? ` · ${song.album}` : ''}</p>
                        </div>
                        <button onClick={() => startEdit(song)} className="p-1.5 flex-shrink-0">
                          <Pencil className="w-4 h-4 text-accent" />
                        </button>
                        <button onClick={() => handleDelete(song.id)} className="p-1.5 flex-shrink-0">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )
            )}
          </div>
        )}

        {tab === 'import' && (
          <div className="space-y-4 pb-10">
            <div className="p-3 rounded-xl bg-card border border-border space-y-2">
              <p className="text-text-muted text-xs">Si le Google Sheet n'est plus à jour (ex : après une erreur de configuration passée), forcez une resynchro complète de toutes les chansons vers le Sheet.</p>
              <button onClick={handleForceSync} disabled={forceSyncing}
                className="w-full py-2.5 rounded-xl bg-accent/10 text-accent text-sm font-medium flex items-center justify-center gap-2">
                {forceSyncing && <Loader className="w-4 h-4 animate-spin" />}
                Forcer la synchro complète
              </button>
              {forceSyncProgress && forceSyncing && (
                <p className="text-text-muted text-xs text-center">{forceSyncProgress.done} / {forceSyncProgress.total} chansons envoyées...</p>
              )}
              {forceSyncError && <p className="text-red-400 text-xs">{forceSyncError}</p>}
              {!forceSyncing && forceSyncProgress && !forceSyncError && (
                <p className="text-green-400 text-xs text-center">✅ Synchro terminée ({forceSyncProgress.done} chansons)</p>
              )}
            </div>
            <div>
              <h2 className="font-display font-semibold text-text mb-1">Importer un fichier Excel</h2>
              <p className="text-text-muted text-sm">Toutes les lignes du fichier sont importées, sans suppression de doublons. Utile en secours — les ajouts/modifs faits dans l'appli se répercutent automatiquement sur votre Google Sheet.</p>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border text-xs space-y-1">
              <p className="text-text-muted font-medium mb-2">Colonnes reconnues :</p>
              {[['Artiste','Artistu / Artiste'],['Titre','Titulu / Titre'],['Album','Dischettu / Album'],['Annee','Annata / Annee'],['Paroles','Paroddi / Parolle / Paroles']].map(([l,v])=>(
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
