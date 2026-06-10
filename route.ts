'use client'

import { useEffect, useState } from 'react'
import { Music2, ChevronRight, Trophy } from 'lucide-react'
import { supabase, Song, getViews } from '@/lib/supabase'
import SongCard from './SongCard'

interface Props {
  favorites: number[]
  onSelectSong: (s: Song, playlist?: Song[]) => void
  onToggleFavorite: (id: number) => void
  onGoToSearch: () => void
  onGoToFavorites: () => void
  onGoToTop100: () => void
}

export default function HomeTab({ favorites, onSelectSong, onToggleFavorite, onGoToSearch, onGoToFavorites, onGoToTop100 }: Props) {
  const [recent, setRecent] = useState<Song[]>([])
  const [favSongs, setFavSongs] = useState<Song[]>([])
  const [top5, setTop5] = useState<{ song: Song; count: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [totalSongs, setTotalSongs] = useState(0)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: recData, count } = await supabase
        .from('chansons')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(5)
      if (recData) setRecent(recData)
      if (count) setTotalSongs(count)

      if (favorites.length > 0) {
        const { data: favData } = await supabase.from('chansons').select('*').in('id', favorites.slice(0, 5))
        if (favData) setFavSongs(favData)
      }

      const views = getViews()
      const topIds = Object.entries(views)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id]) => parseInt(id))
      if (topIds.length > 0) {
        const { data: topData } = await supabase.from('chansons').select('*').in('id', topIds)
        if (topData) {
          const sorted = topIds
            .map(id => ({ song: topData.find(s => s.id === id)!, count: views[id] }))
            .filter(x => x.song)
          setTop5(sorted)
        }
      }
      setLoading(false)
    }
    load()
  }, [favorites])

  return (
    <div className="px-4 pt-12 pb-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <Music2 className="w-6 h-6 text-accent" />
        <h1 className="font-display font-bold text-xl text-text">Parole Corse</h1>
      </div>
      {totalSongs > 0 && (
        <p className="text-text-muted text-sm mb-5">{totalSongs.toLocaleString()} chansons disponibles</p>
      )}

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
        <>
          {top5.length > 0 && (
            <section className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-accent" />
                  <h2 className="font-display font-semibold text-text">Les plus consultées</h2>
                </div>
                <button onClick={onGoToTop100} className="flex items-center gap-1 text-accent text-sm font-medium">
                  Top 100 <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {top5.map(({ song }, i) => (
                  <SongCard
                    key={song.id}
                    song={song}
                    rank={i + 1}
                    isFavorite={favorites.includes(song.id)}
                    onSelect={() => onSelectSong(song, top5.map(t => t.song))}
                    onToggleFavorite={() => onToggleFavorite(song.id)}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="mb-6">
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

          {favSongs.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-semibold text-text">Favoris</h2>
                <button onClick={onGoToFavorites} className="flex items-center gap-1 text-accent text-sm font-medium">
                  Tout voir <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {favSongs.map(song => (
                  <SongCard
                    key={song.id}
                    song={song}
                    isFavorite={true}
                    onSelect={() => onSelectSong(song, favSongs)}
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
