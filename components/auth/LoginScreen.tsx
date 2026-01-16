import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { PasswordInput } from "../common/PasswordInput";
import { OneSignalService } from "../../services/oneSignalService";
import { LocationService } from "../../services/locationService";
import GoogleSignInButton from "./GoogleSignInButton";
import RoleSelectionModal from "./RoleSelectionModal";
import { useUser } from "@clerk/clerk-expo";
import { saveAuthData } from "../../utils/auth";

interface LoginScreenProps {
  onAuthSuccess: (userId: Id<"users">) => void;
  onSwitchToRegister: () => void;
  onForgotPassword: () => void;
}

export default function LoginScreen({ onAuthSuccess, onSwitchToRegister, onForgotPassword }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [pendingGoogleAuth, setPendingGoogleAuth] = useState(false);
  const [hasSyncedClerkUser, setHasSyncedClerkUser] = useState(false);
  const [checkingUser, setCheckingUser] = useState(false);
  const { user: clerkUser } = useUser();

  // Debug: Log when showRoleModal changes
  useEffect(() => {
    console.log('🎭 [DEBUG] showRoleModal changed to:', showRoleModal);
  }, [showRoleModal]);

  const authenticateUser = useMutation(api.users.authenticateUser);
  const updateUserProfile = useMutation(api.users.updateUserProfile);
  const checkGoogleOAuthUser = useMutation(api.users.checkGoogleOAuthUser);
  const createGoogleOAuthUser = useMutation(api.users.createGoogleOAuthUser);

  // Watch for Clerk user to become available after Google OAuth
  useEffect(() => {
    if (pendingGoogleAuth && clerkUser) {
      console.log('✅ [GOOGLE] Clerk user detected after OAuth:', clerkUser.id);
      setPendingGoogleAuth(false);
      syncGoogleUserToDatabase();
    }
  }, [clerkUser, pendingGoogleAuth]);

  // IMPORTANT: Check for Clerk user on mount (for returning from OAuth redirect)
  useEffect(() => {
    if (clerkUser && !hasSyncedClerkUser) {
      console.log('🔄 [MOUNT] Clerk user exists on mount - syncing...');
      setHasSyncedClerkUser(true);
      syncGoogleUserToDatabase();
    }
  }, [clerkUser, hasSyncedClerkUser]);

  const syncGoogleUserToDatabase = async () => {
    if (!clerkUser) {
      console.error("❌ [GOOGLE] No Clerk user available");
      setLoading(false);
      setCheckingUser(false);
      return;
    }

    try {
      setLoading(true);
      setCheckingUser(true);
      console.log('🔄 [GOOGLE] Checking if user exists...');

      // Check if user exists in database
      const result = await checkGoogleOAuthUser({
        clerkUserId: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || "",
      });

      console.log('✅ [GOOGLE] User check complete:', result.exists ? 'User exists' : 'New user');
      setCheckingUser(false);

      // If user doesn't exist, show role selection modal
      if (!result.exists) {
        console.log('🎯 [GOOGLE] New user - showing role selection modal');
        // Don't set pendingUserId yet - we'll create user after role selection
        setLoading(false);
        setShowRoleModal(true);
        return; // Don't complete login yet, wait for role selection
      }

      console.log('✅ [GOOGLE] Existing user - completing login...');
      const userId = result.userId!;

      // Update location and OneSignal in parallel
      const [playerId, userLocation] = await Promise.all([
        OneSignalService.getPlayerId(),
        LocationService.getCurrentLocation(),
      ]);

      if (playerId) {
        OneSignalService.setUserTags({
          userId: userId.toString(),
          role: result.user!.role,
          email: clerkUser.primaryEmailAddress?.emailAddress || "",
          name: clerkUser.fullName || "",
        });
      }

      if (userLocation) {
        OneSignalService.setUserLocation(userLocation.lat, userLocation.lng);
      }

      // Update profile (non-blocking)
      updateUserProfile({
        userId,
        name: clerkUser.fullName || clerkUser.firstName || "User",
        location: userLocation ? {
          lat: userLocation.lat,
          lng: userLocation.lng,
          address: userLocation.address,
        } : undefined,
        oneSignalPlayerId: playerId || undefined,
        pushNotificationsEnabled: !!playerId,
      }).catch(err => console.error('❌ [GOOGLE] Profile update error:', err));

      // Save to local storage
      await saveAuthData({
        userId: userId.toString(),
        role: result.user!.role,
      });

      console.log('✅ [GOOGLE] Login complete!');
      onAuthSuccess(userId);
    } catch (error: any) {
      console.error('❌ [GOOGLE] Error:', error);
      console.error('❌ [GOOGLE] Error details:', JSON.stringify(error, null, 2));
      Alert.alert("Error", "Failed to complete Google Sign-In");
      setLoading(false);
      setCheckingUser(false);
    }
  };

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
      Alert.alert("Error", "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignInSuccess = async () => {
    console.log('🔄 [GOOGLE] OAuth completed, setting up...');
    setLoading(true);
    setPendingGoogleAuth(true);
    
    // If Clerk user is already available (unlikely but possible), sync immediately
    if (clerkUser) {
      console.log('✅ [GOOGLE] Clerk user already available');
      setPendingGoogleAuth(false);
      await syncGoogleUserToDatabase();
    }
    // Otherwise, the useEffect will handle it when clerkUser becomes available
  };


  const handleRoleSelection = async (role: "customer" | "shopkeeper") => {
    if (!clerkUser) {
      console.error("❌ [ROLE] Clerk user not available");
      Alert.alert("Error", "Session expired. Please sign in again.");
      setShowRoleModal(false);
      setLoading(false);
      return;
    }

    try {
      console.log('🎯 [ROLE] User selected role:', role);
      setLoading(true);
      setShowRoleModal(false);

      // Create user in database with selected role
      console.log('🔄 [ROLE] Creating user with role:', role);
      const userId = await createGoogleOAuthUser({
        clerkUserId: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || "",
        name: clerkUser.fullName || clerkUser.firstName || "User",
        photoUrl: clerkUser.imageUrl,
        role: role,
      });

      console.log('✅ [ROLE] User created with ID:', userId);

      // Save to local storage FIRST for immediate redirect
      await saveAuthData({
        userId: userId.toString(),
        role: role,
      });
      console.log('✅ [ROLE] Role saved to storage:', role);

      // REDIRECT IMMEDIATELY for faster UX
      console.log('✅ [ROLE] Signup complete with role:', role);
      onAuthSuccess(userId);

      // Background tasks - location and OneSignal setup (non-blocking)
      setTimeout(async () => {
        try {
          console.log('🔄 [BACKGROUND] Setting up location and notifications...');
          const [playerId, userLocation] = await Promise.all([
            OneSignalService.getPlayerId(),
            LocationService.getCurrentLocation(),
          ]);

          // Set OneSignal tags
          if (playerId) {
            OneSignalService.setUserTags({
              userId: userId.toString(),
              role,
              email: clerkUser.primaryEmailAddress?.emailAddress || "",
              name: clerkUser.fullName || "",
            });
            console.log('✅ [BACKGROUND] OneSignal tags set');
          }

          if (userLocation) {
            OneSignalService.setUserLocation(userLocation.lat, userLocation.lng);
            console.log('✅ [BACKGROUND] OneSignal location set');
          }

          // Update profile with location and OneSignal data
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
          console.log('✅ [BACKGROUND] Profile updated successfully');
        } catch (err) {
          console.error('❌ [BACKGROUND] Setup error:', err);
        }
      }, 0);
    } catch (error: any) {
      console.error('❌ [ROLE] Error:', error);
      
      // Check if user already exists error
      if (error.message?.includes("already exists")) {
        Alert.alert("Error", "This account already exists. Please try signing in again.");
      } else {
        Alert.alert("Error", "Failed to complete signup. Please try again.");
      }
      
      // Show modal again so user can retry
      setShowRoleModal(true);
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
          <Text style={styles.title}>Availo</Text>
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

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <GoogleSignInButton onSuccess={handleGoogleSignInSuccess} />

          <TouchableOpacity onPress={onSwitchToRegister}>
            <Text style={styles.switchText}>
              Don't have an account? <Text style={styles.switchTextBold}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <RoleSelectionModal
        visible={showRoleModal}
        onSelectRole={handleRoleSelection}
      />

      {checkingUser && (
        <View style={styles.checkingOverlay}>
          <View style={styles.checkingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.checkingText}>Setting up your account...</Text>
          </View>
        </View>
      )}
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
  checkingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkingContainer: {
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  checkingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
});