import React, { useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { saveAuthData, getAuthData, clearAuthData } from "../utils/auth";
import LoginScreen from "../components/auth/LoginScreen";
import RegisterScreen from "../components/auth/RegisterScreen";
import ForgotPasswordScreen from "../components/auth/ForgotPasswordScreen";
import ShopkeeperDashboard from "../components/shopkeeper/ShopkeeperDashboard";
import CustomerHome from "../components/customer/CustomerHome";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { useUser, useAuth } from "@clerk/clerk-expo";

export default function Index() {
  const [currentUser, setCurrentUser] = useState<Id<"users"> | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot-password">("login");
  const [currentRole, setCurrentRole] = useState<"shopkeeper" | "customer" | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const { signOut } = useAuth();
  const user = useQuery(api.users.getUser, currentUser ? { userId: currentUser } : "skip");
  const getUserByEmail = useMutation(api.users.getUserByEmail);
  const getUserByClerkId = useMutation(api.users.getUserByClerkId);

  /**
   * Check for both local auth and Clerk sessions
   * Clerk sessions take priority for Google OAuth users
   */
  useEffect(() => {
    const loadAuth = async () => {
      try {
        // Wait for Clerk to load
        if (!isClerkLoaded) {
          return;
        }

        // Check if user is signed in with Clerk (Google OAuth)
        if (clerkUser) {
          console.log('🔍 Clerk user found, syncing with database...');
          console.log('📧 Clerk email:', clerkUser.primaryEmailAddress?.emailAddress);
          
          // Get user from database by Clerk ID
          const dbUser = await getUserByClerkId({ clerkUserId: clerkUser.id });
          
          if (dbUser) {
            console.log('✅ Database user found:', dbUser._id);
            setCurrentUser(dbUser._id);
            
            // Check if there's a saved role preference in local storage
            const authData = await getAuthData();
            if (authData && authData.userId === dbUser._id.toString()) {
              // Use saved role preference (view mode)
              console.log('📱 Using saved role preference:', authData.role);
              setCurrentRole(authData.role);
            } else {
              // No saved preference, use database role as default
              console.log('📱 No saved preference, using database role:', dbUser.role);
              setCurrentRole(dbUser.role);
              
              // Save to local storage for persistence
              await saveAuthData({
                userId: dbUser._id.toString(),
                role: dbUser.role
              });
            }
          } else {
            console.log('⚠️ Clerk user not in database - staying on login to trigger role selection');
            // Don't set current user - stay on login screen
            // The LoginScreen's syncGoogleUserToDatabase will handle showing role modal
            setCurrentUser(null);
            setCurrentRole(null);
          }
        } else {
          // No Clerk session, check local storage
          const authData = await getAuthData();
          if (authData) {
            setCurrentUser(authData.userId as Id<"users">);
            setCurrentRole(authData.role);
            console.log('📱 Loaded from storage - User:', authData.userId, 'Role:', authData.role);
          }
        }
      } catch (error) {
        console.error('❌ Error loading auth:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    
    loadAuth();
  }, [isClerkLoaded, clerkUser]);

  const handleAuthSuccess = async (userId: Id<"users">) => {
    console.log('✅ Auth success for user:', userId);
    setCurrentUser(userId);
    
    // Load the role from local storage (it should have been saved during auth)
    const authData = await getAuthData();
    if (authData && authData.userId === userId.toString()) {
      console.log('📱 Setting role from auth data:', authData.role);
      setCurrentRole(authData.role);
    }
  };

  // Effect to save auth data when user data is loaded (only set role if not already set)
  useEffect(() => {
    if (user && currentUser && !currentRole) {
      // Check local storage first - it has priority during auth flow
      getAuthData().then(authData => {
        if (authData && authData.userId === currentUser.toString()) {
          // Use role from local storage if available (more recent than DB during auth)
          console.log('📱 Using role from storage during user load:', authData.role);
          setCurrentRole(authData.role);
        } else {
          // Fallback to database role if no storage data
          console.log('📱 Using role from database:', user.role);
          setCurrentRole(user.role);
          
          // Save auth data to persist login
          saveAuthData({
            userId: currentUser.toString(),
            role: user.role
          }).catch(console.error);
        }
      });
    }
  }, [user, currentUser]);

  const handleLogout = async () => {
    console.log('🚪 Logging out user...');
    try {
      // Clear persisted auth data
      await clearAuthData();
      
      // Sign out from Clerk (for Google OAuth users)
      if (signOut) {
        console.log('🔐 Signing out from Clerk...');
        await signOut();
        console.log('✅ Clerk sign out completed');
      }
      
      // Clear local state
      setCurrentUser(null);
      setCurrentRole(null);
      
      console.log('✅ Logout completed');
    } catch (error) {
      console.error('🚨 Error during logout:', error);
      // Still clear local state
      setCurrentUser(null);
      setCurrentRole(null);
    }
  };

  const handleSwitchToCustomer = async () => {
    console.log('🔄 Switching to customer mode...');
    setCurrentRole("customer");
    if (currentUser) {
      await saveAuthData({
        userId: currentUser.toString(),
        role: "customer"
      });
      console.log('✅ Switched to customer mode');
    }
  };

  const handleSwitchToShopkeeper = async () => {
    console.log('🔄 Switching to shopkeeper mode...');
    setCurrentRole("shopkeeper");
    if (currentUser) {
      await saveAuthData({
        userId: currentUser.toString(),
        role: "shopkeeper"
      });
      console.log('✅ Switched to shopkeeper mode');
    }
  };

  // Show loading screen while checking authentication
  if (isCheckingAuth) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Checking authentication...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (currentUser && user === undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading your data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (currentUser && user) {
    // Determine which role to show (currentRole overrides database role)
    const activeRole = currentRole || user.role;
    
    console.log('📊 Active role:', activeRole, '| Database role:', user.role, '| Current role state:', currentRole);
    
    if (activeRole === "shopkeeper") {
      return (
        <ShopkeeperDashboard 
          user={user} 
          onLogout={handleLogout}
          onSwitchToCustomer={handleSwitchToCustomer}
        />
      );
    } else {
      // Only allow switching to shopkeeper if database role is shopkeeper
      return (
        <CustomerHome 
          user={user} 
          onLogout={handleLogout}
          onSwitchToShopkeeper={user.role === "shopkeeper" ? handleSwitchToShopkeeper : undefined}
        />
      );
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {authMode === "login" ? (
        <LoginScreen 
          onAuthSuccess={handleAuthSuccess}
          onSwitchToRegister={() => setAuthMode("register")}
          onForgotPassword={() => setAuthMode("forgot-password")}
        />
      ) : authMode === "register" ? (
        <RegisterScreen 
          onAuthSuccess={handleAuthSuccess}
          onSwitchToLogin={() => setAuthMode("login")}
        />
      ) : (
        <ForgotPasswordScreen 
          onBackToLogin={() => setAuthMode("login")}
          onAuthSuccess={handleAuthSuccess}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
});
