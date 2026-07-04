'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, Music2 } from 'lucide-react'
import { Song } from '@/lib/supabase'
import { getAllSongs } from '@/lib/songs'
import { getColor, getInitials } from '@/lib/format'
import SongCard from './SongCard'

type View = 'list' | 'albums' | 'songs'

interface Props {
  favorites: number[]
  onSelectSong: (s: Song, playlist?: Song[]) => void
  onToggleFavorite: (id: number) => void
}

interface ArtistInfo {
  name: string
  count: number
  albums: string[]
}

export default function ArtistTab({ favorites, onSelectSong, onToggleFavorite }: Props) {
  const [artists, setArtists] = useState<ArtistInfo[]>([])
  const [allSongs, setAllSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('list')
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null)
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const allData = await getAllSongs()
      setAllSongs(allData)
      const map = new Map<string, { count: number; albums: Set<string> }>()
      for (const s of allData) {
        if (!map.has(s.artiste)) map.set(s.artiste, { count: 0, albums: new Set() })
        const entry = map.get(s.artiste)!
        entry.count++
        if (s.album) entry.albums.add(s.album)
      }
      const list: ArtistInfo[] = Array.from(map.entries()).map(([name, v]) => ({
        name,
        count: v.count,
        albums: Array.from(v.albums).sort(),
      })).sort((a, b) => a.name.localeCompare(b.name))
      setArtists(list)
      setLoading(false)
    }
    load()
  }, [])

  const grouped = artists.reduce<Record<string, ArtistInfo[]>>((acc, a) => {
    const letter = a.name[0]?.toUpperCase() || '#'
    if (!acc[letter]) acc[letter] = []
    acc[letter].push(a)
    return acc
  }, {})

  const artistAlbums = selectedArtist
    ? Array.from(new Set(allSongs.filter(s => s.artiste === selectedArtist).map(s => s.album))).sort()
    : []

  const albumSongs = allSongs
    .filter(s => s.artiste === selectedArtist && s.album === selectedAlbum)
    .sort((a, b) => (a.numero || 999) - (b.numero || 999))

  return (
    <div className="flex flex-col min-h-screen bg-bg max-w-lg mx-auto">
      {/* Header contextuel : uniquement affiché quand on navigue dans un artiste/album,
          le titre "Artisti" de la liste racine est lui affiché dans le bandeau global. */}
      {view !== 'list' && (
        <div className="px-4 pt-4 pb-3 border-b border-border sticky top-[100px] bg-bg z-10">
          {view === 'albums' && selectedArtist ? (
            <div className="flex items-center gap-3">
              <button onClick={() => { setView('list'); setSelectedArtist(null) }}
                className="w-8 h-8 rounded-xl bg-card flex items-center justify-center flex-shrink-0">
                <ChevronLeft className="w-5 h-5 text-text" />
              </button>
              <div className="min-w-0">
                <h2 className="font-display font-bold text-text truncate">{selectedArtist}</h2>
                <p className="text-muted text-xs">{artistAlbums.length} album{artistAlbums.length > 1 ? 's' : ''}</p>
              </div>
            </div>
          ) : view === 'songs' && selectedArtist && selectedAlbum ? (
            <div className="flex items-center gap-3">
              <button onClick={() => { setView('albums'); setSelectedAlbum(null) }}
                className="w-8 h-8 rounded-xl bg-card flex items-center justify-center flex-shrink-0">
                <ChevronLeft className="w-5 h-5 text-text" />
              </button>
              <div className="min-w-0">
                <p className="text-muted text-xs">{selectedArtist}</p>
                <h2 className="font-display font-bold text-text truncate">{selectedAlbum || 'Sans album'}</h2>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 py-4 pb-24">
        {loading && (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-card pulse" />)}
          </div>
        )}

        {/* ARTISTES LIST */}
        {!loading && view === 'list' && (
          <div>
            <p className="text-xs text-muted mb-3">{artists.length} artistes</p>
            {artists.length === 0 && (
              <p className="text-center text-muted py-10">Aucun artiste trouvé</p>
            )}
            {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([letter, group]) => (
              <div key={letter}>
                <div className="text-accent font-display font-bold text-xs px-1 py-2">{letter}</div>
                <div className="space-y-1.5 mb-2">
                  {group.map(artist => {
                    const color = getColor(artist.name)
                    return (
                      <button key={artist.name}
                        onClick={() => { setSelectedArtist(artist.name); setView('albums') }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-border transition-colors text-left">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: `${color}22`, border: `1.5px solid ${color}44`, color }}>
                          {getInitials(artist.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-text font-medium text-sm truncate">{artist.name}</p>
                          <p className="text-muted text-xs">
                            {artist.count} chanson{artist.count > 1 ? 's' : ''}
                            {artist.albums.length > 0 ? ` · ${artist.albums.length} album${artist.albums.length > 1 ? 's' : ''}` : ''}
                          </p>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-muted rotate-180 flex-shrink-0" />
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ALBUMS */}
        {!loading && view === 'albums' && selectedArtist && (
          <div className="space-y-2">
            {artistAlbums.map(album => {
              const count = allSongs.filter(s => s.artiste === selectedArtist && s.album === album).length
              return (
                <button key={album}
                  onClick={() => { setSelectedAlbum(album); setView('songs') }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-border transition-colors text-left">
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

        {/* SONGS */}
        {!loading && view === 'songs' && (
          <div className="space-y-2">
            {albumSongs.map(song => (
              <SongCard key={song.id} song={song}
                trackNumber={song.numero}
                isFavorite={favorites.includes(song.id)}
                onSelect={() => onSelectSong(song, albumSongs)}
                onToggleFavorite={() => onToggleFavorite(song.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
