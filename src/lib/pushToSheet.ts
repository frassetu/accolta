async function pushToSheet(payload: Record<string, any>) {
  const url = process.env.SHEET_PUSH_URL
  const secret = process.env.SHEET_PUSH_SECRET
  if (!url || !secret) return
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, secret }),
    })
  } catch (e) {
    console.error('pushToSheet error:', e)
  }
}

export async function pushUpsertToSheet(song: {
  id: number | string
  artiste: string
  album?: string | null
  titre: string
  annee?: number | null
  numero?: number | null
  paroles?: string | null
}) {
  await pushToSheet({ action: 'upsert', ...song })
}

export async function pushDeleteToSheet(id: number | string) {
  await pushToSheet({ action: 'delete', id })
}