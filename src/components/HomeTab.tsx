'use client'

import { useEffect, useState } from 'react'
import { supabase, Song } from '@/lib/supabase'
import SongCard from './SongCard'

interface Props {
  favorites: number[]
  onSelectSong: (s: Song, playlist?: Song[]) => void
  onToggleFavorite: (id: number) => void
  onGoToSearch: () => void
}

export default function HomeTab({ favorites, onSelectSong, onToggleFavorite, onGoToSearch }: Props) {
  const [recent, setRecent] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: recData } = await supabase
        .from('chansons')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
      if (recData) setRecent(recData)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="px-4 pt-4 pb-4 max-w-lg mx-auto">
      {/* Search bar - tapping goes straight to Search with the keyboard already open */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border text-text-muted text-sm mb-6 text-left"
        onClick={onGoToSearch}
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        Ricercà un artista, un titulu, una parola…
      </button>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-card pulse" />)}
        </div>
      ) : (
        <section>
          <h2 className="font-display font-semibold text-text mb-3">Récents</h2>
          <div className="space-y-2">
            {recent.length === 0 ? (
              <p className="text-text-muted text-sm py-4 text-center">Aucune chanson</p>
            ) : (
              recent.map(song => (
                <SongCard
                  key={song.id}
                  song={song}
                  isFavorite={favorites.includes(song.id)}
                  onSelect={() => onSelectSong(song, recent)}
                  onToggleFavorite={() => onToggleFavorite(song.id)}
                />
              ))
            )}
          </div>
        </section>
      )}
    </div>
  )
}
