const fetchMock = jest.fn()
global.fetch = fetchMock

beforeEach(() => {
  fetchMock.mockClear()
  process.env.WHATSAPP_ACCESS_TOKEN = 'test-token'
  process.env.WHATSAPP_PHONE_NUMBER_ID = '123456789'
})

import { sendWhatsAppMessage } from '@/lib/whatsapp'

describe('sendWhatsAppMessage', () => {
  it('calls Meta Graph API with correct payload', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.test' }] }),
    })

    await sendWhatsAppMessage('+919876543210', 'Hello da!')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://graph.facebook.com/v19.0/123456789/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: '+919876543210',
          type: 'text',
          text: { body: 'Hello da!' },
        }),
      })
    )
  })

  it('throws on non-ok response', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 400 })
    await expect(sendWhatsAppMessage('+919876543210', 'test')).rejects.toThrow('WhatsApp API error: 400')
  })
})
