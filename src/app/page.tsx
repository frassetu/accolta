'use client'

import { useState, useEffect } from 'react'
import HomeTab from '@/components/HomeTab'
import SearchTab from '@/components/SearchTab'
import ArtistTab from '@/components/ArtistTab'
import FavoritesTab from '@/components/FavoritesTab'
import ProfileTab from '@/components/ProfileTab'
import SongDetail from '@/components/SongDetail'
import BottomNav from '@/components/BottomNav'
import AdminPanel from '@/components/AdminPanel'
import Top100Tab from '@/components/Top100Tab'
import { Song } from '@/lib/supabase'

export type Tab = 'home' | 'search' | 'artists' | 'favorites' | 'profile'

export type SearchState = {
  query: string
  view: 'artists' | 'albums' | 'songs'
  selectedArtist: string | null
  selectedAlbum: string | null
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [selectedSong, setSelectedSong] = useState<Song | null>(null)
  const [songHistory, setSongHistory] = useState<Song[]>([])
  const [favorites, setFavorites] = useState<number[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [showTop100, setShowTop100] = useState(false)
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    view: 'artists',
    selectedArtist: null,
    selectedAlbum: null,
  })

  useEffect(() => {
    const saved = localStorage.getItem('accolta_favorites')
    if (saved) setFavorites(JSON.parse(saved))
    const admin = sessionStorage.getItem('accolta_admin')
    if (admin === 'true') setIsAdmin(true)
  }, [])

  const toggleFavorite = (id: number) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
      localStorage.setItem('accolta_favorites', JSON.stringify(next))
      return next
    })
  }

  const handleSelectSong = (song: Song, playlist?: Song[]) => {
    setSelectedSong(song)
    if (playlist) setSongHistory(playlist)
  }

  const handlePrevSong = () => {
    if (!selectedSong || songHistory.length === 0) return
    const idx = songHistory.findIndex(s => s.id === selectedSong.id)
    if (idx > 0) setSelectedSong(songHistory[idx - 1])
  }

  const handleNextSong = () => {
    if (!selectedSong || songHistory.length === 0) return
    const idx = songHistory.findIndex(s => s.id === selectedSong.id)
    if (idx < songHistory.length - 1) setSelectedSong(songHistory[idx + 1])
  }

  if (showAdmin) {
    return (
      <AdminPanel
        onClose={() => setShowAdmin(false)}
        isAdmin={isAdmin}
        onLogin={() => {
          setIsAdmin(true)
          sessionStorage.setItem('accolta_admin', 'true')
        }}
      />
    )
  }

  if (selectedSong) {
    const idx = songHistory.findIndex(s => s.id === selectedSong.id)
    return (
      <SongDetail
        song={selectedSong}
        isFavorite={favorites.includes(selectedSong.id)}
        onToggleFavorite={() => toggleFavorite(selectedSong.id)}
        onBack={() => setSelectedSong(null)}
        isAdmin={isAdmin}
        hasPrev={idx > 0}
        hasNext={idx >= 0 && idx < songHistory.length - 1}
        onPrev={handlePrevSong}
        onNext={handleNextSong}
      />
    )
  }

  if (showTop100) {
    return (
      <Top100Tab
        favorites={favorites}
        onSelectSong={handleSelectSong}
        onToggleFavorite={toggleFavorite}
        onBack={() => setShowTop100(false)}
      />
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <div className="flex-1 overflow-auto pb-20">
        {activeTab === 'home' && (
          <HomeTab
            favorites={favorites}
            onSelectSong={handleSelectSong}
            onToggleFavorite={toggleFavorite}
            onGoToSearch={() => setActiveTab('search')}
            onGoToFavorites={() => setActiveTab('favorites')}
            onGoToTop100={() => setShowTop100(true)}
          />
        )}
        {activeTab === 'search' && (
          <SearchTab
            favorites={favorites}
            onSelectSong={handleSelectSong}
            onToggleFavorite={toggleFavorite}
            searchState={searchState}
            onSearchStateChange={setSearchState}
          />
        )}
        {activeTab === 'artists' && (
          <ArtistTab
            favorites={favorites}
            onSelectSong={handleSelectSong}
            onToggleFavorite={toggleFavorite}
          />
        )}
        {activeTab === 'favorites' && (
          <FavoritesTab
            favorites={favorites}
            onSelectSong={(s) => handleSelectSong(s)}
            onToggleFavorite={toggleFavorite}
          />
        )}
        {activeTab === 'profile' && (
          <ProfileTab
            isAdmin={isAdmin}
            onOpenAdmin={() => setShowAdmin(true)}
          />
        )}
      </div>
      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />
    </div>
  )
}
