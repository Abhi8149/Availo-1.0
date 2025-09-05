import { ConvexProvider, ConvexReactClient } from "convex/react";
import { View } from 'react-native';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from "expo-router";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import { OneSignalService } from "../services/oneSignalService";

// Safely get Convex URL with error handling
const getConvexUrl = () => {
  const url = process.env.EXPO_PUBLIC_CONVEX_URL;
  if (!url) {
    console.error('❌ EXPO_PUBLIC_CONVEX_URL is not configured');
    throw new Error('Missing required environment variable: EXPO_PUBLIC_CONVEX_URL');
  }
  return url;
};

const convex = new ConvexReactClient(getConvexUrl(), {
  unsavedChangesWarning: false,
});

export default function RootLayout() {
  useEffect(() => {
    // Initialize OneSignal
    console.log('🚀 Root layout mounting - initializing OneSignal...');
    OneSignalService.initialize();
  }, []);

  return (
    <ErrorBoundary>
      {/* StatusBar always visible, matching notification modal */}
      <StatusBar style="dark" backgroundColor="#FAFAFA" translucent={false} />
      <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
        <ConvexProvider client={convex}>
          <Stack screenOptions={{ headerShown: false }} />
        </ConvexProvider>
      </View>
    </ErrorBoundary>
  );
}
