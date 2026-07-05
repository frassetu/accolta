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
import TopBar from '@/components/TopBar'
import Splash from '@/components/Splash'
import { Song } from '@/lib/supabase'

export type Tab = 'home' | 'search' | 'artists' | 'top100' | 'favorites' | 'profile'

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
  const [showSplash, setShowSplash] = useState(true)
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
  
// Empêche la page sous-jacente (onglet Artiste/Album, etc.) de rester
  // scrollable pendant que la vue paroles est ouverte en surimpression :
  // sinon la barre de défilement affichée reflète la hauteur de la page
  // du dessous (potentiellement longue) et pas celle des paroles affichées.
  useEffect(() => {
    if (selectedSong) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [selectedSong])
  
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

  const selectedIdx = selectedSong ? songHistory.findIndex(s => s.id === selectedSong.id) : -1

  const pageTitles: Record<Tab, string | undefined> = {
    home: undefined,
    search: undefined,
    artists: 'Artisti',
    top100: 'Top 100',
    favorites: 'Mes favoris',
    profile: 'Profil',
  }

  return (
    <>
      {showSplash && <Splash onFinish={() => setShowSplash(false)} />}

      {showAdmin ? (
        <AdminPanel
          onClose={() => setShowAdmin(false)}
          isAdmin={isAdmin}
          onLogin={() => {
            setIsAdmin(true)
            sessionStorage.setItem('accolta_admin', 'true')
          }}
          onLogout={() => {
            setIsAdmin(false)
            sessionStorage.removeItem('accolta_admin')
          }}
        />
      ) : (
        <>
          <TopBar title={pageTitles[activeTab]} />
          <div className="flex flex-col min-h-screen bg-bg">
            <div className="flex-1 pt-[60px] pb-20">
              {activeTab === 'home' && (
                <HomeTab
                  favorites={favorites}
                  onSelectSong={handleSelectSong}
                  onToggleFavorite={toggleFavorite}
                  onGoToSearch={() => setActiveTab('search')}
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
              {activeTab === 'top100' && (
                <Top100Tab
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

          {/* Vue paroles affichée en surimpression : les onglets restent montés
              en dessous, ce qui préserve l'état de navigation (recherche, artiste,
              album…) quand on revient en arrière depuis les paroles. */}
          {selectedSong && (
            <div className="fixed inset-0 z-[60] overflow-y-auto bg-bg">
              <SongDetail
                song={selectedSong}
                isFavorite={favorites.includes(selectedSong.id)}
                onToggleFavorite={() => toggleFavorite(selectedSong.id)}
                onBack={() => setSelectedSong(null)}
                isAdmin={isAdmin}
                hasPrev={selectedIdx > 0}
                hasNext={selectedIdx >= 0 && selectedIdx < songHistory.length - 1}
                onPrev={handlePrevSong}
                onNext={handleNextSong}
              />
            </div>
          )}
        </>
      )}
    </>
  )
}
