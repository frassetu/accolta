'use client'

import { Heart } from 'lucide-react'
import { Song } from '@/lib/supabase'
import { getColor, getInitials } from '@/lib/format'

interface Props {
  song: Song
  isFavorite: boolean
  onSelect: () => void
  onToggleFavorite: () => void
  rank?: number
}

export default function SongCard({ song, isFavorite, onSelect, onToggleFavorite, rank }: Props) {
  const color = getColor(song.artiste)

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-border transition-colors cursor-pointer"
      onClick={onSelect}
    >
      {rank !== undefined ? (
        <div className="w-9 text-center flex-shrink-0">
          <span className={`font-display font-bold text-sm ${rank <= 3 ? 'text-accent' : 'text-muted'}`}>
            {rank}
          </span>
        </div>
      ) : (
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
          style={{ background: `${color}22`, border: `1.5px solid ${color}44`, color }}
        >
          {getInitials(song.artiste)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-text text-sm font-medium truncate leading-snug">{song.titre}</p>
        <p className="text-muted text-xs truncate">
          {song.artiste}{song.album ? ` · ${song.album}` : ''}
        </p>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onToggleFavorite() }}
        className="p-1 flex-shrink-0"
      >
        <Heart
          className={`w-4 h-4 transition-colors ${isFavorite ? 'text-red-500 fill-red-500' : 'text-muted'}`}
        />
      </button>
    </div>
  )
}
