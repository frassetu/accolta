'use client'

import { useState, useEffect } from 'react'
import HomeTab from '@/components/HomeTab'
import SearchTab from '@/components/SearchTab'
import FavoritesTab from '@/components/FavoritesTab'
import ProfileTab from '@/components/ProfileTab'
import SongDetail from '@/components/SongDetail'
import BottomNav from '@/components/BottomNav'
import AdminPanel from '@/components/AdminPanel'
import { Song } from '@/lib/supabase'

export type Tab = 'home' | 'search' | 'favorites' | 'profile'

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [selectedSong, setSelectedSong] = useState<Song | null>(null)
  const [favorites, setFavorites] = useState<number[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)

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
    return (
      <SongDetail
        song={selectedSong}
        isFavorite={favorites.includes(selectedSong.id)}
        onToggleFavorite={() => toggleFavorite(selectedSong.id)}
        onBack={() => setSelectedSong(null)}
      />
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <div className="flex-1 overflow-auto pb-20">
        {activeTab === 'home' && (
          <HomeTab
            favorites={favorites}
            onSelectSong={setSelectedSong}
            onToggleFavorite={toggleFavorite}
            onGoToSearch={() => setActiveTab('search')}
            onGoToFavorites={() => setActiveTab('favorites')}
          />
        )}
        {activeTab === 'search' && (
          <SearchTab
            favorites={favorites}
            onSelectSong={setSelectedSong}
            onToggleFavorite={toggleFavorite}
          />
        )}
        {activeTab === 'favorites' && (
          <FavoritesTab
            favorites={favorites}
            onSelectSong={setSelectedSong}
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
