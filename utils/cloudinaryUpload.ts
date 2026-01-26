import { ImageOptimizer } from './imageOptimizer';

const CLOUDINARY_CLOUD_NAME = "dsfzajwpa";
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
  console.log(CLOUDINARY_CLOUD_NAME);
  console.log(CLOUDINARY_UPLOAD_PRESET);
  throw new Error('Missing Cloudinary environment variables: EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET are required');
}


export class CloudinaryUpload {
  
  /**
   * Upload image to Cloudinary
   */
  static async uploadImage(
    uri: string, 
    folder: 'shops' | 'items' | 'advertisements',
    optimize: 'shop' | 'item' | 'advertisement' = 'item'
  ): Promise<string | null> {
    try {
      // Step 1: Optimize locally first (using your existing optimizer)
      let optimizedUri = uri;
      
      if (optimize === 'shop') {
        console.log('Optimizing shop image...');
        optimizedUri = await ImageOptimizer.optimizeShopImage(uri);
      } else if (optimize === 'item') {
        console.log('Optimizing item image...');
        optimizedUri = await ImageOptimizer.optimizeItemImage(uri);
      } else if (optimize === 'advertisement') {
        console.log('Optimizing advertisement image...');
        optimizedUri = await ImageOptimizer.optimizeAdvertisementImage(uri);
      }

      // Step 2: Create FormData
      const formData = new FormData();
      formData.append('file', {
        uri: optimizedUri,
        type: 'image/jpeg',
        name: 'upload.jpg',
      } as any);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET!);
      formData.append('folder', `Availo/${folder}`);
      formData.append('quality', 'auto');
      formData.append('fetch_format', 'auto');

      // Step 3: Upload to Cloudinary
      console.log(`Uploading to Cloudinary (${folder})...`);
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✓ Uploaded to Cloudinary:', data.secure_url);
      
      return data.secure_url;
      
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      return null;
    }
  }

  /**
   * Upload video to Cloudinary
   */
  static async uploadVideo(
    uri: string,
    folder: 'advertisements'
  ): Promise<string | null> {
    try {
      
      const formData = new FormData();

      const pathWithoutQuery = uri.split('?')[0];
      const extension = pathWithoutQuery.split('.').pop()?.toLowerCase() || 'mp4';
      const mimeTypes: Record<string, string> = {
        mp4: 'video/mp4',
        mov: 'video/quicktime',
        avi: 'video/x-msvideo',
        webm: 'video/webm',
      };
      const type = mimeTypes[extension] || 'video/mp4';

      formData.append('file', {
        uri: uri,
        type,
        name: `upload.${extension}`,
      } as any);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET!);
      formData.append('folder', `Availo/${folder}`);
      formData.append('resource_type', 'video');


      console.log(`Uploading video to Cloudinary...`);
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Video upload failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✓ Video uploaded to Cloudinary:', data.secure_url);
      
      return data.secure_url;
      
    } catch (error) {
      console.error('Cloudinary video upload error:', error);
      return null;
    }
  }

  /**
   * Upload multiple images
   */
  static async uploadMultipleImages(
    uris: string[],
    folder: 'shops' | 'items' | 'advertisements',
    optimize: 'shop' | 'item' | 'advertisement' = 'item'
  ): Promise<string[]> {
    const results:string[]=[];
    
    for (let i = 0; i < uris.length; i++) {
      console.log(`Uploading image ${i + 1} of ${uris.length}...`);
      const url = await this.uploadImage(uris[i], folder, optimize);
      if (url) {
          results.push(url);
      }
    }
    return results;
  }
}