import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

/**
 * FORGOT PASSWORD SCREEN WITH PERFORMANCE OPTIMIZATION
 * 
 * Performance optimizations:
 * - useMemo for email validation to prevent recalculation
 * - useCallback for stable function references
 * - Memoized button disabled states
 */

interface ForgotPasswordScreenProps {
  onAuthSuccess: (userId: Id<"users">) => void;
  onBackToLogin: () => void;
}

export default function ForgotPasswordScreen({ onAuthSuccess, onBackToLogin }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [step, setStep] = useState<"email" | "verification">("email");
  const [loading, setLoading] = useState(false);

  const sendPasswordResetEmail = useAction(api.verifyEmail.sendPasswordResetEmail);
  const verifyPasswordResetCode = useMutation(api.verifyEmail.verifyPasswordResetCode);

  // Memoize email validation
  const isValidEmail = useMemo(() => {
    if (!email.trim()) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }, [email]);

  // Memoize button disabled states
  const isSendButtonDisabled = useMemo(() => {
    return loading || !isValidEmail;
  }, [loading, isValidEmail]);

  const isVerifyButtonDisabled = useMemo(() => {
    return loading || verificationCode.trim().length !== 6;
  }, [loading, verificationCode]);

  // Use useCallback to prevent function recreation on each render
  const handleSendCode = useCallback(async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const result = await sendPasswordResetEmail({ email: email.toLowerCase().trim() });
      if (result.success) {
        Alert.alert("Success", result.message);
        setStep("verification");
      }
    } catch (error: any) {
      console.error('Send code error:', error);
      Alert.alert("Error", "Failed to send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [email, sendPasswordResetEmail]);

  const handleVerifyCode = useCallback(async () => {
    if (!verificationCode.trim()) {
      Alert.alert("Error", "Please enter the verification code");
      return;
    }

    if (verificationCode.trim().length !== 6) {
      Alert.alert("Error", "Please enter a valid 6-digit verification code");
      return;
    }

    setLoading(true);
    try {
      const result = await verifyPasswordResetCode({ 
        email: email.toLowerCase().trim(), 
        code: verificationCode.trim() 
      });
      
      if (result.success) {
        Alert.alert(
          "Success", 
          "Password reset verified! You can now change your password in the Edit Profile section.",
          [
            {
              text: "OK",
              onPress: () => onAuthSuccess(result.userId)
            }
          ]
        );
      }
    } catch (error: any) {
      console.error('Verify code error:', error);
      Alert.alert("Error", "Invalid verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [email, verificationCode, verifyPasswordResetCode, onAuthSuccess]);

  const handleChangeEmail = useCallback(() => {
    setStep("email");
    setVerificationCode("");
  }, []);

  const renderEmailStep = useCallback(() => (
    <>
      <View style={styles.header}>
        <Ionicons name="lock-closed" size={64} color="#2563EB" />
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>Enter your email address to receive a verification code</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor="#888"
          />
        </View>

        <TouchableOpacity 
          style={[styles.primaryButton, isSendButtonDisabled && styles.primaryButtonDisabled]}
          onPress={handleSendCode}
          disabled={isSendButtonDisabled}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? "Sending Code..." : "Send Verification Code"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onBackToLogin} style={styles.backButton}>
          <Ionicons name="arrow-back" size={16} color="#2563EB" />
          <Text style={styles.backButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </>
  ), [email, setEmail, loading, isSendButtonDisabled, handleSendCode, onBackToLogin]);

  const renderVerificationStep = useCallback(() => (
    <>
      <View style={styles.header}>
        <Ionicons name="mail" size={64} color="#2563EB" />
        <Text style={styles.title}>Enter Verification Code</Text>
        <Text style={styles.subtitle}>
          We've sent a 6-digit code to {email}
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Ionicons name="keypad-outline" size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit code"
            value={verificationCode}
            onChangeText={setVerificationCode}
            keyboardType="number-pad"
            maxLength={6}
            placeholderTextColor="#888"
          />
        </View>

        <TouchableOpacity 
          style={[styles.primaryButton, isVerifyButtonDisabled && styles.primaryButtonDisabled]}
          onPress={handleVerifyCode}
          disabled={isVerifyButtonDisabled}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? "Verifying..." : "Verify Code"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={handleChangeEmail} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={16} color="#2563EB" />
          <Text style={styles.backButtonText}>Change Email</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={handleSendCode}
          disabled={loading}
          style={styles.resendButton}
        >
          <Text style={styles.resendButtonText}>
            {loading ? "Sending..." : "Resend Code"}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  ), [email, verificationCode, setVerificationCode, loading, isVerifyButtonDisabled, handleVerifyCode, handleChangeEmail, handleSendCode]);

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        {step === "email" ? renderEmailStep() : renderVerificationStep()}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 24,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
  },
  primaryButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  backButtonText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "500",
  },
  resendButton: {
    alignItems: "center",
    marginTop: 8,
  },
  resendButtonText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
});
