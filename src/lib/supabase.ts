import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Song = {
  id: number
  artiste: string
  album: string
  titre: string
  annee: number | null
  numero: number | null
  paroles: string | null
  created_at: string
  view_count?: number
}

// Track song views globally (shared across all users) via Supabase.
// Requires the `view_count` column + `increment_view_count` function (see README / SQL setup).
const recentViews = new Map<number, number>()

export function trackView(songId: number) {
  if (typeof window === 'undefined') return
  // Anti-rebond : ne recompte pas la même chanson si elle a été vue il y a
  // moins de 2 s (évite que la navigation ◀ ▶ ne gonfle artificiellement le Top 100).
  const now = Date.now()
  const last = recentViews.get(songId) || 0
  if (now - last < 2000) return
  recentViews.set(songId, now)
  supabase.rpc('increment_view_count', { song_id: songId }).then(({ error }) => {
    if (error) console.error('trackView error:', error.message)
  })
}
