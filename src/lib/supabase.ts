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

// Track song views in localStorage (no backend needed)
export function trackView(songId: number) {
  if (typeof window === 'undefined') return
  const key = 'accolta_views'
  const views: Record<number, number> = JSON.parse(localStorage.getItem(key) || '{}')
  views[songId] = (views[songId] || 0) + 1
  localStorage.setItem(key, JSON.stringify(views))
}

export function getViews(): Record<number, number> {
  if (typeof window === 'undefined') return {}
  return JSON.parse(localStorage.getItem('accolta_views') || '{}')
}
