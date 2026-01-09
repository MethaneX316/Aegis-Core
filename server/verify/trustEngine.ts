export function deriveTrust({
  biometric,
  deviceTrusted,
  appTrusted
}: {
  biometric: boolean
  deviceTrusted: boolean
  appTrusted: boolean
}) {
  if (biometric && deviceTrusted && appTrusted) {
    return 'ADMIN'
  }

  if (biometric && appTrusted) {
    return 'ANALYST'
  }

  return 'USER'
}
