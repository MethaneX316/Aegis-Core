export function deriveTrustLevel(result: {
  biometric: boolean
  integrity: boolean
  attestationLevel?: string
}) {
  if (result.biometric && result.integrity && result.attestationLevel === 'HARDWARE') {
    return 'ADMIN'
  }

  if (result.biometric && result.integrity) {
    return 'ANALYST'
  }

  return 'USER'
}
