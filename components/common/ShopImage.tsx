import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

interface ShopImageProps {
  imageUrl?: string; // Now receives Cloudinary URL directly
  style?: ViewStyle;
  contentFit?: 'contain' | 'cover' | 'fill' | 'scale-down';
  showOriginalSize?: boolean;
}

export default function ShopImage({ 
  imageUrl,
  style, 
  contentFit = 'cover',
  showOriginalSize = false 
}: ShopImageProps) {
  
  // If no image URL, show placeholder
  if (!imageUrl) {
    return (
      <View style={[styles.shopImageContainer, style, styles.placeholderContainer]}>
        <Ionicons name="storefront-outline" size={32} color="#9CA3AF" />
      </View>
    );
  }

  const containerStyle = showOriginalSize || style 
    ? [styles.shopImageContainerFlexible, style]
    : styles.shopImageContainer;

  const imageContentFit = showOriginalSize ? 'contain' : contentFit;

  return (
    <View style={containerStyle}>
      <Image
        source={{ uri: imageUrl }}
        style={styles.shopImage}
        contentFit={imageContentFit}
        transition={300}
        priority="high"
        // Optional: Add Cloudinary transformations via URL
        // For example: imageUrl + '?w=800&q=auto&f=auto'
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shopImageContainer: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  shopImageContainerFlexible: {
    width: "100%",
    height: "100%",
    borderRadius: 0,
    overflow: "hidden",
    marginBottom: 0,
  },
  shopImage: {
    width: "100%",
    height: "100%",
  },
  placeholderContainer: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});