import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import ZoomableImage from './ZoomableImage';

interface ZoomableItemImageProps {
  imageId: Id<"_storage">;
  style?: any;
}

export default function ZoomableItemImage({ imageId, style }: ZoomableItemImageProps) {
  const imageUrl = useQuery(api.items.getItemImage, { imageId });

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
