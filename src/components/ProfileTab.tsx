'use client'

import { ShieldCheck, User, Info } from 'lucide-react'

interface Props {
  isAdmin: boolean
  onOpenAdmin: () => void
}

export default function ProfileTab({ isAdmin, onOpenAdmin }: Props) {
  return (
    <div className="px-4 pt-14 pb-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <User className="w-6 h-6 text-accent" />
        <h1 className="font-display font-bold text-xl text-text">Profil</h1>
      </div>

      <div className="space-y-3">
        {/* Admin access */}
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
              {isAdmin ? "Connecté en tant qu'admin" : 'Accès réservé'}
            </p>
          </div>
          {isAdmin && (
            <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full font-medium">
              Admin
            </span>
          )}
        </button>

        {/* About */}
        <div className="p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center gap-3 mb-3">
            <Info className="w-5 h-5 text-text-muted" />
            <p className="font-display font-semibold text-text">À propos</p>
          </div>
          <p className="text-text-muted text-sm leading-relaxed">
            Accolta est une application de paroles de chansons corses. 
            Chaque visiteur peut consulter et mettre en favoris ses chansons préférées.
          </p>
          <p className="text-muted text-xs mt-3">Version 1.0.0</p>
        </div>
      </div>
    </div>
  )
}
