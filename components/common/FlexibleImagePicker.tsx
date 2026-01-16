import React from 'react';
import { Alert, ActionSheetIOS, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export interface ImagePickerOptions {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  allowsMultipleSelection?: boolean;
  selectionLimit?: number;
  cropEnabled?: boolean;
}

export interface PickedImage {
  uri: string;
  width?: number;
  height?: number;
}

export class FlexibleImagePicker {
  
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
        Alert.alert(
          "Permissions Required",
          "Camera and photo library permissions are required to use this feature."
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  static async pickImage(options: ImagePickerOptions = {}): Promise<PickedImage | null> {
    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) return null;

    return new Promise((resolve) => {
      const showActionSheet = () => {
        const baseOptions = [
          'Take Photo',
          'Choose from Gallery',
        ];
        
        if (options.cropEnabled !== false) {
          baseOptions.push('Choose & Crop');
        }
        
        const actionOptions = [...baseOptions, 'Cancel'];

        if (Platform.OS === 'ios') {
          ActionSheetIOS.showActionSheetWithOptions(
            {
              options: actionOptions,
              cancelButtonIndex: actionOptions.length - 1,
            },
            (buttonIndex) => {
              switch (buttonIndex) {
                case 0:
                  this.launchCamera(options).then(resolve);
                  break;
                case 1:
                  this.launchGallery({ ...options, allowsEditing: false }).then(resolve);
                  break;
                case 2:
                  if (options.cropEnabled !== false && actionOptions[2] === 'Choose & Crop') {
                    this.launchGallery({ ...options, allowsEditing: true }).then(resolve);
                  } else {
                    resolve(null);
                  }
                  break;
                default:
                  resolve(null);
              }
            }
          );
        } else {
          // Android Alert
          Alert.alert(
            "Select Image",
            "Choose how you want to add an image",
            [
              { text: "Take Photo", onPress: () => this.launchCamera(options).then(resolve) },
              { 
                text: "Choose from Gallery", 
                onPress: () => this.launchGallery({ ...options, allowsEditing: false }).then(resolve) 
              },
              ...(options.cropEnabled !== false ? [{
                text: "Choose & Crop",
                onPress: () => this.launchGallery({ ...options, allowsEditing: true }).then(resolve)
              }] : []),
              { text: "Cancel", style: "cancel" as const, onPress: () => resolve(null) }
            ]
          );
        }
      };

      showActionSheet();
    });
  }

  static async pickShopPhoto(options: ImagePickerOptions = {}): Promise<PickedImage[]> {
    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) return [];

    return new Promise((resolve) => {
      if (Platform.OS === 'ios') {
        // Use ActionSheetIOS for iOS - all 4 options
        ActionSheetIOS.showActionSheetWithOptions(
          {
            title: "Add Shop Photos",
            message: "Choose how you want to add photos",
            options: [
              'Take Photo',
              'Choose Single Photo', 
              'Choose Multiple Photos',
              'Cancel'
            ],
            cancelButtonIndex: 3,
          },
          async (buttonIndex) => {
            switch (buttonIndex) {
              case 0: // Take Photo
                const cameraImage = await this.launchCamera({ ...options, allowsEditing: true });
                resolve(cameraImage ? [cameraImage] : []);
                break;
              case 1: // Choose Single Photo
                const singleImage = await this.launchGallery({ ...options, allowsEditing: true });
                resolve(singleImage ? [singleImage] : []);
                break;
              case 2: // Choose Multiple Photos
                const multipleImages = await this.pickMultipleImages({ ...options, cropEnabled: false });
                resolve(multipleImages);
                break;
              case 3: // Cancel
              default:
                resolve([]);
                break;
            }
          }
        );
      } else {
        // Use Alert for Android - all 4 options explicitly listed
        Alert.alert(
          "Add Shop Photos",
          "Choose how you want to add photos",
          [
            { 
              text: "Take Photo", 
              onPress: async () => {
                const image = await this.launchCamera({ ...options, allowsEditing: true });
                resolve(image ? [image] : []);
              }
            },
            { 
              text: "Choose Single Photo", 
              onPress: async () => {
                const image = await this.launchGallery({ ...options, allowsEditing: true });
                resolve(image ? [image] : []);
              }
            },
            { 
              text: "Choose Multiple Photos", 
              onPress: async () => {
                const images = await this.pickMultipleImages({ ...options, cropEnabled: false });
                resolve(images);
              }
            },
            { 
              text: "Cancel", 
              style: "cancel", 
              onPress: () => resolve([])
            }
          ],
          { 
            cancelable: true, 
            onDismiss: () => resolve([]) 
          }
        );
      }
    });
  }

  static async pickItemPhoto(options: ImagePickerOptions = {}): Promise<PickedImage | null> {
    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) return null;

    return new Promise((resolve) => {
      Alert.alert(
        "Add Item Photo",
        "Choose how you want to add photo",
        [
          { 
            text: "Take Photo", 
            onPress: async () => {
              // Take photo always with crop option
              const image = await this.launchCamera({ ...options, allowsEditing: true });
              resolve(image);
            }
          },
          { 
            text: "Choose Photo", 
            onPress: async () => {
              // Choose single photo always with crop option
              const image = await this.launchGallery({ ...options, allowsEditing: true });
              resolve(image);
            }
          },
          { 
            text: "Cancel", 
            style: "cancel", 
            onPress: () => resolve(null)
          }
        ]
      );
    });
  }

  static async pickFirstPhoto(options: ImagePickerOptions = {}): Promise<PickedImage[]> {
    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) return [];

    return new Promise((resolve) => {
      Alert.alert(
        "Add Your First Photo",
        "Choose how you want to add photos",
        [
          { 
            text: "Take Photo", 
            onPress: async () => {
              // Take photo always with crop option
              const image = await this.launchCamera({ ...options, allowsEditing: true });
              resolve(image ? [image] : []);
            }
          },
          { 
            text: "Choose Multiple Photos", 
            onPress: async () => {
              // Use the smart multiple picker logic
              const images = await this.pickMultipleImages({ ...options, cropEnabled: true });
              resolve(images);
            }
          },
          { 
            text: "Cancel", 
            style: "cancel", 
            onPress: () => resolve([])
          }
        ]
      );
    });
  }

  static async pickMultipleImages(options: ImagePickerOptions = {}): Promise<PickedImage[]> {
    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) return [];

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Always disable editing for multiple selection initially
        quality: options.quality || 0.6, // Reduced from 0.8 to 0.6 for faster uploads
        allowsMultipleSelection: true,
        selectionLimit: options.selectionLimit || 10,
      });

      if (!result.canceled && result.assets.length > 0) {
        // If only one image selected, directly crop it
        if (result.assets.length === 1 && options.cropEnabled !== false) {
          try {
            const croppedImage = await this.launchGallery({ ...options, allowsEditing: true });
            return croppedImage ? [croppedImage] : [];
          } catch (error) {
            console.error('Error cropping image:', error);
            // If crop fails, use original
            return result.assets.map(asset => ({
              uri: asset.uri,
              width: asset.width,
              height: asset.height,
            }));
          }
        }
        
        // Multiple images selected - no crop option
        return result.assets.map(asset => ({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
        }));
      }
      return [];
    } catch (error) {
      console.error('Error picking multiple images:', error);
      Alert.alert("Error", "Failed to select images");
      return [];
    }
  }

  private static async launchCamera(options: ImagePickerOptions): Promise<PickedImage | null> {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing || false,
        aspect: options.aspect,
        quality: options.quality || 0.6, // Reduced from 0.8 to 0.6 for faster uploads
      });

      if (!result.canceled && result.assets[0]) {
        return {
          uri: result.assets[0].uri,
          width: result.assets[0].width,
          height: result.assets[0].height,
        };
      }
      return null;
    } catch (error) {
      console.error('Error launching camera:', error);
      Alert.alert("Error", "Failed to take photo");
      return null;
    }
  }

  private static async launchGallery(options: ImagePickerOptions): Promise<PickedImage | null> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing || false,
        aspect: options.aspect,
        quality: options.quality || 0.6, // Reduced from 0.8 to 0.6 for faster uploads
        allowsMultipleSelection: options.allowsMultipleSelection || false,
      });

      if (!result.canceled && result.assets[0]) {
        return {
          uri: result.assets[0].uri,
          width: result.assets[0].width,
          height: result.assets[0].height,
        };
      }
      return null;
    } catch (error) {
      console.error('Error launching gallery:', error);
      Alert.alert("Error", "Failed to select image");
      return null;
    }
  }
}
