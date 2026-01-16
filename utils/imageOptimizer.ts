import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

export interface OptimizeImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  compress?: number;
}

export class ImageOptimizer {
  
  /**
   * Optimize image for shop photos (larger size, better quality)
   */
  static async optimizeShopImage(uri: string): Promise<string> {
    try {
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [
          { resize: { width: 1200 } } // Resize to max width 1200px, maintains aspect ratio
        ],
        {
          compress: 0.7, // 70% quality for good balance
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      return manipulatedImage.uri;
    } catch (error) {
      console.error('Error optimizing shop image:', error);
      return uri; // Return original if optimization fails
    }
  }

  /**
   * Optimize image for item photos (medium size)
   */
  static async optimizeItemImage(uri: string): Promise<string> {
    try {
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [
          { resize: { width: 800 } } // Resize to max width 800px
        ],
        {
          compress: 0.7, // 70% quality
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      return manipulatedImage.uri;
    } catch (error) {
      console.error('Error optimizing item image:', error);
      return uri;
    }
  }

  /**
   * Optimize image for advertisements (larger, high quality)
   */
  static async optimizeAdvertisementImage(uri: string): Promise<string> {
    try {
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [
          { resize: { width: 1200 } }
        ],
        {
          compress: 0.75, // 75% quality for ads
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      return manipulatedImage.uri;
    } catch (error) {
      console.error('Error optimizing advertisement image:', error);
      return uri;
    }
  }

  /**
   * Custom optimization with specific options
   */
  static async optimizeImage(
    uri: string, 
    options: OptimizeImageOptions = {}
  ): Promise<string> {
    try {
      const {
        maxWidth = 1024,
        maxHeight,
        quality = 0.7,
        compress = 0.7
      } = options;

      const actions: ImageManipulator.Action[] = [];

      // Add resize action
      if (maxWidth || maxHeight) {
        const resizeOptions: any = {};
        if (maxWidth) resizeOptions.width = maxWidth;
        if (maxHeight) resizeOptions.height = maxHeight;
        actions.push({ resize: resizeOptions });
      }

      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        actions,
        {
          compress: compress,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      return manipulatedImage.uri;
    } catch (error) {
      console.error('Error optimizing image:', error);
      return uri;
    }
  }

  /**
   * Get estimated file size reduction
   */
  static async getFileSizeInfo(uri: string): Promise<{ 
    original: number; 
    optimized: number; 
    reduction: string 
  } | null> {
    try {
      // This is a rough estimation
      const response = await fetch(uri);
      const blob = await response.blob();
      const originalSize = blob.size;

      const optimizedUri = await this.optimizeImage(uri);
      const optimizedResponse = await fetch(optimizedUri);
      const optimizedBlob = await optimizedResponse.blob();
      const optimizedSize = optimizedBlob.size;

      const reductionPercent = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);

      return {
        original: originalSize,
        optimized: optimizedSize,
        reduction: `${reductionPercent}%`
      };
    } catch (error) {
      console.error('Error getting file size info:', error);
      return null;
    }
  }

  /**
   * Batch optimize multiple images
   */
  static async optimizeMultipleImages(
    uris: string[], 
    type: 'shop' | 'item' | 'advertisement' = 'shop'
  ): Promise<string[]> {
    const optimizedUris: string[] = [];
    
    for (const uri of uris) {
      let optimizedUri: string;
      
      switch (type) {
        case 'shop':
          optimizedUri = await this.optimizeShopImage(uri);
          break;
        case 'item':
          optimizedUri = await this.optimizeItemImage(uri);
          break;
        case 'advertisement':
          optimizedUri = await this.optimizeAdvertisementImage(uri);
          break;
        default:
          optimizedUri = uri;
      }
      
      optimizedUris.push(optimizedUri);
    }
    
    return optimizedUris;
  }
}
