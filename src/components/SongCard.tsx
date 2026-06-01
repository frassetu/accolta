'use client'

import { Heart, Music } from 'lucide-react'
import { Song } from '@/lib/supabase'

interface Props {
  song: Song
  isFavorite: boolean
  onSelect: () => void
  onToggleFavorite: () => void
  showPreview?: boolean
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function getColor(name: string) {
  const colors = ['#7C5CFC', '#FC5C7C', '#5CF0FC', '#FCA85C', '#5CFC8E', '#FC5CEC']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export default function SongCard({ song, isFavorite, onSelect, onToggleFavorite, showPreview = true }: Props) {
  const color = getColor(song.artiste)
  const preview = song.paroles?.split('\n')[0]?.trim()

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-border transition-colors cursor-pointer"
      onClick={onSelect}
    >
      {/* Avatar */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-display font-bold text-sm"
        style={{ background: `${color}22`, border: `1.5px solid ${color}44` }}
      >
        <span style={{ color }}>{getInitials(song.artiste)}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-display font-semibold text-text text-sm truncate">{song.artiste}</p>
        <p className="text-text-muted text-sm truncate">{song.titre}</p>
        {showPreview && preview && (
          <p className="text-muted text-xs truncate mt-0.5">{preview}</p>
        )}
      </div>

      {/* No lyrics indicator */}
      {!song.paroles && (
        <Music className="w-4 h-4 text-muted flex-shrink-0 opacity-50" />
      )}

      {/* Favorite */}
      <button
        onClick={e => { e.stopPropagation(); onToggleFavorite() }}
        className="p-1.5 flex-shrink-0"
      >
        <Heart
          className="w-5 h-5 transition-all"
          style={isFavorite ? { color: '#FC5C7C', fill: '#FC5C7C' } : { color: '#6B6B80' }}
        />
      </button>
    </div>
  )
}
