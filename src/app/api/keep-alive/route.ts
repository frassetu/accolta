import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Appelée automatiquement une fois par jour par le cron Vercel (voir
// vercel.json). Le seul but est de générer un peu d'activité base de
// données régulièrement, pour que le projet Supabase (plan gratuit) ne
// se mette jamais en pause pour inactivité (seuil : ~7 jours sans requête).
// Rien à faire manuellement une fois en place — c'est purement automatique.
export async function GET(req: NextRequest) {
  // Vercel ajoute automatiquement ce header sur les appels cron : on
  // vérifie qu'il correspond, pour qu'un visiteur ne puisse pas déclencher
  // cette route lui-même (même si l'impact serait de toute façon nul).
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase.from('chansons').select('id').limit(1)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, pinged_at: new Date().toISOString() })
}
