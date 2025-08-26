import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface ShopImageProps {
  shopImageId: Id<"_storage">;
  style?: ViewStyle;
  contentFit?: 'contain' | 'cover' | 'fill' | 'scale-down';
  showOriginalSize?: boolean;
}

export default function ShopImage({ 
  shopImageId, 
  style, 
  contentFit = 'cover',
  showOriginalSize = false 
}: ShopImageProps) {
  const shopImageUrl = useQuery(api.shops.getShopImage, { imageId: shopImageId });

  if (!shopImageUrl) {
    return null;
  }

  const containerStyle = showOriginalSize || style 
    ? [styles.shopImageContainerFlexible, style]
    : styles.shopImageContainer;

  const imageContentFit = showOriginalSize ? 'contain' : contentFit;

  return (
    <View style={containerStyle}>
      <Image
        source={{ uri: shopImageUrl }}
        style={styles.shopImage}
        contentFit={imageContentFit}
        transition={300}
        priority="high"
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
});
