'use client'

import { Home, Music2, Heart, User, Trophy } from 'lucide-react'
import { Tab } from '@/app/page'

interface Props {
  activeTab: Tab
  onChangeTab: (tab: Tab) => void
}

const tabs = [
  { id: 'home' as Tab, label: 'Accueil', Icon: Home },
  { id: 'artists' as Tab, label: 'Artisti', Icon: Music2 },
  { id: 'top100' as Tab, label: 'Top 100', Icon: Trophy },
  { id: 'favorites' as Tab, label: 'Favoris', Icon: Heart },
  { id: 'profile' as Tab, label: 'Profil', Icon: User },
]

export default function BottomNav({ activeTab, onChangeTab }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-50">
      <div className="flex items-stretch max-w-lg mx-auto">
        {tabs.map(({ id, label, Icon }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              onClick={() => onChangeTab(id)}
              className="flex-1 flex flex-col items-center gap-1 py-3 transition-all"
            >
              <div className={`relative ${active ? 'text-accent' : 'text-muted'}`}>
                {id === 'favorites' && active ? (
                  <Heart className="w-5 h-5" fill="currentColor" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
                {active && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
                )}
              </div>
              <span className={`text-[10px] font-medium ${active ? 'text-accent' : 'text-muted'}`}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
