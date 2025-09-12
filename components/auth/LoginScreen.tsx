import React, { useState } from "react";
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
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { PasswordInput } from "../common/PasswordInput";
import { OneSignalService } from "../../services/oneSignalService";
import { LocationService } from "../../services/locationService";

interface LoginScreenProps {
  onAuthSuccess: (userId: Id<"users">) => void;
  onSwitchToRegister: () => void;
  onForgotPassword: () => void;
}

export default function LoginScreen({ onAuthSuccess, onSwitchToRegister, onForgotPassword }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const authenticateUser = useMutation(api.users.authenticateUser);
  const updateUserProfile = useMutation(api.users.updateUserProfile);
  const updateUserLocation = useMutation(api.users.updateUserLocation);
  const updateOneSignalPlayerId = useMutation(api.users.updateOneSignalPlayerId);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const user = await authenticateUser({ 
        email: email.toLowerCase().trim(),
        password: password.trim()
      });
      
      if (user) {
        // Update user location and OneSignal data
        try {
          console.log('🔄 [LOGIN] Getting OneSignal player ID...');
          // Get OneSignal player ID
          const playerId = await OneSignalService.getPlayerId();
          console.log('📱 [LOGIN] OneSignal Player ID:', playerId);
          
          // Get user location (only for customers)
          let userLocation = null;
          if (user.role === "customer" || user.role==='shopkeeper') {
            console.log('📍 [LOGIN] Getting user location...');
            userLocation = await LocationService.getCurrentLocation();
            console.log('🗺️ [LOGIN] User Location:', userLocation);
            if (userLocation) {
              // Update OneSignal with location
              OneSignalService.setUserLocation(userLocation.lat, userLocation.lng);
              console.log('✅ [LOGIN] OneSignal location updated');
            }
          }

          // Set OneSignal tags
          if (playerId) {
            console.log('🏷️ [LOGIN] Setting OneSignal tags...');
            OneSignalService.setUserTags({
              userId: user._id.toString(),
              role: user.role,
              email: user.email,
              name: user.name,
            });
            console.log('✅ [LOGIN] OneSignal tags set');
          } else {
            console.log('⚠️ [LOGIN] No OneSignal player ID available');
          }

          // Update user profile with location and OneSignal data
          console.log('💾 [LOGIN] Updating user profile with location and OneSignal data...');
          await updateUserProfile({
            userId: user._id,
            location: userLocation ? {
              lat: userLocation.lat,
              lng: userLocation.lng,
              address: userLocation.address,
            } : undefined,
            oneSignalPlayerId: playerId || undefined,
            pushNotificationsEnabled: !!playerId,
          });
          console.log('✅ [LOGIN] User profile updated successfully');

        } catch (error) {
          console.error('❌ [LOGIN] Error updating user location/notifications:', error);
          // Don't fail the login process for this
        }

        onAuthSuccess(user._id);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert("Error", error.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="storefront" size={64} color="#2563EB" />
          <Text style={styles.title}>ShopStatus</Text>
          <Text style={styles.subtitle}>Welcome back!</Text>
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

          <PasswordInput
            placeholder="Password"
            placeholderTextColor="#888"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity 
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? "Signing In..." : "Sign In"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onForgotPassword} style={styles.forgotPasswordButton}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onSwitchToRegister}>
            <Text style={styles.switchText}>
              Don't have an account? <Text style={styles.switchTextBold}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
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
  loginButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  googleButtonText: {
    color: "#1F2937",
    fontSize: 16,
    fontWeight: "600",
  },
  switchText: {
    textAlign: "center",
    color: "#6B7280",
    fontSize: 14,
    marginTop: 24,
  },
  switchTextBold: {
    color: "#2563EB",
    fontWeight: "600",
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginVertical: 15,
  },
  forgotPasswordText: {
    color: '#007AFF',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});