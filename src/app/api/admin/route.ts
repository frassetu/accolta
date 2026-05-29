import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function checkAdmin(req: NextRequest) {
  const token = req.headers.get('x-admin-token')
  return token === process.env.ADMIN_SECRET_TOKEN
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  if (action === 'stats') {
    const { count: total } = await supabaseAdmin.from('chansons').select('*', { count: 'exact', head: true })
    const { count: withLyrics } = await supabaseAdmin.from('chansons').select('*', { count: 'exact', head: true }).not('paroles', 'is', null)
    const { data } = await supabaseAdmin.from('chansons').select('artiste')
    const artists = new Set(data?.map((r: any) => r.artiste)).size
    return NextResponse.json({ total, withLyrics, artists })
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { action, ...payload } = body

  if (action === 'upsert') {
    const { data, error } = await supabaseAdmin
      .from('chansons').upsert(payload, { onConflict: 'artiste,titre' }).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  if (action === 'update') {
    const { id, ...fields } = payload
    const { data, error } = await supabaseAdmin
      .from('chansons').update(fields).eq('id', id).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  if (action === 'import') {
    // Dédoublonnage côté serveur avant insertion
    const raw: any[] = payload.rows || []

    // Dédoublonner par artiste+titre (garde la dernière occurrence qui a le plus de données)
    const seen = new Map<string, any>()
    for (const row of raw) {
      const key = `${(row.artiste || '').toLowerCase().trim()}|||${(row.titre || '').toLowerCase().trim()}`
      const existing = seen.get(key)
      // Préfère la version avec paroles
      if (!existing || (!existing.paroles && row.paroles)) {
        seen.set(key, row)
      }
    }
    const rows = Array.from(seen.values())

    let inserted = 0
    let updated = 0
    const errors: string[] = []

    // Upsert par batches de 50 (safe pour Supabase)
    for (let i = 0; i < rows.length; i += 50) {
      const chunk = rows.slice(i, i + 50)
      const { data, error } = await supabaseAdmin
        .from('chansons')
        .upsert(chunk, { onConflict: 'artiste,titre', ignoreDuplicates: false })
        .select('id')

      if (error) {
        errors.push(`Batch ${Math.floor(i/50)+1}: ${error.message}`)
      } else {
        inserted += data?.length || 0
      }
    }

    return NextResponse.json({
      total_in_file: raw.length,
      after_dedup: rows.length,
      inserted,
      errors: errors.slice(0, 5) // max 5 erreurs remontées
    })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const { error } = await supabaseAdmin.from('chansons').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
