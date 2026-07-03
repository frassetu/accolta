'use client'

import { useEffect, useState } from 'react'
import { Trophy, ChevronLeft } from 'lucide-react'
import { supabase, Song } from '@/lib/supabase'
import SongCard from './SongCard'

interface Props {
  favorites: number[]
  onSelectSong: (s: Song, playlist?: Song[]) => void
  onToggleFavorite: (id: number) => void
  onBack: () => void
}

export default function Top100Tab({ favorites, onSelectSong, onToggleFavorite, onBack }: Props) {
  const [songs, setSongs] = useState<{ song: Song; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('chansons')
        .select('*')
        .gt('view_count', 0)
        .order('view_count', { ascending: false })
        .limit(100)
      if (data) {
        setSongs(data.map(song => ({ song, count: song.view_count || 0 })))
      }
      setLoading(false)
    }
    load()
  }, [])

  const playlist = songs.map(s => s.song)

  return (
    <div className="flex flex-col min-h-screen bg-bg max-w-lg mx-auto">
      <div className="px-4 pt-12 pb-3 border-b border-border sticky top-0 bg-bg z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-8 h-8 rounded-xl bg-card flex items-center justify-center">
            <ChevronLeft className="w-5 h-5 text-text" />
          </button>
          <Trophy className="w-5 h-5 text-accent" />
          <h1 className="font-display font-bold text-xl text-text">Top 100</h1>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 pb-24 overflow-auto">
        {loading ? (
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-card pulse" />)}
          </div>
        ) : songs.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-text">Aucune consultation pour l'instant</p>
            <p className="text-sm mt-1">Le classement apparaîtra après avoir consulté des paroles</p>
          </div>
        ) : (
          <div className="space-y-2">
            {songs.map(({ song, count }, i) => (
              <div key={song.id} className="relative">
                <SongCard
                  song={song}
                  rank={i + 1}
                  isFavorite={favorites.includes(song.id)}
                  onSelect={() => onSelectSong(song, playlist)}
                  onToggleFavorite={() => onToggleFavorite(song.id)}
                />
                <span className="absolute right-12 top-1/2 -translate-y-1/2 text-xs text-muted">
                  {count} vue{count > 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
