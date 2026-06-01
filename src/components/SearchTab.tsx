'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ChevronLeft } from 'lucide-react'
import { supabase, Song } from '@/lib/supabase'
import SongCard from './SongCard'

type ViewMode = 'artists' | 'albums' | 'songs'

interface Props {
  favorites: number[]
  onSelectSong: (s: Song) => void
  onToggleFavorite: (id: number) => void
}

export default function SearchTab({ favorites, onSelectSong, onToggleFavorite }: Props) {
  const [query, setQuery] = useState('')
  const [songs, setSongs] = useState<Song[]>([])
  const [view, setView] = useState<ViewMode>('artists')
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null)
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const debounceRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!query.trim()) {
      setSongs([])
      setView('artists')
      setSelectedArtist(null)
      setSelectedAlbum(null)
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
      .or(`titre.ilike.%${q}%,artiste.ilike.%${q}%`)
      .limit(100)

    if (data) {
      setSongs(data)
      setView('artists')
      setSelectedArtist(null)
      setSelectedAlbum(null)
    }

    setLoading(false)
  }

  // 🔥 artistes uniques
  const artists = [...new Set(songs.map(s => s.artiste))]

  // 🔥 albums filtrés
  const albums = selectedArtist
    ? [...new Set(songs.filter(s => s.artiste === selectedArtist).map(s => s.album))]
    : []

  // 🔥 chansons filtrées
  const filteredSongs = songs.filter(
    s => s.artiste === selectedArtist && s.album === selectedAlbum
  )

  return (
    <div className="px-4 pt-14 pb-4 max-w-lg mx-auto">

      {/* Search bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl bg-card border border-border">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher un artiste ou une chanson"
            className="flex-1 bg-transparent text-text text-sm outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')}>
              <X className="w-4 h-4 text-muted" />
            </button>
          )}
        </div>
      </div>

      {/* BACK BUTTON */}
      {view !== 'artists' && (
        <button
          onClick={() => {
            if (view === 'albums') setView('artists')
            if (view === 'songs') setView('albums')
          }}
          className="flex items-center gap-2 text-sm text-accent mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Retour
        </button>
      )}

      {/* LOADING */}
      {loading && <p className="text-muted">Chargement...</p>}

      {/* ARTISTES */}
      {!loading && view === 'artists' && query && (
        <div className="space-y-2">
          {artists.map(artist => (
            <button
              key={artist}
              onClick={() => {
                setSelectedArtist(artist)
                setView('albums')
              }}
              className="w-full text-left p-3 rounded-xl bg-card"
            >
              {artist}
            </button>
          ))}
        </div>
      )}

      {/* ALBUMS */}
      {view === 'albums' && (
        <div className="space-y-2">
          {albums.map(album => (
            <button
              key={album}
              onClick={() => {
                setSelectedAlbum(album)
                setView('songs')
              }}
              className="w-full text-left p-3 rounded-xl bg-card"
            >
              {album || 'Sans album'}
            </button>
          ))}
        </div>
      )}

      {/* CHANSONS */}
      {view === 'songs' && (
        <div className="space-y-2">
          {filteredSongs.map(song => (
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

      {/* EMPTY */}
      {!query && (
        <div className="text-center py-16 text-muted">
          Recherchez un artiste
        </div>
      )}
    </div>
  )
}
