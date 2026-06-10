'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ChevronLeft, Music2, User } from 'lucide-react'
import { supabase, Song } from '@/lib/supabase'
import SongCard from './SongCard'
import { SearchState } from '@/app/page'

type ViewMode = 'artists' | 'albums' | 'songs'

interface Props {
  favorites: number[]
  onSelectSong: (s: Song, playlist?: Song[]) => void
  onToggleFavorite: (id: number) => void
  searchState: SearchState
  onSearchStateChange: (s: SearchState) => void
}

function getColor(name: string) {
  const colors = ['#7C5CFC', '#FC5C7C', '#5CF0FC', '#FCA85C', '#5CFC8E', '#FC5CEC']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export default function SearchTab({ favorites, onSelectSong, onToggleFavorite, searchState, onSearchStateChange }: Props) {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout>()

  const { query, view, selectedArtist, selectedAlbum } = searchState

  const setQuery = (q: string) => onSearchStateChange({ ...searchState, query: q })
  const setView = (v: ViewMode) => onSearchStateChange({ ...searchState, view: v })
  const setSelectedArtist = (a: string | null) => onSearchStateChange({ ...searchState, selectedArtist: a })
  const setSelectedAlbum = (a: string | null) => onSearchStateChange({ ...searchState, selectedAlbum: a })

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
      .limit(200)
    if (data) setSongs(data)
    setLoading(false)
  }

  // Unique artists from results
  const artists = Array.from(new Set(songs.map(s => s.artiste))).sort()

  // Albums for selected artist
  const albums = selectedArtist
    ? Array.from(new Set(songs.filter(s => s.artiste === selectedArtist).map(s => s.album))).sort()
    : []

  // Songs for selected artist + album
  const filteredSongs = songs.filter(
    s => s.artiste === selectedArtist && s.album === selectedAlbum
  ).sort((a, b) => (a.numero || 999) - (b.numero || 999))

  const handleClearQuery = () => {
    onSearchStateChange({ query: '', view: 'artists', selectedArtist: null, selectedAlbum: null })
    setSongs([])
  }

  const breadcrumb = () => {
    if (view === 'albums' && selectedArtist) return selectedArtist
    if (view === 'songs' && selectedArtist && selectedAlbum) return `${selectedArtist} › ${selectedAlbum || 'Sans album'}`
    return null
  }

  return (
    <div className="px-4 pt-12 pb-4 max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <X className="w-0 h-0" />
        <h1 className="font-display font-bold text-xl text-text">Recherche</h1>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-card border border-border mb-4">
        <svg className="w-4 h-4 text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={query}
          onChange={e => {
            const val = e.target.value
            onSearchStateChange({ query: val, view: 'artists', selectedArtist: null, selectedAlbum: null })
          }}
          placeholder="Artiste, titre, album…"
          className="flex-1 bg-transparent text-text text-sm outline-none placeholder:text-muted"
          autoFocus={false}
        />
        {query && (
          <button onClick={handleClearQuery}>
            <X className="w-4 h-4 text-muted" />
          </button>
        )}
      </div>

      {/* Breadcrumb + back */}
      {view !== 'artists' && (
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => {
              if (view === 'albums') {
                onSearchStateChange({ ...searchState, view: 'artists', selectedArtist: null, selectedAlbum: null })
              }
              if (view === 'songs') {
                onSearchStateChange({ ...searchState, view: 'albums', selectedAlbum: null })
              }
            }}
            className="flex items-center gap-1 text-sm text-accent"
          >
            <ChevronLeft className="w-4 h-4" />
            Retour
          </button>
          {breadcrumb() && (
            <span className="text-sm text-text-muted truncate">{breadcrumb()}</span>
          )}
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-card pulse" />)}
        </div>
      )}

      {/* ARTISTES */}
      {!loading && view === 'artists' && query && (
        <div className="space-y-2">
          {artists.length === 0 && (
            <p className="text-center text-muted py-10">Aucun résultat</p>
          )}
          {artists.map(artist => {
            const color = getColor(artist)
            const count = songs.filter(s => s.artiste === artist).length
            return (
              <button
                key={artist}
                onClick={() => {
                  onSearchStateChange({ ...searchState, view: 'albums', selectedArtist: artist, selectedAlbum: null })
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-border transition-colors text-left"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: `${color}22`, border: `1.5px solid ${color}44`, color }}
                >
                  {getInitials(artist)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text font-medium text-sm truncate">{artist}</p>
                  <p className="text-muted text-xs">{count} chanson{count > 1 ? 's' : ''}</p>
                </div>
                <ChevronLeft className="w-4 h-4 text-muted rotate-180 flex-shrink-0" />
              </button>
            )
          })}
        </div>
      )}

      {/* ALBUMS */}
      {!loading && view === 'albums' && (
        <div className="space-y-2">
          {albums.map(album => {
            const albumSongs = songs.filter(s => s.artiste === selectedArtist && s.album === album)
            return (
              <button
                key={album}
                onClick={() => {
                  onSearchStateChange({ ...searchState, view: 'songs', selectedAlbum: album })
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-border transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-border flex items-center justify-center flex-shrink-0">
                  <Music2 className="w-5 h-5 text-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text font-medium text-sm truncate">{album || 'Sans album'}</p>
                  <p className="text-muted text-xs">{albumSongs.length} chanson{albumSongs.length > 1 ? 's' : ''}</p>
                </div>
                <ChevronLeft className="w-4 h-4 text-muted rotate-180 flex-shrink-0" />
              </button>
            )
          })}
        </div>
      )}

      {/* CHANSONS */}
      {!loading && view === 'songs' && (
        <div className="space-y-2">
          {filteredSongs.map(song => (
            <SongCard
              key={song.id}
              song={song}
              isFavorite={favorites.includes(song.id)}
              onSelect={() => onSelectSong(song, filteredSongs)}
              onToggleFavorite={() => onToggleFavorite(song.id)}
            />
          ))}
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
