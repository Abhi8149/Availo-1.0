import React, { useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LoginScreen from "../components/auth/LoginScreen";
import RegisterScreen from "../components/auth/RegisterScreen";
import ShopkeeperDashboard from "../components/shopkeeper/ShopkeeperDashboard";
import CustomerHome from "../components/customer/CustomerHome";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

export default function Index() {
  const [currentUser, setCurrentUser] = useState<Id<"users"> | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [currentRole, setCurrentRole] = useState<"shopkeeper" | "customer" | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const user = useQuery(api.users.getUser, currentUser ? { userId: currentUser } : "skip");
  const getUserByEmail = useMutation(api.users.getUserByEmail);

  /**
   * Simple app initialization - no external auth dependencies
   * This ensures production stability and faster app startup
   */
  useEffect(() => {
    // Simple initialization - removed Google Auth for production stability
    console.log('� App initialized - ready for manual login');
    setIsCheckingAuth(false);
  }, []);

  const handleAuthSuccess = (userId: Id<"users">) => {
    console.log('✅ Auth success for user:', userId);
    setCurrentUser(userId);
  };

  const handleLogout = async () => {
    console.log('🚪 Logging out user...');
    try {
      // Clear local state - removed Google sign-out for production stability
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

  const handleSwitchToCustomer = () => {
    setCurrentRole("customer");
  };

  const handleSwitchToShopkeeper = () => {
    setCurrentRole("shopkeeper");
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
    // Determine which role to show
    const activeRole = currentRole || user.role;
    
    if (activeRole === "shopkeeper") {
      return (
        <ShopkeeperDashboard 
          user={user} 
          onLogout={handleLogout}
          onSwitchToCustomer={handleSwitchToCustomer}
        />
      );
    } else {
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
        />
      ) : (
        <RegisterScreen 
          onAuthSuccess={handleAuthSuccess}
          onSwitchToLogin={() => setAuthMode("login")}
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
