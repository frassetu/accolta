export const runtime = 'nodejs'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function checkAdmin(req: NextRequest) {
  const token = req.headers.get('x-admin-token')
  const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || ''
  const secretToken = process.env.ADMIN_SECRET_TOKEN || ''
  return token !== '' && (token === adminPassword || token === secretToken)
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)

  if (searchParams.get('action') === 'stats') {
    const { count: total } = await supabaseAdmin
      .from('chansons')
      .select('*', { count: 'exact', head: true })

    const { count: withLyrics } = await supabaseAdmin
      .from('chansons')
      .select('*', { count: 'exact', head: true })
      .not('paroles', 'is', null)

    const { data } = await supabaseAdmin.from('chansons').select('artiste')
    const artists = new Set(data?.map((r: any) => r.artiste)).size

    return NextResponse.json({ total, withLyrics, artists })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const contentType = req.headers.get('content-type') || ''

  // ✅ IMPORT EXCEL (CORRIGÉ)
  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier recu' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const XLSX = await import('xlsx')
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rawRows: any[] = XLSX.utils.sheet_to_json(ws)

    const allRows = rawRows
      .map((r) => ({
        artiste: (r['Artistu'] || r['artiste'] || r['Artiste'] || '').toString().trim(),
        album: (r['Dischettu'] || r['album'] || r['Album'] || '').toString().trim(),
        titre: (r['Titulu'] || r['titre'] || r['Titre'] || '').toString().trim(),
        annee: (() => {
          const v = r['Annata'] ?? r['annee'] ?? r['Annee']
          return v ? parseInt(v) || null : null
        })(),
        paroles: r['Parolle'] || r['paroles'] || r['Paroles'] || null,
      }))
      .filter((r) => r.artiste && r.titre)

    if (allRows.length === 0) {
      return NextResponse.json(
        { error: 'Aucune ligne valide. Colonnes attendues : Artistu, Titulu' },
        { status: 400 }
      )
    }

    // ✅ ✅ PLUS DE DÉDOUBLONNAGE
    const rows = allRows

    let inserted = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i += 50) {
      const chunk = rows.slice(i, i + 50)

      // ✅ INSERT SIMPLE (plus de conflit)
      const { data, error } = await supabaseAdmin
        .from('chansons')
        .insert(chunk)
        .select('id')

      if (error) {
        errors.push(`Batch ${Math.floor(i / 50) + 1}: ${error.message}`)
      } else {
        inserted += data?.length || 0
      }
    }

    return NextResponse.json({
      total_in_file: rawRows.length,
      after_dedup: rows.length, // maintenant = total
      inserted,
      errors: errors.slice(0, 5),
    })
  }

  // ✅ ACTIONS MANUELLES
  const body = await req.json()
  const { action, ...payload } = body

  if (action === 'upsert') {
    const { data, error } = await supabaseAdmin
      .from('chansons')
      .insert(payload) // ✅ remplacé (plus de conflit)
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  if (action === 'update') {
    const { id, ...fields } = payload

    const { data, error } = await supabaseAdmin
      .from('chansons')
      .update(fields)
      .eq('id', id)
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabaseAdmin.from('chansons').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
