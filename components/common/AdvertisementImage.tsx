import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

interface AdvertisementImageProps {
  imageUrl: string; // Now receives Cloudinary URL directly
  style?: ViewStyle;
  contentFit?: 'contain' | 'cover' | 'fill' | 'scale-down';
  showOriginalSize?: boolean;
}

export default function AdvertisementImage({ 
  imageUrl, 
  style, 
  contentFit = 'cover',
  showOriginalSize = false 
}: AdvertisementImageProps) {
  
  // If no image URL, show placeholder
  if (!imageUrl) {
    return (
      <View style={[styles.placeholderImage, style]}>
        <Ionicons name="image-outline" size={24} color="#9CA3AF" />
      </View>
    );
  }

  const containerStyle = showOriginalSize || style 
    ? [styles.imageContainerFlexible, style]
    : styles.imageContainer;

  const imageContentFit = showOriginalSize ? 'contain' : contentFit;

  return (
    <View style={containerStyle}>
      <Image
        source={{ uri: imageUrl }}
        style={styles.image}
        contentFit={imageContentFit}
        transition={300}
        priority="high"
        // Optional: Add Cloudinary transformations for ads
        // For optimized display: imageUrl + '?w_800,h_800,c_fill,q_auto,f_auto'
      />
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
  },
  imageContainerFlexible: {
    width: "100%",
    height: "100%",
    borderRadius: 0,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    width: 120,
    height: 120,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
});