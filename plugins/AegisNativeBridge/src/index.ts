import { registerPlugin } from '@capacitor/core'
import type { AegisNativeBridgePlugin } from './definitions'

export const AegisNativeBridge =
  registerPlugin<AegisNativeBridgePlugin>('AegisNativeBridge')
