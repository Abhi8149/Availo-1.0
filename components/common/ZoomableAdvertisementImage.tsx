import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import ZoomableImage from './ZoomableImage';

interface ZoomableAdvertisementImageProps {
  imageUrl: string; // Now receives Cloudinary URL directly
  style?: any;
}

export default function ZoomableAdvertisementImage({ imageUrl, style }: ZoomableAdvertisementImageProps) {
  
  // Show loading state while image URL is being passed (though it should be immediate)
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