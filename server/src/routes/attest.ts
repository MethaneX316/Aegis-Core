import { Router } from 'express'
import { verifyPlayIntegrity } from '../verify/androidIntegrity'
import { verifyAppAttest } from '../verify/iosAttest'
import { deriveTrust } from '../verify/trustEngine'

const router = Router()

router.post('/attest', async (req, res) => {
  const { platform, integrityToken, biometric } = req.body

  let integrity = false

  if (platform === 'ANDROID') {
    const r = await verifyPlayIntegrity(integrityToken)
    integrity = r.deviceTrusted && r.appTrusted
  }

  if (platform === 'IOS') {
    const r = await verifyAppAttest(integrityToken)
    integrity = r.deviceTrusted && r.appTrusted
  }

  const role = deriveTrust({
    biometric,
    deviceTrusted: integrity,
    appTrusted: integrity
  })

  res.json({
    role,
    integrity,
    biometric
  })
})

export default router
