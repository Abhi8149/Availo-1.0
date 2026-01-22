import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import ZoomableImage from './ZoomableImage';

interface ZoomableShopImageProps {
  shopImageId: Id<"_storage">;
  style?: any;
}

export default function ZoomableShopImage({ shopImageId, style }: ZoomableShopImageProps) {
  const shopImageUrl = useQuery(api.shops.getShopImage, { imageId: shopImageId });

  if (!shopImageUrl) {
    return (
      <View style={[styles.loading, style]}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return <ZoomableImage uri={shopImageUrl} style={style} resizeMode="contain" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});
