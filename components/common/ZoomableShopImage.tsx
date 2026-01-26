import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import ZoomableImage from './ZoomableImage';

interface ZoomableShopImageProps {
  imageUrl: string; // Now receives Cloudinary URL directly
  style?: any;
}

export default function ZoomableShopImage({ imageUrl, style }: ZoomableShopImageProps) {
  
  // Show loading state if image URL is not available
  if (!imageUrl) {
    return (
      <View style={[styles.loading, style]}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return <ZoomableImage uri={imageUrl} style={style} resizeMode="contain" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});