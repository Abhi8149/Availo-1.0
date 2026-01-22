import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { Image } from 'expo-image';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ZoomableImageProps {
  uri: string;
  style?: any;
  resizeMode?: 'contain' | 'cover' | 'center';
  minScale?: number;
  maxScale?: number;
}

export default function ZoomableImage({
  uri,
  style,
  resizeMode = 'contain',
  minScale = 1,
  maxScale = 3,
}: ZoomableImageProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef<number>(0);
  const tapCountRef = useRef<number>(0);
  const lastTranslateXRef = useRef(0);
  const lastTranslateYRef = useRef(0);
  const isZoomedRef = useRef(false);

  const handleDoubleTap = () => {
    if (isZoomedRef.current) {
      // Zoom out
      Animated.parallel([
        Animated.spring(scale, {
          toValue: minScale,
          useNativeDriver: true,
          friction: 7,
          tension: 40,
        }),
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          friction: 7,
          tension: 40,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          friction: 7,
          tension: 40,
        }),
      ]).start();
      isZoomedRef.current = false;
      lastTranslateXRef.current = 0;
      lastTranslateYRef.current = 0;
    } else {
      // Zoom in
      Animated.spring(scale, {
        toValue: maxScale,
        useNativeDriver: true,
        friction: 7,
        tension: 40,
      }).start();
      isZoomedRef.current = true;
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only set if there's actual movement and we're zoomed
        return isZoomedRef.current && (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2);
      },
      onPanResponderGrant: () => {
        // Handle tap detection
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          // Double tap detected
          tapCountRef.current = 0;
          handleDoubleTap();
        } else {
          lastTapRef.current = now;
        }
      },
      onPanResponderMove: (_, gestureState) => {
        if (isZoomedRef.current) {
          const maxTranslate = (maxScale - 1) * 150;
          const newX = lastTranslateXRef.current + gestureState.dx;
          const newY = lastTranslateYRef.current + gestureState.dy;
          
          translateX.setValue(Math.max(-maxTranslate, Math.min(maxTranslate, newX)));
          translateY.setValue(Math.max(-maxTranslate, Math.min(maxTranslate, newY)));
        }
      },
      onPanResponderRelease: () => {
        if (isZoomedRef.current) {
          lastTranslateXRef.current = (translateX as any)._value;
          lastTranslateYRef.current = (translateY as any)._value;
        }
      },
    })
  ).current;

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.imageContainer,
          {
            transform: [
              { translateX },
              { translateY },
              { scale },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Image
          source={{ uri }}
          style={styles.image}
          contentFit={resizeMode as any}
          transition={200}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
