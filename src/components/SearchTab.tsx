'use client'

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { supabase, Song } from '@/lib/supabase'
import SongCard from './SongCard'

type FilterType = 'all' | 'titles' | 'artists' | 'lyrics'

interface Props {
  favorites: number[]
  onSelectSong: (s: Song) => void
  onToggleFavorite: (id: number) => void
}

export default function SearchTab({ favorites, onSelectSong, onToggleFavorite }: Props) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [results, setResults] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [counts, setCounts] = useState({ all: 0, titles: 0, artists: 0, lyrics: 0 })
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setCounts({ all: 0, titles: 0, artists: 0, lyrics: 0 })
      return
    }

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query, filter), 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, filter])

  const search = async (q: string, f: FilterType) => {
    setLoading(true)
    const term = q.trim()

    let queryBuilder = supabase.from('chansons').select('*').limit(50)

    if (f === 'titles') {
      queryBuilder = queryBuilder.ilike('titre', `%${term}%`)
    } else if (f === 'artists') {
      queryBuilder = queryBuilder.ilike('artiste', `%${term}%`)
    } else if (f === 'lyrics') {
      queryBuilder = queryBuilder.ilike('paroles', `%${term}%`)
    } else {
      queryBuilder = queryBuilder.or(
        `titre.ilike.%${term}%,artiste.ilike.%${term}%,paroles.ilike.%${term}%`
      )
    }

    const { data } = await queryBuilder.order('artiste')

    if (data) {
      setResults(data)
      // Count per category
      const titleCount = data.filter(s => s.titre?.toLowerCase().includes(term.toLowerCase())).length
      const artistCount = data.filter(s => s.artiste?.toLowerCase().includes(term.toLowerCase())).length
      const lyricsCount = data.filter(s => s.paroles?.toLowerCase().includes(term.toLowerCase())).length
      setCounts({ all: data.length, titles: titleCount, artists: artistCount, lyrics: lyricsCount })
    }
    setLoading(false)
  }

  const filters: { id: FilterType; label: string; count: number }[] = [
    { id: 'all', label: 'Tous', count: counts.all },
    { id: 'titles', label: 'Titres', count: counts.titles },
    { id: 'artists', label: 'Artistes', count: counts.artists },
    { id: 'lyrics', label: 'Paroles', count: counts.lyrics },
  ]

  return (
    <div className="px-4 pt-14 pb-4 max-w-lg mx-auto">
      {/* Search bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl bg-card border border-border">
          <svg className="w-4 h-4 text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="amour, Nino Ferrer, polyphonie…"
            className="flex-1 bg-transparent text-text text-sm outline-none placeholder:text-muted"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')}>
              <X className="w-4 h-4 text-muted" />
            </button>
          )}
        </div>
        {query && (
          <button onClick={() => setQuery('')} className="text-accent text-sm font-medium">
            Annuler
          </button>
        )}
      </div>

      {/* Filters */}
      {query && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                filter === f.id
                  ? 'bg-accent text-white'
                  : 'bg-card text-text-muted'
              }`}
            >
              {f.label}{f.count > 0 ? ` (${f.count})` : ''}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-card pulse" />
          ))}
        </div>
      ) : query && results.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-display font-semibold text-text">Aucun résultat</p>
          <p className="text-sm mt-1">Essayez un autre terme</p>
        </div>
      ) : (
        <div className="space-y-2 fade-in">
          {results.map(song => (
            <SongCard
              key={song.id}
              song={song}
              isFavorite={favorites.includes(song.id)}
              onSelect={() => onSelectSong(song)}
              onToggleFavorite={() => onToggleFavorite(song.id)}
            />
          ))}
        </div>
      )}

      {!query && (
        <div className="text-center py-16 text-text-muted">
          <p className="text-4xl mb-3">🎵</p>
          <p className="font-display font-semibold text-text">Recherchez une chanson</p>
          <p className="text-sm mt-1">Par artiste, titre ou paroles</p>
        </div>
      )}
    </div>
  )
}
