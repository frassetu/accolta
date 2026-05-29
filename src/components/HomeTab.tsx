'use client'

import { useEffect, useState } from 'react'
import { Settings, Music2 } from 'lucide-react'
import { supabase, Song } from '@/lib/supabase'
import SongCard from './SongCard'

interface Props {
  favorites: number[]
  onSelectSong: (s: Song) => void
  onToggleFavorite: (id: number) => void
}

export default function HomeTab({ favorites, onSelectSong, onToggleFavorite }: Props) {
  const [recent, setRecent] = useState<Song[]>([])
  const [favSongs, setFavSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: recData } = await supabase
        .from('chansons')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      if (recData) setRecent(recData)

      if (favorites.length > 0) {
        const { data: favData } = await supabase
          .from('chansons')
          .select('*')
          .in('id', favorites.slice(0, 5))
        if (favData) setFavSongs(favData)
      }
      setLoading(false)
    }
    load()
  }, [favorites])

  return (
    <div className="px-4 pt-14 pb-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Music2 className="w-6 h-6 text-accent" />
          <h1 className="font-display font-bold text-xl text-text">Paroles</h1>
        </div>
        <button className="w-9 h-9 rounded-xl bg-card flex items-center justify-center">
          <Settings className="w-5 h-5 text-muted" />
        </button>
      </div>

      {/* Search hint */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border text-text-muted text-sm mb-6"
        onClick={() => {}}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        Rechercher un artiste, un titre, un mot…
      </button>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-card pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Récents */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-text">Récents</h2>
              <button className="text-accent text-sm font-medium">Tout voir</button>
            </div>
            <div className="space-y-2">
              {recent.map(song => (
                <SongCard
                  key={song.id}
                  song={song}
                  isFavorite={favorites.includes(song.id)}
                  onSelect={() => onSelectSong(song)}
                  onToggleFavorite={() => onToggleFavorite(song.id)}
                />
              ))}
            </div>
          </section>

          {/* Favoris */}
          {favSongs.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-semibold text-text">Favoris</h2>
                <button className="text-accent text-sm font-medium">Tout voir</button>
              </div>
              <div className="space-y-2">
                {favSongs.map(song => (
                  <SongCard
                    key={song.id}
                    song={song}
                    isFavorite={true}
                    onSelect={() => onSelectSong(song)}
                    onToggleFavorite={() => onToggleFavorite(song.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
