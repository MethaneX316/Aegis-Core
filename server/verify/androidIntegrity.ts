import axios from 'axios'
import { jwtVerify } from 'jose'

export async function verifyPlayIntegrity(token: string) {
  const res = await axios.post(
    `https://playintegrity.googleapis.com/v1/decodeIntegrityToken`,
    { integrityToken: token },
    {
      headers: {
        Authorization: `Bearer ${process.env.GOOGLE_ACCESS_TOKEN}`
      }
    }
  )

  const verdict = res.data.tokenPayloadExternal

  const deviceIntegrity =
    verdict.deviceIntegrity?.deviceRecognitionVerdict || []

  const appIntegrity =
    verdict.appIntegrity?.appRecognitionVerdict

  return {
    deviceTrusted: deviceIntegrity.includes('MEETS_STRONG_INTEGRITY'),
    appTrusted: appIntegrity === 'PLAY_RECOGNIZED',
    verdict
  }
}
