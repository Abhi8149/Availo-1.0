import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface ItemImageProps {
  imageId: Id<"_storage">;
  style?: ViewStyle;
  contentFit?: 'contain' | 'cover' | 'fill' | 'scale-down';
  showOriginalSize?: boolean;
}

export default function ItemImage({ 
  imageId, 
  style, 
  contentFit = 'cover',
  showOriginalSize = false 
}: ItemImageProps) {
  const imageUrl = useQuery(api.items.getItemImage, { imageId });

  if (!imageUrl) {
    return (
      <View style={styles.placeholderImage}>
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
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
