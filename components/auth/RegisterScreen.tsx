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
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { PasswordInput } from "../common/PasswordInput";
import VerificationScreen from "./VerificationScreen";
import { OneSignalService } from "../../services/oneSignalService";
import { LocationService } from "../../services/locationService";

interface RegisterScreenProps {
  onAuthSuccess: (userId: Id<"users">) => void;
  onSwitchToLogin: () => void;
}

export default function RegisterScreen({ onAuthSuccess, onSwitchToLogin }: RegisterScreenProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"shopkeeper" | "customer" | null>(null);
  const [loading, setLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const createUser = useMutation(api.users.createUser);
  const getUserByEmail = useMutation(api.users.getUserByEmail);
  const sendVerificationCode = useAction(api.auth.sendVerificationCode);
  const verifyCode = useMutation(api.auth.verifyCode);
  const updateUserProfile = useMutation(api.users.updateUserProfile);
  const updateUserLocation = useMutation(api.users.updateUserLocation);
  const updateOneSignalPlayerId = useMutation(api.users.updateOneSignalPlayerId);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !role) {
      Alert.alert("Error", "Please fill in all fields and select a role");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      // First check if email already exists
      const existingUser = await getUserByEmail({ email: email.toLowerCase().trim() });
      
      if (existingUser) {
        Alert.alert("Email Already Exists", "The entered email already exists in our database. Please enter a new one.");
        setLoading(false);
        return;
      }

      // If email doesn't exist, proceed with verification
      const tempUserId = email.toLowerCase().trim();
      setPendingUserId(tempUserId);
      await sendVerificationCode({ email: email.toLowerCase().trim(), userId: tempUserId });
      setShowVerification(true);
    } catch (error: any) {
      Alert.alert("Error", "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (code: string) => {
    if (!pendingUserId) return false;
    try {
      const result = await verifyCode({ userId: pendingUserId, code });
      
      if (result.success) {
        // Only now create the user in the database
        const userId = await createUser({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password: password.trim(), // Include password
          role: role as "shopkeeper" | "customer",
        });

        // Get user location and OneSignal player ID
        try {
          console.log('🔄 Getting OneSignal player ID...');
          // Get OneSignal player ID
          const playerId = await OneSignalService.getPlayerId();
          console.log('📱 OneSignal Player ID:', playerId);
          
          // Get user location (only for customers)
          let userLocation = null;
          if (role === "customer") {
            console.log('📍 Getting user location...');
            userLocation = await LocationService.getCurrentLocation();
            console.log('🗺️ User Location:', userLocation);
            if (userLocation) {
              // Update OneSignal with location
              OneSignalService.setUserLocation(userLocation.lat, userLocation.lng);
              console.log('✅ OneSignal location updated');
            }
          }

          // Set OneSignal tags
          if (playerId) {
            console.log('🏷️ Setting OneSignal tags...');
            OneSignalService.setUserTags({
              userId: userId.toString(),
              role: role!,
              email: email.toLowerCase().trim(),
              name: name.trim(),
            });
            console.log('✅ OneSignal tags set');
          } else {
            console.log('⚠️ No OneSignal player ID available');
          }

          // Update user profile with location and OneSignal data
          console.log('💾 Updating user profile with location and OneSignal data...');
          await updateUserProfile({
            userId,
            location: userLocation ? {
              lat: userLocation.lat,
              lng: userLocation.lng,
              address: userLocation.address,
            } : undefined,
            oneSignalPlayerId: playerId || undefined,
            pushNotificationsEnabled: !!playerId,
          });
          console.log('✅ User profile updated successfully');

        } catch (error) {
          console.error('❌ Error setting up user location/notifications:', error);
          // Don't fail the registration process for this
        }

        onAuthSuccess(userId as any);
        setShowVerification(false);
        setPendingUserId(null);
        return true;
      } else {
        // Show the specific error message
        Alert.alert("Verification Failed", result.message);
        return false;
      }
    } catch (error) {
      console.error("Verification error:", error);
      Alert.alert("Error", "Failed to verify code. Please try again.");
      return false;
    }
  };

  if (showVerification && pendingUserId) {
    return (
      <VerificationScreen
        email={email}
        onVerify={handleVerify}
        onResend={async () => {
          await sendVerificationCode({ email: email.toLowerCase().trim(), userId: pendingUserId });
          Alert.alert("Verification code resent", `A new code has been sent to ${email}`);
        }}
        onCancel={() => {
          setShowVerification(false);
          setPendingUserId(null);
          setName("");
          setEmail("");
          setPassword("");
          setRole(null);
          onSwitchToLogin();
        }}
      />
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Ionicons name="storefront" size={64} color="#2563EB" />
            <Text style={styles.title}>Join Availo</Text>
            <Text style={styles.subtitle}>Create your account</Text>
          </View>
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                placeholderTextColor="#888"
              />
            </View>
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
              placeholder="Password (min 6 characters)"
              placeholderTextColor="#888"
              style={styles.input}
              value={password}
              onChangeText={setPassword}
            />
            <View style={styles.roleSection}>
              <Text style={styles.roleTitle}>I am a:</Text>
              <View style={styles.roleButtons}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    role === "shopkeeper" && styles.roleButtonSelected,
                  ]}
                  onPress={() => setRole("shopkeeper")}
                >
                  <Ionicons 
                    name="storefront" 
                    size={24} 
                    color={role === "shopkeeper" ? "#FFFFFF" : "#6B7280"} 
                  />
                  <Text style={[
                    styles.roleButtonText,
                    role === "shopkeeper" && styles.roleButtonTextSelected,
                  ]}>
                    Shopkeeper
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    role === "customer" && styles.roleButtonSelected,
                  ]}
                  onPress={() => setRole("customer")}
                >
                  <Ionicons 
                    name="person" 
                    size={24} 
                    color={role === "customer" ? "#FFFFFF" : "#6B7280"} 
                  />
                  <Text style={[
                    styles.roleButtonText,
                    role === "customer" && styles.roleButtonTextSelected,
                  ]}>
                    Customer
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.registerButton, loading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.registerButtonText}>
                {loading ? "Creating Account..." : "Create Account"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onSwitchToLogin}>
              <Text style={styles.switchText}>
                Already have an account? <Text style={styles.switchTextBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 32,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
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
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
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
  roleSection: {
    marginTop: 8,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  roleButtons: {
    flexDirection: "row",
    gap: 12,
  },
  roleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  roleButtonSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  roleButtonTextSelected: {
    color: "#FFFFFF",
  },
  registerButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: "#FFFFFF",
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
});