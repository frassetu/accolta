'use client'

interface Props {
  title?: string
}

// Bandeau fixe affiché en permanence tout en haut de l'application,
// quelle que soit la page. Hauteur totale = 100px (pt-6 + h-16 + pb-3),
// à garder synchronisée avec pt-[100px] dans page.tsx et top-[100px]
// du sticky header interne à ArtistTab (vues albums/songs).
export default function TopBar({ title }: Props) {
  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-bg">
      <div className="max-w-lg mx-auto flex items-center justify-between gap-3 px-4 pt-1 pb-1">
        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          <img src="/icon-192.png" alt="" className="w-10 h-10 rounded-xl flex-shrink-0" />
          <img src="/logo-wordmark-transparent.png" alt="Vogliu Cantà !" className="h-12 w-auto" />
        </div>
        {title && (
          <span className="font-display font-semibold text-text text-sm truncate">{title}</span>
        )}
      </div>
    </div>
  )
}
