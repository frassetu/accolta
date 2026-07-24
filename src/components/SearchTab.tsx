'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { X, ChevronLeft, Music2 } from 'lucide-react'
import { Song } from '@/lib/supabase'
import { getAllSongs } from '@/lib/songs'
import { getColor, getInitials, normalize } from '@/lib/format'
import SongCard from './SongCard'
import { SearchState } from '@/app/page'

interface Props {
  favorites: number[]
  onSelectSong: (s: Song, playlist?: Song[], highlightQuery?: string) => void
  onToggleFavorite: (id: number) => void
  searchState: SearchState
  onSearchStateChange: (s: SearchState) => void
}

type NormSong = Song & { _nArtiste: string; _nTitre: string; _nAlbum: string; _nParoles: string }

export default function SearchTab({ favorites, onSelectSong, onToggleFavorite, searchState, onSearchStateChange }: Props) {
  const [allSongs, setAllSongs] = useState<NormSong[]>([])
  const [loading, setLoading] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  const { query, view, selectedArtist, selectedAlbum } = searchState

  const albumPlaylist = (song: Song) =>
    allSongs
      .filter(s => s.artiste === song.artiste && s.album === song.album)
      .sort((a, b) => (a.numero || 999) - (b.numero || 999))

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const all = await getAllSongs()
      if (cancelled) return
      setAllSongs(all.map(s => ({
        ...s,
        _nArtiste: normalize(s.artiste),
        _nTitre: normalize(s.titre),
        _nAlbum: normalize(s.album),
        _nParoles: normalize(s.paroles),
      })))
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const nq = normalize(query)

  const artistMatches = useMemo(() => {
    if (!nq) return []
    const names = new Set<string>()
    allSongs.forEach(s => { if (s._nArtiste.includes(nq)) names.add(s.artiste) })
    return Array.from(names).sort().map(name => ({
      name,
      count: allSongs.filter(s => s.artiste === name).length,
    }))
  }, [allSongs, nq])

  const titleMatches = useMemo(() => {
    if (!nq) return []
    return allSongs.filter(s => s._nTitre.includes(nq) || s._nAlbum.includes(nq))
  }, [allSongs, nq])

  const lyricsMatches = useMemo(() => {
    if (!nq) return []
    const titleIds = new Set(titleMatches.map(s => s.id))
    return allSongs.filter(s => !titleIds.has(s.id) && s._nParoles.includes(nq))
  }, [allSongs, nq, titleMatches])

  const noResults = nq && artistMatches.length === 0 && titleMatches.length === 0 && lyricsMatches.length === 0

  const artistAlbums = selectedArtist
    ? Array.from(new Set(allSongs.filter(s => s.artiste === selectedArtist).map(s => s.album))).sort()
    : []

  const albumSongs = allSongs
    .filter(s => s.artiste === selectedArtist && s.album === selectedAlbum)
    .sort((a, b) => (a.numero || 999) - (b.numero || 999))

  const setQuery = (q: string) => onSearchStateChange({ query: q, view: 'artists', selectedArtist: null, selectedAlbum: null })

  const handleClearQuery = () => {
    onSearchStateChange({ query: '', view: 'artists', selectedArtist: null, selectedAlbum: null })
  }

  const goToArtist = (name: string) => {
    onSearchStateChange({ ...searchState, view: 'albums', selectedArtist: name, selectedAlbum: null })
  }

  return (
    <div className="px-4 pt-4 pb-4 max-w-lg mx-auto">

      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-card border border-border mb-4">
        <svg className="w-4 h-4 text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Artiste, titre, album, paroles…"
          className="flex-1 bg-transparent text-text text-sm outline-none placeholder:text-muted"
        />
        {query && (
          <button onClick={handleClearQuery}>
            <X className="w-4 h-4 text-muted" />
          </button>
        )}
      </div>

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
          <span className="text-sm text-text-muted truncate">
            {view === 'albums' && selectedArtist}
            {view === 'songs' && `${selectedArtist} › ${selectedAlbum || 'Sans album'}`}
          </span>
        </div>
      )}

      {loading && view === 'artists' && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-card pulse" />)}
        </div>
      )}

      {!loading && view === 'artists' && query && (
        <div className="space-y-5">
          {noResults && <p className="text-center text-muted py-10">Aucun résultat</p>}

          {artistMatches.length > 0 && (
            <div>
              <p className="text-xs text-muted font-medium mb-2 px-1">ARTISTES</p>
              <div className="space-y-1.5">
                {artistMatches.map(({ name, count }) => {
                  const color = getColor(name)
                  return (
                    <button
                      key={name}
                      onClick={() => goToArtist(name)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-border transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: `${color}22`, border: `1.5px solid ${color}44`, color }}>
                        {getInitials(name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text font-medium text-sm truncate">{name}</p>
                        <p className="text-muted text-xs">{count} chanson{count > 1 ? 's' : ''}</p>
                      </div>
                      <ChevronLeft className="w-4 h-4 text-muted rotate-180 flex-shrink-0" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {titleMatches.length > 0 && (
            <div>
              <p className="text-xs text-muted font-medium mb-2 px-1">CHANSONS</p>
              <div className="space-y-2">
                {titleMatches.map(song => (
                  <SongCard
                    key={song.id}
                    song={song}
                    isFavorite={favorites.includes(song.id)}
                    onSelect={() => onSelectSong(song, albumPlaylist(song))}
                    onToggleFavorite={() => onToggleFavorite(song.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {lyricsMatches.length > 0 && (
            <div>
              <p className="text-xs text-muted font-medium mb-2 px-1">DANS LES PAROLES</p>
              <div className="space-y-2">
                {lyricsMatches.map(song => (
                  <SongCard
                    key={song.id}
                    song={song}
                    isFavorite={favorites.includes(song.id)}
                    onSelect={() => onSelectSong(song, albumPlaylist(song), query)}
                    onToggleFavorite={() => onToggleFavorite(song.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && view === 'albums' && selectedArtist && (
        <div className="space-y-2">
          {artistAlbums.map(album => {
            const count = allSongs.filter(s => s.artiste === selectedArtist && s.album === album).length
            return (
              <button
                key={album}
                onClick={() => onSearchStateChange({ ...searchState, view: 'songs', selectedAlbum: album })}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-border transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-border flex items-center justify-center flex-shrink-0">
                  <Music2 className="w-5 h-5 text-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text font-medium text-sm truncate">{album || 'Sans album'}</p>
                  <p className="text-muted text-xs">{count} chanson{count > 1 ? 's' : ''}</p>
                </div>
                <ChevronLeft className="w-4 h-4 text-muted rotate-180 flex-shrink-0" />
              </button>
            )
          })}
        </div>
      )}

      {!loading && view === 'songs' && (
        <div className="space-y-2">
          {albumSongs.map(song => (
            <SongCard
              key={song.id}
              song={song}
              trackNumber={song.numero}
              isFavorite={favorites.includes(song.id)}
              onSelect={() => onSelectSong(song, albumSongs)}
              onToggleFavorite={() => onToggleFavorite(song.id)}
            />
          ))}
        </div>
      )}

      {!query && !loading && view === 'artists' && (
        <div className="text-center py-16 text-muted">
          <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-sm">Recherchez un artiste, un titre, un album ou des paroles</p>
        </div>
      )}
    </div>
  )
}