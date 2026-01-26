import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

interface ItemImageProps {
  imageUrl: string; // Now receives Cloudinary URL directly
  style?: ViewStyle;
  contentFit?: 'contain' | 'cover' | 'fill' | 'scale-down';
  showOriginalSize?: boolean;
}

export default function ItemImage({ 
  imageUrl, 
  style, 
  contentFit = 'cover',
  showOriginalSize = false 
}: ItemImageProps) {
  
  // If no image URL, show placeholder
  if (!imageUrl) {
    return (
      <View style={[styles.itemImageContainer, style, styles.placeholderImage]}>
        <Ionicons name="image-outline" size={24} color="#9CA3AF" />
      </View>
    );
  }

  const containerStyle = showOriginalSize || style 
    ? [styles.itemImageContainerFlexible, style]
    : styles.itemImageContainer;

  const imageContentFit = showOriginalSize ? 'contain' : contentFit;

  return (
    <View style={containerStyle}>
      <Image
        source={{ uri: imageUrl }}
        style={styles.itemImage}
        contentFit={imageContentFit}
        transition={300}
        priority="high"
        // Optional: Add Cloudinary transformations
        // For smaller thumbnails: imageUrl + '?w_400,h_400,c_fill,q_auto,f_auto'
      />
    </View>
  );
}

const styles = StyleSheet.create({
  itemImageContainer: {
    width: "100%",
    height: 50,
    borderRadius: 12,
    overflow: "hidden",
  },
  itemImageContainerFlexible: {
    width: "100%",
    height: "100%",
    borderRadius: 0,
    overflow: "hidden",
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});