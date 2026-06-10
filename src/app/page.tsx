'use client'

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { supabase, Song } from '@/lib/supabase'
import SongCard from './SongCard'

interface Props {
  favorites: number[]
  onSelectSong: (s: Song) => void
  onToggleFavorite: (id: number) => void
}

export default function FavoritesTab({ favorites, onSelectSong, onToggleFavorite }: Props) {
  const [songs, setSongs] = useState<Song[]>([])
  const [search, setSearch] = useState('')
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

  const filtered = songs.filter(s =>
    !search || s.artiste.toLowerCase().includes(search.toLowerCase()) ||
    s.titre.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="px-4 pt-14 pb-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Heart className="w-6 h-6 text-[#FC5C7C]" fill="#FC5C7C" />
        <h1 className="font-display font-bold text-xl text-text">Mes favoris</h1>
      </div>

      {favorites.length > 0 && (
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher dans vos favoris…"
          className="w-full px-4 py-3 rounded-2xl bg-card border border-border text-text text-sm outline-none placeholder:text-muted mb-4"
        />
      )}

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
          {filtered.map(song => (
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
