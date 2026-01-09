package com.aegis.plugin;

import android.app.Activity;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;

import com.getcapacitor.*;

import java.util.concurrent.Executor;

@CapacitorPlugin(
        name = "AegisNativeBridge"
)
public class AegisNativeBridgePlugin extends Plugin {

    private Executor executor;

    @Override
    public void load() {
        executor = ContextCompat.getMainExecutor(getContext());
    }

    @PluginMethod
    public void startFingerprintScan(PluginCall call) {
        Activity activity = getActivity();

        BiometricManager biometricManager = BiometricManager.from(getContext());

        int canAuth = biometricManager.canAuthenticate(
                BiometricManager.Authenticators.BIOMETRIC_STRONG
        );

        if (canAuth != BiometricManager.BIOMETRIC_SUCCESS) {
            call.resolve(JSObject.fromJSONObject(
                    new JSObject()
                            .put("success", false)
                            .put("status", "FAIL")
                            .put("attestationLevel", "SANDBOX")
                            .put("error", "Biometric hardware not available or not enrolled")
            ));
            return;
        }

        BiometricPrompt.AuthenticationCallback callback =
                new BiometricPrompt.AuthenticationCallback() {

                    @Override
                    public void onAuthenticationSucceeded(
                            @NonNull BiometricPrompt.AuthenticationResult result) {

                        JSObject res = new JSObject();
                        res.put("success", true);
                        res.put("status", "SUCCESS");

                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                            res.put("attestationLevel", "HARDWARE");
                        } else {
                            res.put("attestationLevel", "STRONG");
                        }

                        call.resolve(res);
                    }

                    @Override
                    public void onAuthenticationFailed() {
                        JSObject res = new JSObject();
                        res.put("success", false);
                        res.put("status", "FAIL");
                        res.put("attestationLevel", "STRONG");
                        res.put("error", "Authentication failed");
                        call.resolve(res);
                    }

                    @Override
                    public void onAuthenticationError(int errorCode,
                                                      @NonNull CharSequence errString) {
                        JSObject res = new JSObject();
                        res.put("success", false);
                        res.put("status", "FAIL");
                        res.put("attestationLevel", "SANDBOX");
                        res.put("error", errString.toString());
                        call.resolve(res);
                    }
                };

        BiometricPrompt biometricPrompt =
                new BiometricPrompt(activity, executor, callback);

        BiometricPrompt.PromptInfo promptInfo =
                new BiometricPrompt.PromptInfo.Builder()
                        .setTitle("Aegis Secure Authentication")
                        .setSubtitle("Verify identity")
                        .setAllowedAuthenticators(
                                BiometricManager.Authenticators.BIOMETRIC_STRONG
                        )
                        .setConfirmationRequired(true)
                        .build();

        biometricPrompt.authenticate(promptInfo);
    }
}

@PluginMethod
public void getPlayIntegrityToken(PluginCall call) {
    IntegrityManager integrityManager =
            IntegrityManagerFactory.create(getContext());

    String nonce = UUID.randomUUID().toString();

    IntegrityTokenRequest request =
            IntegrityTokenRequest.builder()
                    .setNonce(nonce)
                    .build();

    integrityManager.requestIntegrityToken(request)
            .addOnSuccessListener(response -> {
                JSObject res = new JSObject();
                res.put("success", true);
                res.put("integrityToken", response.token());
                res.put("nonce", nonce);
                res.put("attestation", "PLAY_INTEGRITY");
                call.resolve(res);
            })
            .addOnFailureListener(e -> {
                JSObject res = new JSObject();
                res.put("success", false);
                res.put("error", e.getMessage());
                call.resolve(res);
            });
}
