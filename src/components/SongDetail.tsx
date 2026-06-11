'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, Heart, Music, ChevronRight, Flag, Send, Pencil, Trash2, Loader, Music2 } from 'lucide-react'
import { Song, trackView } from '@/lib/supabase'

interface Props {
  song: Song
  isFavorite: boolean
  onToggleFavorite: () => void
  onBack: () => void
  isAdmin: boolean
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
}

function getColor(name: string) {
  const colors = ['#7C5CFC', '#FC5C7C', '#5CF0FC', '#FCA85C', '#5CFC8E', '#FC5CEC']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

type ModalType = 'report' | 'propose' | 'edit' | null

const getToken = () =>
  typeof window !== 'undefined' ? sessionStorage.getItem('accolta_admin_token') || '' : ''

export default function SongDetail({ song, isFavorite, onToggleFavorite, onBack, isAdmin, hasPrev, hasNext, onPrev, onNext }: Props) {
  const color = getColor(song.artiste)
  const [fontSize, setFontSize] = useState(16)
  const [modal, setModal] = useState<ModalType>(null)
  const [modalText, setModalText] = useState('')
  const [modalSent, setModalSent] = useState(false)
  const [currentSong, setCurrentSong] = useState(song)

  // Edit form state
  const [editForm, setEditForm] = useState({
    artiste: song.artiste,
    album: song.album || '',
    titre: song.titre,
    annee: song.annee?.toString() || '',
    numero: (song as any).numero?.toString() || '',
    paroles: song.paroles || '',
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    trackView(song.id)
    const saved = localStorage.getItem('lyrics_font_size')
    if (saved) setFontSize(parseInt(saved))
  }, [song.id])

  useEffect(() => {
    setCurrentSong(song)
    setEditForm({
      artiste: song.artiste,
      album: song.album || '',
      titre: song.titre,
      annee: song.annee?.toString() || '',
      numero: (song as any).numero?.toString() || '',
      paroles: song.paroles || '',
    })
  }, [song])

  const updateFontSize = (size: number) => {
    setFontSize(size)
    localStorage.setItem('lyrics_font_size', size.toString())
  }

  const handleSendModal = () => {
    const key = 'accolta_reports'
    const existing = JSON.parse(localStorage.getItem(key) || '[]')
    existing.push({
      type: modal,
      songId: song.id,
      songTitle: song.titre,
      artist: song.artiste,
      text: modalText,
      date: new Date().toISOString(),
    })
    localStorage.setItem(key, JSON.stringify(existing))
    setModalSent(true)
    setTimeout(() => { setModal(null); setModalText(''); setModalSent(false) }, 2000)
  }

  const handleSaveEdit = async () => {
    setSaving(true)
    setSaveError('')
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': getToken() },
      body: JSON.stringify({
        action: 'update',
        id: song.id,
        artiste: editForm.artiste.trim(),
        album: editForm.album.trim(),
        titre: editForm.titre.trim(),
        annee: editForm.annee ? parseInt(editForm.annee) : null,
        numero: editForm.numero ? parseInt(editForm.numero) : null,
        paroles: editForm.paroles.trim() || null,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setCurrentSong({ ...currentSong, ...editForm, annee: editForm.annee ? parseInt(editForm.annee) : null, paroles: editForm.paroles || null })
      setModal(null)
    } else {
      const err = await res.json().catch(() => ({ error: 'Erreur' }))
      setSaveError(err.error || 'Erreur lors de la sauvegarde')
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Supprimer "${song.titre}" ?`)) return
    setDeleting(true)
    await fetch(`/api/admin?id=${song.id}`, {
      method: 'DELETE',
      headers: { 'x-admin-token': getToken() },
    })
    setDeleting(false)
    onBack()
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg max-w-lg mx-auto">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-14 pb-3">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="w-9 h-9 rounded-xl bg-card flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-text" />
          </button>
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <Music2 className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-display font-bold text-text text-sm">Vogliu Cantà !</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onPrev} disabled={!hasPrev}
            className={`w-9 h-9 rounded-xl bg-card flex items-center justify-center transition-opacity ${!hasPrev ? 'opacity-30' : ''}`}>
            <ChevronLeft className="w-5 h-5 text-text" />
          </button>
          <button onClick={onNext} disabled={!hasNext}
            className={`w-9 h-9 rounded-xl bg-card flex items-center justify-center transition-opacity ${!hasNext ? 'opacity-30' : ''}`}>
            <ChevronRight className="w-5 h-5 text-text" />
          </button>
        </div>
      </div>

      {/* Song header */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
            style={{ backgroundColor: color }}>
            {getInitials(currentSong.artiste)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text-muted text-sm truncate">{currentSong.artiste}</p>
            <h1 className="text-text font-bold text-lg leading-tight truncate">{currentSong.titre}</h1>
            <p className="text-text-muted text-sm truncate">
              {currentSong.album}{currentSong.annee ? ` · ${currentSong.annee}` : ''}
            </p>
          </div>
          <button onClick={onToggleFavorite} className="p-1 flex-shrink-0">
            <Heart className={`w-5 h-5 ${isFavorite ? 'text-red-500 fill-red-500' : 'text-muted'}`} />
          </button>
        </div>
      </div>

      {/* Lyrics */}
      <div className="flex-1 px-4 pb-10 overflow-auto">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => updateFontSize(Math.max(12, fontSize - 2))}
            className="w-8 h-8 rounded-lg bg-card flex items-center justify-center text-text font-bold">−</button>
          <span className="text-sm text-muted">Taille</span>
          <button onClick={() => updateFontSize(Math.min(32, fontSize + 2))}
            className="w-8 h-8 rounded-lg bg-card flex items-center justify-center text-text font-bold">+</button>
          <div className="flex-1" />
          {isAdmin ? (
            <>
              <button onClick={() => { setModal('edit'); setSaveError('') }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium">
                <Pencil className="w-3.5 h-3.5" />
                Modifier
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium">
                {deleting ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Supprimer
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { setModal('propose'); setModalText('') }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card text-text-muted text-xs font-medium">
                <Send className="w-3.5 h-3.5" />
                Proposer
              </button>
              <button onClick={() => { setModal('report'); setModalText('') }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card text-text-muted text-xs font-medium">
                <Flag className="w-3.5 h-3.5" />
                Signaler
              </button>
            </>
          )}
        </div>

        {currentSong.paroles ? (
          <div className="whitespace-pre-line text-text" style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}>
            {currentSong.paroles}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center text-muted mt-20">
            <Music className="w-10 h-10 mb-3" />
            <p className="font-medium">Paroles non disponibles</p>
            <p className="text-sm opacity-70">Cette chanson n'a pas encore de paroles</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4">
          <div className="w-full max-w-lg bg-surface rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-auto">

            {/* EDIT MODAL (admin) */}
            {modal === 'edit' && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-text">Modifier la chanson</h3>
                  <button onClick={() => setModal(null)} className="text-muted text-sm">Annuler</button>
                </div>
                <div className="space-y-3">
                  {[
                    { key: 'artiste', label: 'Artiste *', placeholder: 'Artiste' },
                    { key: 'titre', label: 'Titre *', placeholder: 'Titre' },
                    { key: 'album', label: 'Album', placeholder: 'Album' },
                    { key: 'annee', label: 'Année', placeholder: '2024' },
                    { key: 'numero', label: 'N° piste', placeholder: '1' },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="text-text-muted text-xs mb-1 block">{label}</label>
                      <input
                        value={(editForm as any)[key]}
                        onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full px-4 py-2.5 rounded-xl bg-card border border-border text-text text-sm outline-none placeholder:text-muted focus:border-accent"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-text-muted text-xs mb-1 block">Paroles</label>
                    <textarea
                      value={editForm.paroles}
                      onChange={e => setEditForm(f => ({ ...f, paroles: e.target.value }))}
                      rows={10}
                      className="w-full px-4 py-2.5 rounded-xl bg-card border border-border text-text text-sm outline-none placeholder:text-muted focus:border-accent resize-none"
                    />
                  </div>
                </div>
                {saveError && <p className="text-red-400 text-sm">{saveError}</p>}
                <button
                  disabled={!editForm.artiste.trim() || !editForm.titre.trim() || saving}
                  onClick={handleSaveEdit}
                  className="w-full py-3 rounded-xl accent-gradient text-white font-display font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
                  {saving && <Loader className="w-4 h-4 animate-spin" />}
                  Enregistrer
                </button>
              </>
            )}

            {/* REPORT / PROPOSE MODAL (user) */}
            {(modal === 'report' || modal === 'propose') && (
              <>
                {modalSent ? (
                  <div className="text-center py-4">
                    <p className="text-2xl mb-2">✅</p>
                    <p className="font-display font-semibold text-text">Envoyé, merci !</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="font-display font-bold text-text">
                        {modal === 'report' ? 'Signaler une erreur' : 'Proposer des paroles'}
                      </h3>
                      <button onClick={() => setModal(null)} className="text-muted text-sm">Annuler</button>
                    </div>
                    <textarea
                      value={modalText}
                      onChange={e => setModalText(e.target.value)}
                      placeholder={modal === 'report' ? 'Décris l\'erreur…' : 'Colle les paroles ici…'}
                      rows={6}
                      className="w-full px-4 py-3 rounded-xl bg-card border border-border text-text text-sm outline-none placeholder:text-muted resize-none focus:border-accent"
                    />
                    <button disabled={!modalText.trim()} onClick={handleSendModal}
                      className="w-full py-3 rounded-xl accent-gradient text-white font-display font-semibold text-sm disabled:opacity-40">
                      Envoyer
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
