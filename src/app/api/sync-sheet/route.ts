import { NextRequest, NextResponse } from 'next/server'
import { checkAuth } from '@/lib/adminAuth'
import { importRows } from '@/lib/importChansons'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const isCron = !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`
  if (!isCron && !checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const csvUrl = process.env.GOOGLE_SHEET_CSV_URL
  if (!csvUrl) {
    return NextResponse.json({ error: 'GOOGLE_SHEET_CSV_URL non configurée' }, { status: 500 })
  }

  const res = await fetch(csvUrl, { cache: 'no-store' })
  if (!res.ok) {
    return NextResponse.json({ error: `Impossible de lire le Google Sheet (${res.status})` }, { status: 502 })
  }
  const csvText = await res.text()

  const XLSX = await import('xlsx')
  const wb = XLSX.read(csvText, { type: 'string' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

  try {
    const result = await importRows(rows)
    return NextResponse.json({ ...result, synced_at: new Date().toISOString() })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
