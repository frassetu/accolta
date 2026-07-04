'use client'

// Bandeau fixe affiché en permanence tout en haut de l'application,
// quelle que soit la page. Hauteur totale = 68px (pt-6 + h-8 + pb-3),
// à garder synchronisée avec pt-[68px] dans page.tsx et top-[68px]
// des sticky headers internes (ArtistTab, Top100Tab).
export default function TopBar() {
  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-bg border-b border-border">
      <div className="max-w-lg mx-auto flex items-center gap-2 px-4 pt-6 pb-3">
        <img src="/icon-192.png" alt="" className="w-8 h-8 rounded-lg flex-shrink-0" />
        <img src="/logo-wordmark-transparent.png" alt="Vogliu Cantà !" className="h-7 w-auto" />
      </div>
    </div>
  )
}
