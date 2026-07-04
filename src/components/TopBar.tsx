'use client'

import { Music2 } from 'lucide-react'

// Bandeau fixe affiché en permanence tout en haut de l'application,
// quelle que soit la page. Hauteur totale ≈ 92px (pt-12 + contenu + pb-3),
// à garder synchronisée avec le padding-top pt-[92px] appliqué au contenu
// des pages dans page.tsx et les sticky headers internes (top-[92px]).
export default function TopBar() {
  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-bg border-b border-border">
      <div className="max-w-lg mx-auto flex items-center gap-2 px-4 pt-12 pb-3">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
          <Music2 className="w-4 h-4 text-white" />
        </div>
        <span className="font-display font-bold text-text text-lg">Vogliu Cantà !</span>
      </div>
    </div>
  )
}