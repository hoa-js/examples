export default class TOTP {
  constructor ({
    digits = 6,
    step = 30,
    window = 1
  } = {}) {
    this.digits = digits
    this.step = step
    this.window = window
  }

  static base32ToUint8Array (base32) {
    if (!base32) return new Uint8Array(0)
    const tryDecode = (s) => {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
      const clean = s.replace(/[\s-]+/g, '').replace(/=+$/, '').toUpperCase()
      let bits = ''
      for (const c of clean) {
        const val = alphabet.indexOf(c)
        if (val === -1) return null
        bits += val.toString(2).padStart(5, '0')
      }
      const bytes = bits.match(/.{1,8}/g)?.map((b) => parseInt(b.padEnd(8, '0'), 2)) ?? []
      return new Uint8Array(bytes)
    }
    let res = tryDecode(base32)
    if (res) return res
    const mapped = base32.replace(/0/g, 'O').replace(/1/g, 'L')
    res = tryDecode(mapped)
    if (res) return res
    const encoder = new TextEncoder()
    return encoder.encode(base32)
  }

  async generate (secretBase32, timestamp = Date.now()) {
    const counter = Math.floor(timestamp / 1000 / this.step)
    return this._generateFromCounter(secretBase32, counter)
  }

  async verify (token, secretBase32, timestamp = Date.now()) {
    const counter = Math.floor(timestamp / 1000 / this.step)

    for (let errorWindow = -this.window; errorWindow <= this.window; errorWindow++) {
      const expect = await this._generateFromCounter(secretBase32, counter + errorWindow)
      if (expect === token) {
        return true
      }
    }
    return false
  }

  async _generateFromCounter (secretBase32, counter) {
    const secret = TOTP.base32ToUint8Array(secretBase32)
    const buffer = new ArrayBuffer(8)
    const view = new DataView(buffer)
    view.setUint32(4, counter, false)

    const key = await crypto.subtle.importKey(
      'raw',
      secret,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    )
    const hmac = await crypto.subtle.sign('HMAC', key, buffer)
    const h = new Uint8Array(hmac)

    const offset = h[h.length - 1] & 0xf
    const code =
      ((h[offset] & 0x7f) << 24) |
      ((h[offset + 1] & 0xff) << 16) |
      ((h[offset + 2] & 0xff) << 8) |
      (h[offset + 3] & 0xff)

    return (code % 10 ** this.digits).toString().padStart(this.digits, '0')
  }
}
