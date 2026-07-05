import { useRef } from 'react'

// Largeur de la zone de bord gauche (px) qui déclenche le retour, comme le
// geste natif iOS/Android. En dehors de cette zone, un glissement horizontal
// est ignoré ici pour ne pas interférer avec d'autres gestes (ex: chanson
// suivante/précédente dans SongDetail).
const EDGE_ZONE = 24
const SWIPE_THRESHOLD = 60

export function useEdgeSwipeBack(onBack: () => void) {
  const touchStart = useRef<{ x: number; y: number; edge: boolean } | null>(null)

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY, edge: t.clientX <= EDGE_ZONE }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start || !start.edge) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (dx > SWIPE_THRESHOLD && dx > Math.abs(dy) * 1.5) {
      onBack()
    }
  }

  return { onTouchStart, onTouchEnd }
}
