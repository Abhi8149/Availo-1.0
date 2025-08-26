import { ConvexProvider, ConvexReactClient } from "convex/react";
import { Stack } from "expo-router";
import { ErrorBoundary } from "../components/common/ErrorBoundary";

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
  return (
    <ErrorBoundary>
      <ConvexProvider client={convex}>
        <Stack screenOptions={{ headerShown: false }} />
      </ConvexProvider>
    </ErrorBoundary>
  );
}
