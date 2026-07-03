'use client'

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { supabase, Song } from '@/lib/supabase'
import SongCard from './SongCard'
import { SearchState } from '@/app/page'

interface Props {
  favorites: number[]
  onSelectSong: (s: Song, playlist?: Song[]) => void
  onToggleFavorite: (id: number) => void
  searchState: SearchState
  onSearchStateChange: (s: SearchState) => void
}

export default function SearchTab({ favorites, onSelectSong, onToggleFavorite, searchState, onSearchStateChange }: Props) {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout>()
  const inputRef = useRef<HTMLInputElement>(null)

  const { query } = searchState

  // Autofocus the input every time this tab is shown, so the keyboard
  // opens immediately - no need to tap "rechercher" a second time.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setSongs([])
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  const search = async (q: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('chansons')
      .select('*')
      .or(`titre.ilike.%${q}%,artiste.ilike.%${q}%,album.ilike.%${q}%`)
      .order('titre', { ascending: true })
      .limit(200)
    if (data) setSongs(data)
    setLoading(false)
  }

  const handleClearQuery = () => {
    onSearchStateChange({ query: '', view: 'artists', selectedArtist: null, selectedAlbum: null })
    setSongs([])
  }

  return (
    <div className="px-4 pt-12 pb-4 max-w-lg mx-auto">

      {/* Search bar - results appear directly below, no artist > album drilldown */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-card border border-border mb-4">
        <svg className="w-4 h-4 text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={e => {
            const val = e.target.value
            onSearchStateChange({ ...searchState, query: val })
          }}
          placeholder="Artiste, titre, album…"
          className="flex-1 bg-transparent text-text text-sm outline-none placeholder:text-muted"
        />
        {query && (
          <button onClick={handleClearQuery}>
            <X className="w-4 h-4 text-muted" />
          </button>
        )}
      </div>

      {loading && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-card pulse" />)}
        </div>
      )}

      {/* RESULTATS - liste plate de chansons, plus rapide qu'artiste > album > chanson */}
      {!loading && query && (
        <div className="space-y-2">
          {songs.length === 0 ? (
            <p className="text-center text-muted py-10">Aucun résultat</p>
          ) : (
            songs.map(song => (
              <SongCard
                key={song.id}
                song={song}
                isFavorite={favorites.includes(song.id)}
                onSelect={() => onSelectSong(song, songs)}
                onToggleFavorite={() => onToggleFavorite(song.id)}
              />
            ))
          )}
        </div>
      )}

      {/* Empty state */}
      {!query && !loading && (
        <div className="text-center py-16 text-muted">
          <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-sm">Recherchez un artiste, un titre ou un album</p>
        </div>
      )}
    </div>
  )
}
