import React from 'react';
import { StyleSheet } from 'react-native';
import ZoomableImage from './ZoomableImage';

interface ZoomableItemImageProps {
  imageUrl: string;
  style?: any;
}

export default function ZoomableItemImage({ imageUrl, style }: ZoomableItemImageProps) {
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
