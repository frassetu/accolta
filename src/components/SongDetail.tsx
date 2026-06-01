'use client'

import { useState, useEffect } from 'react'
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
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export default function SongDetail({ song, isFavorite, onToggleFavorite, onBack }: Props) {
  const color = getColor(song.artiste)

  const [fontSize, setFontSize] = useState(16)

  useEffect(() => {
    const saved = localStorage.getItem('lyrics_font_size')
    if (saved) setFontSize(parseInt(saved))
  }, [])

  const updateFontSize = (size: number) => {
    setFontSize(size)
    localStorage.setItem('lyrics_font_size', size.toString())
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg max-w-lg mx-auto">

      {/* Top bar */}
      <div className="flex items-center px-4 pt-14 pb-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl bg-card flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-text" />
        </button>
      </div>

      {/* Song header */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: color }}
          >
            {getInitials(song.artiste)}
          </div>

          <div className="flex-1">
            <p className="text-text-muted text-sm">{song.artiste}</p>
            <h1 className="text-text font-bold text-lg leading-tight">
              {song.titre}
            </h1>
            <p className="text-text-muted text-sm">
              {song.album}
              {song.annee ? ` · ${song.annee}` : ''}
            </p>
          </div>

          <button onClick={onToggleFavorite}>
            <Heart
              className={`w-5 h-5 ${isFavorite ? 'text-red-500 fill-red-500' : 'text-muted'}`}
            />
          </button>
        </div>
      </div>

      {/* Lyrics section */}
      <div className="flex-1 px-4 pb-10 overflow-auto">

        {/* Boutons taille */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => updateFontSize(Math.max(12, fontSize - 2))}
            className="w-8 h-8 rounded-lg bg-card flex items-center justify-center text-text"
          >
            −
          </button>

          <span className="text-sm text-muted">Taille</span>

          <button
            onClick={() => updateFontSize(Math.min(32, fontSize + 2))}
            className="w-8 h-8 rounded-lg bg-card flex items-center justify-center text-text"
          >
            +
          </button>
        </div>

        {/* Paroles */}
        {song.paroles ? (
          <div
            className="whitespace-pre-line text-text"
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}
          >
            {song.paroles}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center text-muted mt-20">
            <Music className="w-10 h-10 mb-3" />
            <p className="font-medium">Paroles non disponibles</p>
            <p className="text-sm opacity-70">
              Cette chanson n'a pas encore de paroles
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
``
