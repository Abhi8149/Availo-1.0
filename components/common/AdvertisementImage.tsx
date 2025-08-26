import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface AdvertisementImageProps {
  imageId: Id<"_storage">;
  style?: ViewStyle;
  contentFit?: 'contain' | 'cover' | 'fill' | 'scale-down';
  showOriginalSize?: boolean;
}

export default function AdvertisementImage({ 
  imageId, 
  style, 
  contentFit = 'cover',
  showOriginalSize = false 
}: AdvertisementImageProps) {
  const imageUrl = useQuery(api.files.getFileUrl, { storageId: imageId });

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
