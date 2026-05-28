import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

async function requireAuth() {
  const session = await getServerSession(authOptions)
  return session ?? null
}

export async function GET(req: NextRequest) {
  if (!await requireAuth()) return new NextResponse('Unauthorized', { status: 401 })

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status') || 'pending'
  const category = searchParams.get('category')

  let query = supabase
    .from('reminders')
    .select('*')
    .eq('status', status)
    .order('due_at', { ascending: true })

  if (category && category !== 'all') {
    query = query.eq('category', category)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!await requireAuth()) return new NextResponse('Unauthorized', { status: 401 })

  const body = await req.json()
  const userNumber = process.env.USER_WHATSAPP_NUMBER!

  const { data, error } = await supabase
    .from('reminders')
    .insert({ ...body, whatsapp_number: userNumber })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  if (!await requireAuth()) return new NextResponse('Unauthorized', { status: 401 })

  const { id, ...updates } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('reminders')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  if (!await requireAuth()) return new NextResponse('Unauthorized', { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('reminders').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
