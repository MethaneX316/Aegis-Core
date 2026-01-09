import Foundation
import Capacitor
import LocalAuthentication

@objc(AegisNativeBridgePlugin)
public class AegisNativeBridgePlugin: CAPPlugin {

    @objc func startFingerprintScan(_ call: CAPPluginCall) {

        let context = LAContext()
        var error: NSError?

        let policy: LAPolicy = .deviceOwnerAuthenticationWithBiometrics

        guard context.canEvaluatePolicy(policy, error: &error) else {
            call.resolve([
                "success": false,
                "status": "FAIL",
                "attestationLevel": "SANDBOX",
                "error": error?.localizedDescription ?? "Biometrics unavailable"
            ])
            return
        }

        context.evaluatePolicy(policy,
                               localizedReason: "Aegis Secure Authentication") {
            success, authError in

            DispatchQueue.main.async {
                if success {
                    let level: String
                    if #available(iOS 11.0, *) {
                        level = context.biometryType == .faceID ? "HARDWARE" : "STRONG"
                    } else {
                        level = "STRONG"
                    }

                    call.resolve([
                        "success": true,
                        "status": "SUCCESS",
                        "attestationLevel": level
                    ])
                } else {
                    call.resolve([
                        "success": false,
                        "status": "FAIL",
                        "attestationLevel": "SANDBOX",
                        "error": authError?.localizedDescription ?? "Authentication failed"
                    ])
                }
            }
        }
    }
}


@objc func getAppAttest(_ call: CAPPluginCall) {

    if #available(iOS 14.0, *) {
        let service = DCAppAttestService.shared

        guard service.isSupported else {
            call.resolve([
                "success": false,
                "error": "App Attest not supported"
            ])
            return
        }

        let challenge = UUID().uuidString.data(using: .utf8)!

        service.generateKey { keyId, error in
            if let error = error {
                call.resolve([
                    "success": false,
                    "error": error.localizedDescription
                ])
                return
            }

            service.attestKey(keyId!, clientDataHash: challenge) { attestation, error in
                if let error = error {
                    call.resolve([
                        "success": false,
                        "error": error.localizedDescription
                    ])
                    return
                }

                call.resolve([
                    "success": true,
                    "integrityToken": attestation!.base64EncodedString(),
                    "attestation": "APP_ATTEST"
                ])
            }
        }

    } else {
        call.resolve([
            "success": false,
            "error": "iOS version too low"
        ])
    }
}
