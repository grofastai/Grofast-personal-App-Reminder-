import { NextRequest, NextResponse } from 'next/server'
import { checkAndFireReminders } from '@/lib/scheduler'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    await checkAndFireReminders()
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() })
  } catch (err) {
    console.error('[cron] error:', err)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}
