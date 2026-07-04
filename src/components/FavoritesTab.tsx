'use client'

import { useEffect, useState } from 'react'
import { supabase, Song } from '@/lib/supabase'
import SongCard from './SongCard'

interface Props {
  favorites: number[]
  onSelectSong: (s: Song) => void
  onToggleFavorite: (id: number) => void
}

export default function FavoritesTab({ favorites, onSelectSong, onToggleFavorite }: Props) {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (favorites.length === 0) {
      setSongs([])
      setLoading(false)
      return
    }
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('chansons')
        .select('*')
        .in('id', favorites)
        .order('artiste')
      if (data) setSongs(data)
      setLoading(false)
    }
    load()
  }, [favorites])

  return (
    <div className="px-4 pt-4 pb-4 max-w-lg mx-auto">
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-card pulse" />)}
        </div>
      ) : favorites.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🤍</p>
          <p className="font-display font-semibold text-text">Pas encore de favoris</p>
          <p className="text-sm text-text-muted mt-1">Appuyez sur le cœur d'une chanson</p>
        </div>
      ) : (
        <div className="space-y-2 fade-in">
          {songs.map(song => (
            <SongCard
              key={song.id}
              song={song}
              isFavorite={true}
              onSelect={() => onSelectSong(song)}
              onToggleFavorite={() => onToggleFavorite(song.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
