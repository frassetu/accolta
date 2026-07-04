'use client'

import { useRef, useState } from 'react'
import { ShieldCheck, User, Info } from 'lucide-react'

interface Props {
  isAdmin: boolean
  onOpenAdmin: () => void
}

// Nombre de taps sur "Version" nécessaires pour révéler l'accès admin,
// et délai max entre deux taps avant que le compteur ne se réinitialise.
const TAPS_REQUIRED = 5
const TAP_RESET_MS = 3000

export default function ProfileTab({ isAdmin, onOpenAdmin }: Props) {
  const [revealed, setRevealed] = useState(false)
  const tapCount = useRef(0)
  const tapTimer = useRef<NodeJS.Timeout>()

  const handleVersionTap = () => {
    tapCount.current += 1
    clearTimeout(tapTimer.current)
    if (tapCount.current >= TAPS_REQUIRED) {
      setRevealed(true)
      tapCount.current = 0
      return
    }
    tapTimer.current = setTimeout(() => { tapCount.current = 0 }, TAP_RESET_MS)
  }

  const showAdminEntry = isAdmin || revealed

  return (
    <div className="px-4 pt-4 pb-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <User className="w-6 h-6 text-accent" />
        <h1 className="font-display font-bold text-xl text-text">Profil</h1>
      </div>

      <div className="space-y-3">
        {showAdminEntry && (
          <button
            onClick={onOpenAdmin}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:border-accent transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1">
              <p className="font-display font-semibold text-text">Espace administrateur</p>
              <p className="text-text-muted text-sm">
                {isAdmin ? 'Connecte en tant qu admin' : 'Acces reserve'}
              </p>
            </div>
            {isAdmin && (
              <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full font-medium">
                Admin
              </span>
            )}
          </button>
        )}

        <div className="p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center gap-3 mb-3">
            <Info className="w-5 h-5 text-text-muted" />
            <p className="font-display font-semibold text-text">A propos</p>
          </div>
          <p className="text-text-muted text-sm leading-relaxed">
            Accolta est une application de paroles de chansons corses.
            Chaque visiteur peut consulter et mettre en favoris ses chansons preferees.
          </p>
          <p
            onClick={handleVersionTap}
            className="text-muted text-xs mt-3 select-none"
          >
            Version {process.env.NEXT_PUBLIC_BUILD_SHA} · {process.env.NEXT_PUBLIC_BUILD_DATE}
          </p>
        </div>
      </div>
    </div>
  )
}
