import React from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useOAuth } from "@clerk/clerk-expo";
import * as WebBrowser from "expo-web-browser";

// CRITICAL: This completes the auth session - required for production APKs
WebBrowser.maybeCompleteAuthSession();

interface GoogleSignInButtonProps {
  onSuccess: () => void;
  onNeedRole?: () => void;
  onError?: (error: any) => void;
}

export default function GoogleSignInButton({ onSuccess, onNeedRole, onError }: GoogleSignInButtonProps) {
  // @ts-ignore - useOAuth is deprecated but still the recommended way for React Native
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });
  const [loading, setLoading] = React.useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      console.log("🔐 Starting Google OAuth flow...");
      console.log("📱 Platform:", Platform.OS);
      
      // FIXED: Don't specify redirectUrl - let Clerk handle it automatically
      // This works better with production APKs
      const { createdSessionId, setActive, signIn, signUp } = await startOAuthFlow();

      console.log("📝 OAuth result:", { 
        createdSessionId, 
        hasSetActive: !!setActive,
        hasSignIn: !!signIn,
        hasSignUp: !!signUp
      });

      if (createdSessionId) {
        console.log("✅ OAuth session created:", createdSessionId);
        
        if (setActive) {
          await setActive({ session: createdSessionId });
          console.log("✅ Session activated");
        }
        
        // Call success callback - the parent component will handle the rest
        onSuccess();
      } else {
        // No session created - could be cancelled or waiting for callback
        console.log("⚠️ No session created immediately");
        
        // Check if signIn or signUp exists - if so, OAuth might still be processing
        if (signIn || signUp) {
          console.log("OAuth flow initiated, waiting for callback...");
          // Don't show error - the callback will handle it
          onSuccess(); // Let parent handle the waiting state
        } else {
          console.log("⚠️ User cancelled sign-in");
          // User actually cancelled
          setLoading(false);
        }
      }
    } catch (error: any) {
      // ============================================
      // COMPREHENSIVE ERROR LOGGING
      // ============================================
      console.error("❌ ================================");
      console.error("❌ GOOGLE SIGN-IN ERROR CAUGHT");
      console.error("❌ ================================");
      
      // 1. Basic error info
      console.error("❌ Error Type:", typeof error);
      console.error("❌ Error Constructor:", error?.constructor?.name);
      
      // 2. Error message
      console.error("❌ Error Message:", error?.message);
      
      // 3. Error code (critical for identifying issue)
      console.error("❌ Error Code:", error?.code);
      
      // 4. Clerk-specific error fields
      console.error("❌ Clerk Error:", error?.clerkError);
      console.error("❌ Clerk Error Code:", error?.errors?.[0]?.code);
      console.error("❌ Clerk Error Message:", error?.errors?.[0]?.message);
      console.error("❌ Clerk Error Long Message:", error?.errors?.[0]?.longMessage);
      
      // 5. HTTP status (if network-related)
      console.error("❌ Status:", error?.status);
      console.error("❌ Status Code:", error?.statusCode);
      
      // 6. Full error object (stringified)
      try {
        console.error("❌ Full Error Object:", JSON.stringify(error, null, 2));
      } catch (e) {
        console.error("❌ Error object cannot be stringified");
      }
      
      // 7. Error stack trace
      console.error("❌ Stack Trace:", error?.stack);
      
      // 8. All error keys
      console.error("❌ Error Keys:", Object.keys(error || {}));
      
      // 9. Platform & Environment info
      console.error("❌ Platform:", Platform.OS);
      console.error("❌ Is Production:", __DEV__ ? 'NO (Dev Mode)' : 'YES (Production)');
      
      // 10. Clerk configuration check
      console.error("❌ Clerk Key Present:", !!process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY);
      console.error("❌ Clerk Key Prefix:", process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 8));
      
      console.error("❌ ================================");
      
      // Check if user cancelled (common in production)
      const errorString = error?.message?.toLowerCase() || error?.toString?.()?.toLowerCase() || "";
      const errorCode = error?.code || error?.errors?.[0]?.code || "";
      
      if (errorString.includes("cancel") || 
          errorString.includes("user_cancelled") ||
          errorString.includes("dismissed") ||
          errorCode === "ERR_CANCELED" ||
          errorCode === "user_cancelled") {
        console.log("ℹ️ User cancelled OAuth");
        setLoading(false);
        return; // Don't show error for user cancellation
      }
      
      // For other errors, show appropriate message with error details
      let errorMessage = "Failed to sign in with Google. Please try again.";
      let technicalDetails = "";
      
      if (errorString.includes("network") || errorCode === "network_error") {
        errorMessage = "Network error. Please check your internet connection.";
        technicalDetails = `Code: ${errorCode}`;
      } else if (errorCode === "oauth_callback_invalid" || 
                 errorCode === "api_response_error" ||
                 errorString.includes("redirect") ||
                 errorString.includes("oauth configuration")) {
        errorMessage = "OAuth Configuration Issue";
        technicalDetails = 
          `Please ensure Clerk Dashboard is properly configured.\n\n` +
          `Error Code: ${errorCode || 'api_response_error'}`;
      } else if (errorString.includes("timeout") || errorCode === "timeout") {
        errorMessage = "Sign in timed out. Please try again.";
        technicalDetails = `Code: ${errorCode}`;
      } else if (errorCode === "client_invalid" || errorString.includes("client")) {
        errorMessage = "Authentication configuration error.";
        technicalDetails = `The OAuth client may not be configured correctly.\nCode: ${errorCode}`;
      } else if (errorCode === "invalid_request") {
        errorMessage = "Invalid authentication request.";
        technicalDetails = `Code: ${errorCode}`;
      } else {
        // Generic error with details - safely extract message
        const errorMsg = error?.message || error?.errors?.[0]?.message || 'Unknown error';
        technicalDetails = `Code: ${errorCode || 'unknown'}\nMessage: ${errorMsg}`;
      }
      
      // Show user-friendly alert with STRING message (FIXED - no object passing)
      Alert.alert(
        "Sign In Error", 
        `${errorMessage}\n\n${technicalDetails}`,
        [
          { 
            text: "Copy Error Details", 
            onPress: () => {
              console.log("📋 ===== ERROR DETAILS FOR SUPPORT =====");
              console.log("Error Code:", errorCode);
              console.log("Error Message:", error?.message);
              console.log("Platform:", Platform.OS);
              console.log("Full Error:", error);
              console.log("📋 ===================================");
            }
          },
          { text: "OK", style: "cancel" }
        ]
      );
      
      if (onError) {
        onError(error);
      }
      
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.googleButton}
      onPress={handleGoogleSignIn}
      disabled={loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#1C1C1E" />
      ) : (
        <>
          <Ionicons name="logo-google" size={24} color="#DB4437" />
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E5EA",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
  },
});