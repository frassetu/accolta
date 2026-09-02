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

export type ArtistState = {
  view: 'list' | 'albums' | 'songs'
  selectedArtist: string | null
  selectedAlbum: string | null
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [selectedSong, setSelectedSong] = useState<Song | null>(null)
  const [songHistory, setSongHistory] = useState<Song[]>([])
  const [highlightQuery, setHighlightQuery] = useState('')
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
  const [artistState, setArtistState] = useState<ArtistState>({
    view: 'list',
    selectedArtist: null,
    selectedAlbum: null,
  })

  useEffect(() => {
    const saved = localStorage.getItem('accolta_favorites')
    if (saved) setFavorites(JSON.parse(saved))
    const admin = sessionStorage.getItem('accolta_admin')
    if (admin === 'true') setIsAdmin(true)
  }, [])

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

  const handleSelectSong = (song: Song, playlist?: Song[], highlightQuery?: string) => {
    setSelectedSong(song)
    if (playlist) setSongHistory(playlist)
    setHighlightQuery(highlightQuery || '')
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

  // Depuis la page paroles : aller voir tous les albums de cet artiste.
  const handleGoToArtist = (artiste: string) => {
    setArtistState({ view: 'albums', selectedArtist: artiste, selectedAlbum: null })
    setActiveTab('artists')
    setSelectedSong(null)
    setHighlightQuery('')
  }

  // Depuis la page paroles : aller voir toutes les chansons de cet album.
  const handleGoToAlbum = (artiste: string, album: string | null) => {
    setArtistState({ view: 'songs', selectedArtist: artiste, selectedAlbum: album })
    setActiveTab('artists')
    setSelectedSong(null)
    setHighlightQuery('')
  }

  const selectedIdx = selectedSong ? songHistory.findIndex(s => s.id === selectedSong.id) : -1

  const handleChangeTab = (tab: Tab) => {
    setShowAdmin(false)
    setActiveTab(tab)
  }

  const pageTitles: Record<Tab, string | undefined> = {
    home: undefined,
    search: undefined,
    artists: 'Artisti',
    top100: 'Top 100',
    favorites: 'I me favuriti',
    profile: 'Prufilu',
  }

  return (
    <>
      {showSplash && <Splash onFinish={() => setShowSplash(false)} />}

      {/* Les deux "modes" (appli normale / admin) restent montés en
          permanence, on bascule juste leur visibilité en CSS — sinon
          fermer puis rouvrir l'admin (ou changer d'onglet) faisait tout
          redémarrer à zéro (onglet admin, position de recherche, etc.). */}
      <div className={showAdmin ? 'hidden' : ''}>
        <TopBar title={pageTitles[activeTab]} />
        <div className="flex flex-col min-h-screen bg-bg">
          <div className="flex-1 pt-[60px] pb-20">
            <div className={activeTab === 'home' ? 'h-full' : 'hidden'}>
              <HomeTab
                favorites={favorites}
                onSelectSong={handleSelectSong}
                onToggleFavorite={toggleFavorite}
                onGoToSearch={() => setActiveTab('search')}
              />
            </div>
            <div className={activeTab === 'search' ? 'h-full' : 'hidden'}>
              <SearchTab
                favorites={favorites}
                onSelectSong={handleSelectSong}
                onToggleFavorite={toggleFavorite}
                searchState={searchState}
                onSearchStateChange={setSearchState}
                active={activeTab === 'search' && !showAdmin}
              />
            </div>
            <div className={activeTab === 'artists' ? 'h-full' : 'hidden'}>
              <ArtistTab
                favorites={favorites}
                onSelectSong={handleSelectSong}
                onToggleFavorite={toggleFavorite}
                artistState={artistState}
                onArtistStateChange={setArtistState}
              />
            </div>
            <div className={activeTab === 'top100' ? 'h-full' : 'hidden'}>
              <Top100Tab
                favorites={favorites}
                onSelectSong={handleSelectSong}
                onToggleFavorite={toggleFavorite}
              />
            </div>
            <div className={activeTab === 'favorites' ? 'h-full' : 'hidden'}>
              <FavoritesTab
                favorites={favorites}
                onSelectSong={handleSelectSong}
                onToggleFavorite={toggleFavorite}
              />
            </div>
            <div className={activeTab === 'profile' ? 'h-full' : 'hidden'}>
              <ProfileTab
                isAdmin={isAdmin}
                onOpenAdmin={() => setShowAdmin(true)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={showAdmin ? '' : 'hidden'}>
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
      </div>

      {/* Toujours affiché, y compris en admin — un appui referme l'admin et
          bascule directement sur l'onglet choisi. */}
      <BottomNav activeTab={activeTab} onChangeTab={handleChangeTab} />

      {/* Vue paroles affichée en surimpression : les onglets restent montés
          en dessous, ce qui préserve l'état de navigation (recherche, artiste,
          album…) quand on revient en arrière depuis les paroles. */}
      {selectedSong && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-bg">
          <SongDetail
            song={selectedSong}
            isFavorite={favorites.includes(selectedSong.id)}
            onToggleFavorite={() => toggleFavorite(selectedSong.id)}
            onBack={() => { setSelectedSong(null); setHighlightQuery('') }}
            isAdmin={isAdmin}
            hasPrev={selectedIdx > 0}
            hasNext={selectedIdx >= 0 && selectedIdx < songHistory.length - 1}
            onPrev={handlePrevSong}
            onNext={handleNextSong}
            highlightQuery={highlightQuery}
            onGoToArtist={handleGoToArtist}
            onGoToAlbum={handleGoToAlbum}
          />
        </div>
      )}
    </>
  )
}
