'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, Heart, Music, ChevronRight, Flag, Send, Pencil } from 'lucide-react'
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

type ModalType = 'report' | 'propose' | null

export default function SongDetail({ song, isFavorite, onToggleFavorite, onBack, isAdmin, hasPrev, hasNext, onPrev, onNext }: Props) {
  const color = getColor(song.artiste)
  const [fontSize, setFontSize] = useState(16)
  const [modal, setModal] = useState<ModalType>(null)
  const [modalText, setModalText] = useState('')
  const [modalSent, setModalSent] = useState(false)

  useEffect(() => {
    // Track view
    trackView(song.id)
    const saved = localStorage.getItem('lyrics_font_size')
    if (saved) setFontSize(parseInt(saved))
  }, [song.id])

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
    setTimeout(() => {
      setModal(null)
      setModalText('')
      setModalSent(false)
    }, 2000)
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg max-w-lg mx-auto">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-14 pb-3">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-card flex items-center justify-center">
          <ChevronLeft className="w-5 h-5 text-text" />
        </button>

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
            {getInitials(song.artiste)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text-muted text-sm truncate">{song.artiste}</p>
            <h1 className="text-text font-bold text-lg leading-tight truncate">{song.titre}</h1>
            <p className="text-text-muted text-sm truncate">
              {song.album}{song.annee ? ` · ${song.annee}` : ''}
            </p>
          </div>
          <button onClick={onToggleFavorite} className="p-1 flex-shrink-0">
            <Heart className={`w-5 h-5 ${isFavorite ? 'text-red-500 fill-red-500' : 'text-muted'}`} />
          </button>
        </div>
      </div>

      {/* Lyrics */}
      <div className="flex-1 px-4 pb-10 overflow-auto">
        {/* Controls */}
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => updateFontSize(Math.max(12, fontSize - 2))}
            className="w-8 h-8 rounded-lg bg-card flex items-center justify-center text-text font-bold">−</button>
          <span className="text-sm text-muted">Taille</span>
          <button onClick={() => updateFontSize(Math.min(32, fontSize + 2))}
            className="w-8 h-8 rounded-lg bg-card flex items-center justify-center text-text font-bold">+</button>
          <div className="flex-1" />
          {isAdmin ? (
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium"
              onClick={() => alert('ID chanson : ' + song.id + '\nUtilise l\'admin pour modifier.')}>
              <Pencil className="w-3.5 h-3.5" />
              Modifier
            </button>
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

        {song.paroles ? (
          <div className="whitespace-pre-line text-text" style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}>
            {song.paroles}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center text-muted mt-20">
            <Music className="w-10 h-10 mb-3" />
            <p className="font-medium">Paroles non disponibles</p>
            <p className="text-sm opacity-70">Cette chanson n'a pas encore de paroles</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4">
          <div className="w-full max-w-lg bg-surface rounded-2xl p-5 space-y-4">
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
                <p className="text-text-muted text-sm">
                  {modal === 'report' ? 'Décris l\'erreur :' : 'Colle les paroles à ajouter :'}
                </p>
                <textarea
                  value={modalText}
                  onChange={e => setModalText(e.target.value)}
                  placeholder={modal === 'report' ? 'Ex: Vers 3, "amicu" devrait être "amice"' : 'Colle les paroles ici…'}
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl bg-card border border-border text-text text-sm outline-none placeholder:text-muted resize-none focus:border-accent"
                />
                <button disabled={!modalText.trim()} onClick={handleSendModal}
                  className="w-full py-3 rounded-xl accent-gradient text-white font-display font-semibold text-sm disabled:opacity-40">
                  Envoyer
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
