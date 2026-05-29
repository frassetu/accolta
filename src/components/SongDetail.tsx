'use client'

import { ChevronLeft, Heart, MoreVertical, Music } from 'lucide-react'
import { Song } from '@/lib/supabase'

interface Props {
  song: Song
  isFavorite: boolean
  onToggleFavorite: () => void
  onBack: () => void
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

export default function SongDetail({ song, isFavorite, onToggleFavorite, onBack }: Props) {
  const color = getColor(song.artiste)

  return (
    <div className="min-h-screen bg-bg flex flex-col max-w-lg mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-14 pb-4">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-card flex items-center justify-center">
          <ChevronLeft className="w-5 h-5 text-text" />
        </button>
        <button className="w-9 h-9 rounded-xl bg-card flex items-center justify-center">
          <MoreVertical className="w-5 h-5 text-text" />
        </button>
      </div>

      {/* Song header */}
      <div className="px-4 pb-6 flex items-center gap-4">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-display font-bold flex-shrink-0"
          style={{ background: `${color}22`, border: `2px solid ${color}44` }}
        >
          <span style={{ color }}>{getInitials(song.artiste)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-text-muted text-sm">{song.artiste}</p>
          <h1 className="font-display font-bold text-2xl text-text leading-tight">{song.titre}</h1>
          <p className="text-text-muted text-sm">{song.album}{song.annee ? ` · ${song.annee}` : ''}</p>
        </div>
        <button onClick={onToggleFavorite} className="p-2">
          <Heart
            className="w-7 h-7 transition-all"
            style={isFavorite ? { color: '#FC5C7C', fill: '#FC5C7C' } : { color: '#6B6B80' }}
          />
        </button>
      </div>

      {/* Lyrics tab */}
      <div className="px-4 mb-4">
        <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-white text-sm font-medium">
          <Music className="w-4 h-4" />
          Paroles
        </button>
      </div>

      {/* Lyrics */}
      <div className="flex-1 px-4 pb-32">
        {song.paroles ? (
          <p className="lyrics-text fade-in">{song.paroles}</p>
        ) : (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🎵</p>
            <p className="font-display font-semibold text-text">Paroles non disponibles</p>
            <p className="text-sm text-text-muted mt-1">Cette chanson n'a pas encore de paroles</p>
          </div>
        )}
      </div>

      {/* Mini player */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto px-4 pb-6">
        <div className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: `${color}22` }}
          >
            <span style={{ color }}>{getInitials(song.artiste)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text text-sm font-medium truncate">{song.titre} · {song.artiste}</p>
            <p className="text-text-muted text-xs truncate">{song.album}</p>
          </div>
          <button className="w-9 h-9 rounded-full bg-accent flex items-center justify-center">
            <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
