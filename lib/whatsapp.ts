const GRAPH_API = 'https://graph.facebook.com/v19.0'

export async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  const res = await fetch(
    `${GRAPH_API}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      }),
    }
  )
  if (!res.ok) throw new Error(`WhatsApp API error: ${res.status}`)
}
