import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActionSheetIOS,
  FlatList,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import AddressInput from "../common/AddressInput";
import AdvertisementModal from "./AdvertisementModal";
import AdvertisementHistoryModal from "./AdvertisementHistoryModal";

// Component to display individual images with proper URL fetching
const ImageDisplay = ({ 
  imageId, 
  style, 
  contentFit = "cover" 
}: { 
  imageId: Id<"_storage">; 
  style: any; 
  contentFit?: "cover" | "contain" | "fill" 
}) => {
  const imageUrl = useQuery(api.shops.getShopImage, { imageId });
  
  console.log(`ImageDisplay - imageId: ${imageId}, imageUrl: ${imageUrl}`);
  
  if (!imageUrl) {
    return (
      <View style={[style, { backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: "#9CA3AF", fontSize: 12 }}>Loading...</Text>
      </View>
    );
  }
  
  return (
    <Image
      source={{ uri: imageUrl }}
      style={style}
      contentFit={contentFit}
    />
  );
};

interface Shop {
  _id: Id<"shops">;
  name: string;
  category: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  mobileNumber?: string;
  shopImageId?: Id<"_storage">;
  shopImageIds?: Id<"_storage">[];
  businessHours?: {
    openTime: string;
    closeTime: string;
  };
  hasDelivery?: boolean;
  deliveryRange?: number;
}

interface EditShopModalProps {
  visible: boolean;
  onClose: () => void;
  shop: Shop | null;
  shopOwnerId: Id<"users">;
}

const SHOP_CATEGORIES = [
  "grocery",
  "restaurant",
  "pharmacy",
  "clothing",
  "electronics",
  "bakery",
  "hardware",
  "beauty",
  "books",
  "other",
];

export default function EditShopModal({ visible, onClose, shop, shopOwnerId }: EditShopModalProps) {
  const [shopName, setShopName] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [openingMinutes, setOpeningMinutes] = useState("");
  const [openingPeriod, setOpeningPeriod] = useState("AM");
  const [closingHours, setClosingHours] = useState("");
  const [closingMinutes, setClosingMinutes] = useState("");
  const [closingPeriod, setClosingPeriod] = useState("PM");
  
  // Delivery-related states
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryRange, setDeliveryRange] = useState("");
  
  // Image management states
  const [existingImages, setExistingImages] = useState<Id<"_storage">[]>([]);
  const [newImages, setNewImages] = useState<string[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<Id<"_storage">[]>([]);
  const [mainImageIndex, setMainImageIndex] = useState<number>(0);
  
  const [loading, setLoading] = useState(false);
  
  // Advertisement modal states
  const [showAdvertisement, setShowAdvertisement] = useState(false);
  const [showAdvertisementHistory, setShowAdvertisementHistory] = useState(false);
  const [editingAdvertisement, setEditingAdvertisement] = useState(null);

  const updateShop = useMutation(api.shops.updateShop);
  const deleteShop = useMutation(api.shops.deleteShop);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  
  // Get image URLs for existing images
  const getImageUrl = (imageId: Id<"_storage">) => {
    return useQuery(api.shops.getShopImage, { imageId });
  };

  const convertTo24Hour = (hours: string, minutes: string, period: string): string => {
    const hour = parseInt(hours) || 0;
    const minute = parseInt(minutes) || 0;
    
    let hour24 = hour;
    if (period === "AM") {
      hour24 = hour === 12 ? 0 : hour;
    } else {
      hour24 = hour === 12 ? 12 : hour + 12;
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const convertFrom24Hour = (timeString: string): { hours: string, minutes: string, period: string } => {
    const [hourStr, minuteStr] = timeString.split(':');
    const hour24 = parseInt(hourStr) || 0;
    const minute = parseInt(minuteStr) || 0;
    
    if (hour24 === 0) {
      return { hours: "12", minutes: minute.toString(), period: "AM" };
    } else if (hour24 < 12) {
      return { hours: hour24.toString(), minutes: minute.toString(), period: "AM" };
    } else if (hour24 === 12) {
      return { hours: "12", minutes: minute.toString(), period: "PM" };
    } else {
      return { hours: (hour24 - 12).toString(), minutes: minute.toString(), period: "PM" };
    }
  };

  // Populate form when shop data is available
  useEffect(() => {
    if (shop) {
      setShopName(shop.name);
      // Check if category is one of the predefined ones
      const isPredefinedCategory = SHOP_CATEGORIES.includes(shop.category);
      if (isPredefinedCategory) {
        setCategory(shop.category);
        setCustomCategory("");
      } else {
        setCategory("other");
        setCustomCategory(shop.category);
      }
      setAddress(shop.location.address || "");
      setLatitude(shop.location.lat.toString());
      setLongitude(shop.location.lng.toString());
      setMobileNumber(shop.mobileNumber || "");
      
      // Load existing business hours or set defaults
      if (shop.businessHours) {
        const openingTime = convertFrom24Hour(shop.businessHours.openTime);
        const closingTime = convertFrom24Hour(shop.businessHours.closeTime);
        
        setOpeningHours(openingTime.hours);
        setOpeningMinutes(openingTime.minutes);
        setOpeningPeriod(openingTime.period);
        setClosingHours(closingTime.hours);
        setClosingMinutes(closingTime.minutes);
        setClosingPeriod(closingTime.period);
      } else {
        // Set default business hours if not available
        setOpeningHours("9");
        setOpeningMinutes("0");
        setOpeningPeriod("AM");
        setClosingHours("6");
        setClosingMinutes("0");
        setClosingPeriod("PM");
      }
      
      // Initialize delivery settings
      setHasDelivery(shop.hasDelivery || false);
      setDeliveryRange(shop.deliveryRange ? shop.deliveryRange.toString() : "");
      
      // Initialize images
      if (shop.shopImageIds && shop.shopImageIds.length > 0) {
        console.log("Loading shop images:", shop.shopImageIds);
        setExistingImages(shop.shopImageIds);
        setMainImageIndex(0);
      } else if (shop.shopImageId) {
        // Handle legacy single image
        console.log("Loading legacy shop image:", shop.shopImageId);
        setExistingImages([shop.shopImageId]);
        setMainImageIndex(0);
      } else {
        console.log("No shop images found");
        setExistingImages([]);
      }
      
      // Reset image management states
      setNewImages([]);
      setImagesToDelete([]);
    }
  }, [shop]);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== "granted" || mediaStatus !== "granted") {
      Alert.alert(
        "Permissions Required",
        "Please grant camera and photo library permissions to manage shop images."
      );
      return false;
    }
    return true;
  };

  const showImagePickerOptions = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    const totalImages = existingImages.filter(id => !imagesToDelete.includes(id)).length + newImages.length;
    const maxImages = 5;
    
    if (totalImages >= maxImages) {
      Alert.alert("Maximum Images", `You can only have up to ${maxImages} images. Please remove some images first.`);
      return;
    }

    const options = ["Choose Multiple Photos", "Take Photo", "Cancel"];
    
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 2,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            openGallery(true); // Choose Multiple Photos
          } else if (buttonIndex === 1) {
            openCamera(); // Take Photo
          }
        }
      );
    } else {
      Alert.alert(
        "Add Images",
        "Choose an option",
        [
          { text: "Choose Multiple Photos", onPress: () => openGallery(true) },
          { text: "Take Photo", onPress: openCamera },
          { text: "Cancel", style: "cancel" },
        ]
      );
    }
  };

  const openCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const newImageUri = result.assets[0].uri;
        setNewImages(prev => [...prev, newImageUri]);
        
        // If this is the first image, make it main
        const totalExisting = existingImages.filter(id => !imagesToDelete.includes(id)).length;
        if (totalExisting === 0 && newImages.length === 0) {
          setMainImageIndex(0);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const openGallery = async (allowsMultiple: boolean = false) => {
    try {
      const totalImages = existingImages.filter(id => !imagesToDelete.includes(id)).length + newImages.length;
      const remainingSlots = 5 - totalImages;
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: !allowsMultiple,
        allowsMultipleSelection: allowsMultiple,
        selectionLimit: allowsMultiple ? Math.min(remainingSlots, 5) : 1,
        aspect: allowsMultiple ? undefined : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const newImageUris = result.assets.map(asset => asset.uri);
        setNewImages(prev => [...prev, ...newImageUris]);
        
        // If these are the first images, make the first one main
        const totalExisting = existingImages.filter(id => !imagesToDelete.includes(id)).length;
        if (totalExisting === 0 && newImages.length === 0) {
          setMainImageIndex(0);
        }
        
        if (newImageUris.length > 1) {
          Alert.alert("Success", `${newImageUris.length} images added successfully!`);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select images");
    }
  };

  // Remove existing image
  const removeExistingImage = (imageId: Id<"_storage">) => {
    const currentAllImages = [...existingImages.filter(id => !imagesToDelete.includes(id)), ...newImages];
    const currentMainImage = currentAllImages[mainImageIndex];
    const isMainImageBeingDeleted = imageId === currentMainImage;
    
    setImagesToDelete(prev => [...prev, imageId]);
    
    // If main image is being deleted, automatically select the first remaining image
    if (isMainImageBeingDeleted) {
      const remainingExisting = existingImages.filter(id => !imagesToDelete.includes(id) && id !== imageId);
      const totalRemaining = remainingExisting.length + newImages.length;
      
      if (totalRemaining > 0) {
        setMainImageIndex(0); // Always set to first remaining image
      }
    } else {
      // Adjust main image index if the deleted image was before the current main
      const deletedImageGlobalIndex = existingImages.filter(id => !imagesToDelete.includes(id)).indexOf(imageId);
      if (deletedImageGlobalIndex >= 0 && deletedImageGlobalIndex < mainImageIndex) {
        setMainImageIndex(Math.max(0, mainImageIndex - 1));
      }
    }
  };

  // Remove new image
  const removeNewImage = (index: number) => {
    const currentAllImages = [...existingImages.filter(id => !imagesToDelete.includes(id)), ...newImages];
    const currentMainImage = currentAllImages[mainImageIndex];
    const imageBeingDeleted = newImages[index];
    const isMainImageBeingDeleted = imageBeingDeleted === currentMainImage;
    
    setNewImages(prev => prev.filter((_, i) => i !== index));
    
    // If main image is being deleted, automatically select the first remaining image
    if (isMainImageBeingDeleted) {
      const remainingExisting = existingImages.filter(id => !imagesToDelete.includes(id));
      const remainingNew = newImages.filter((_, i) => i !== index);
      const totalRemaining = remainingExisting.length + remainingNew.length;
      
      if (totalRemaining > 0) {
        setMainImageIndex(0); // Always set to first remaining image
      }
    } else {
      // Adjust main image index if the deleted image was before the current main
      const deletedImageGlobalIndex = existingImages.filter(id => !imagesToDelete.includes(id)).length + index;
      if (deletedImageGlobalIndex < mainImageIndex) {
        setMainImageIndex(Math.max(0, mainImageIndex - 1));
      }
    }
  };

  // Set image as main
  const setAsMainImage = (type: 'existing' | 'new', index: number) => {
    if (type === 'existing') {
      const remainingExisting = existingImages.filter(id => !imagesToDelete.includes(id));
      setMainImageIndex(index);
    } else {
      const remainingExisting = existingImages.filter(id => !imagesToDelete.includes(id));
      setMainImageIndex(remainingExisting.length + index);
    }
  };

  // Replace image functions
  const showReplaceImageOptions = (type: 'existing' | 'new', index: number) => {
    const options = ["Choose Multiple Photos", "Take Photo", "Cancel"];
    
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 2,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            replaceImage(type, index, 'gallery');
          } else if (buttonIndex === 1) {
            replaceImage(type, index, 'camera');
          }
        }
      );
    } else {
      Alert.alert(
        "Replace Image",
        "Choose how to replace this image",
        [
          { text: "Choose Multiple Photos", onPress: () => replaceImage(type, index, 'gallery') },
          { text: "Take Photo", onPress: () => replaceImage(type, index, 'camera') },
          { text: "Cancel", style: "cancel" },
        ]
      );
    }
  };

  const replaceImage = async (type: 'existing' | 'new', index: number, source: 'camera' | 'gallery') => {
    try {
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) return;

      let result;
      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const newImageUri = result.assets[0].uri;
        
        if (type === 'existing') {
          // For existing images, mark old for deletion and add new
          const oldImageId = existingImages[index];
          if (oldImageId && !imagesToDelete.includes(oldImageId)) {
            setImagesToDelete(prev => [...prev, oldImageId]);
          }
          setNewImages(prev => [...prev, newImageUri]);
          
          // Update main image index if this was the main image
          if (index === mainImageIndex) {
            const remainingExisting = existingImages.filter(id => !imagesToDelete.includes(id));
            setMainImageIndex(remainingExisting.length + newImages.length);
          }
        } else {
          // For new images, just replace in the array
          setNewImages(prev => {
            const updated = [...prev];
            updated[index] = newImageUri;
            return updated;
          });
        }
      }
    } catch (error) {
      console.error("Error replacing image:", error);
      Alert.alert("Error", "Failed to replace image. Please try again.");
    }
  };

  const uploadImage = async (uri: string): Promise<Id<"_storage"> | null> => {
    try {
      const uploadUrl = await generateUploadUrl();
      
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await uploadResponse.json();
      return storageId;
    } catch (error) {
      console.error("Image upload error:", error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!shop) return;

    const finalCategory = category === "other" ? customCategory.trim() : category;

    if (!shopName.trim() || !finalCategory || !address.trim() || !latitude || !longitude || !mobileNumber.trim()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (category === "other" && !customCategory.trim()) {
      Alert.alert("Error", "Please enter a custom category");
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      Alert.alert("Error", "Please enter valid coordinates");
      return;
    }

    if (mobileNumber.trim() && !/^\d{10}$/.test(mobileNumber.trim())) {
      Alert.alert("Error", "Mobile number must be exactly 10 digits");
      return;
    }

    setLoading(true);
    try {
      // Process images
      const finalImageIds: Id<"_storage">[] = [];
      let mainImageId: Id<"_storage"> | undefined;

      // Keep existing images that aren't marked for deletion
      const remainingExisting = existingImages.filter(id => !imagesToDelete.includes(id));
      finalImageIds.push(...remainingExisting);

      // Upload new images
      for (const imageUri of newImages) {
        const uploadedId = await uploadImage(imageUri);
        if (uploadedId) {
          finalImageIds.push(uploadedId);
        }
      }

      // Set main image
      if (finalImageIds.length > 0) {
        mainImageId = finalImageIds[Math.min(mainImageIndex, finalImageIds.length - 1)];
      }

      // Prepare business hours if valid
      let businessHours;
      if (openingHours && openingMinutes !== undefined && closingHours && closingMinutes !== undefined) {
        const openTime = convertTo24Hour(openingHours, openingMinutes, openingPeriod);
        const closeTime = convertTo24Hour(closingHours, closingMinutes, closingPeriod);
        businessHours = { openTime, closeTime };
      }

      // Validate delivery range if delivery is enabled
      if (hasDelivery && (!deliveryRange || isNaN(parseFloat(deliveryRange)) || parseFloat(deliveryRange) <= 0)) {
        Alert.alert("Error", "Please enter a valid delivery range");
        return;
      }

      await updateShop({
        shopId: shop._id,
        name: shopName.trim(),
        category: finalCategory,
        location: {
          lat,
          lng,
          address: address.trim(),
        },
        mobileNumber: mobileNumber.trim(),
        shopImageId: mainImageId, // For backward compatibility
        shopImageIds: finalImageIds.length > 0 ? finalImageIds : undefined,
        businessHours,
        hasDelivery,
        deliveryRange: hasDelivery ? parseFloat(deliveryRange) : undefined,
      });

      onClose();
      Alert.alert("Success", "Shop updated successfully!");
    } catch (error) {
      console.error("Update error:", error);
      Alert.alert("Error", "Failed to update shop. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const handleDelete = () => {
    if (!shop) return;

    Alert.alert(
      "Delete Shop",
      `Are you sure you want to delete "${shop.name}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            try {
              await deleteShop({ shopId: shop._id });
              onClose();
              Alert.alert("Success", "Shop deleted successfully!");
            } catch (error) {
              Alert.alert("Error", "Failed to delete shop. Please try again.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleEditAdvertisement = (advertisement: any) => {
    setEditingAdvertisement(advertisement);
    setShowAdvertisementHistory(false);
    setShowAdvertisement(true);
  };

  if (!shop) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} disabled={loading}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Shop</Text>
          <TouchableOpacity 
            onPress={handleDelete} 
            disabled={loading}
          >
            <Ionicons name="trash" size={24} color="#DC2626" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            {/* Shop Images Section - Top of Page */}
            <View style={styles.topImageSection}>
              <Text style={styles.sectionTitle}>Shop Images</Text>
              
              {(() => {
                const allImages = [
                  ...existingImages.filter(id => !imagesToDelete.includes(id)),
                  ...newImages
                ];
                
                if (allImages.length === 0) {
                  // No images state - Show camera options
                  return (
                    <View style={styles.noImagesContainer}>
                      <View style={styles.emptyMainImageArea}>
                        <View style={styles.cameraIconContainer}>
                          <Ionicons name="camera-outline" size={64} color="#9CA3AF" />
                        </View>
                        <Text style={styles.noImagesTitle}>Add Shop Images</Text>
                        <Text style={styles.noImagesSubtitle}>
                          Add up to 10 images to showcase your shop
                        </Text>
                        
                        <View style={styles.initialImageOptions}>
                          <TouchableOpacity
                            style={[styles.imageOptionButton, styles.multipleButton]}
                            onPress={() => openGallery(true)}
                          >
                            <Ionicons name="images" size={24} color="#FFFFFF" />
                            <Text style={styles.imageOptionButtonText}>Choose Multiple Photos</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            style={[styles.imageOptionButton, styles.cameraButton]}
                            onPress={openCamera}
                          >
                            <Ionicons name="camera" size={24} color="#FFFFFF" />
                            <Text style={styles.imageOptionButtonText}>Take Photo</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                }
                
                // Has images state
                const mainImageSrc = allImages[mainImageIndex];
                const isMainImageExisting = existingImages.includes(mainImageSrc as Id<"_storage">);
                
                console.log("=== Main Image Debug ===");
                console.log("All images:", allImages);
                console.log("Main image index:", mainImageIndex);
                console.log("Main image source:", mainImageSrc);
                console.log("Is main image existing:", isMainImageExisting);
                console.log("Existing images:", existingImages);
                console.log("New images:", newImages);
                console.log("========================");
                
                return (
                  <View style={styles.imagesContainer}>
                    {/* Main Image Display */}
                    <View style={styles.mainImageSection}>
                      <View style={styles.mainImageFrame}>
                        {isMainImageExisting ? (
                          <ImageDisplay 
                            imageId={mainImageSrc as Id<"_storage">} 
                            style={styles.mainImage}
                          />
                        ) : (
                          <Image
                            source={{ uri: mainImageSrc as string }}
                            style={styles.mainImage}
                            contentFit="cover"
                          />
                        )}
                        
                        {/* Main Image Controls Overlay */}
                        <View style={styles.mainImageControls}>
                          <TouchableOpacity
                            style={[styles.imageControlButton, styles.editControlButton]}
                            onPress={() => {
                              if (isMainImageExisting) {
                                const existingIndex = existingImages.indexOf(mainImageSrc as Id<"_storage">);
                                showReplaceImageOptions('existing', existingIndex);
                              } else {
                                const newIndex = newImages.indexOf(mainImageSrc as string);
                                showReplaceImageOptions('new', newIndex);
                              }
                            }}
                          >
                            <Ionicons name="camera" size={18} color="#FFFFFF" />
                            <Text style={styles.controlButtonText}>Replace</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity
                            style={[styles.imageControlButton, styles.deleteControlButton]}
                            onPress={() => {
                              if (isMainImageExisting) {
                                removeExistingImage(mainImageSrc as Id<"_storage">);
                              } else {
                                const newIndex = newImages.indexOf(mainImageSrc as string);
                                removeNewImage(newIndex);
                              }
                            }}
                          >
                            <Ionicons name="trash" size={18} color="#FFFFFF" />
                            <Text style={styles.controlButtonText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                    
                    {/* Horizontal Image List */}
                    <View style={styles.imageListSection}>
                      <View style={styles.imageListHeader}>
                        <Text style={styles.imageListTitle}>
                          All Images ({allImages.length}/10)
                        </Text>
                        {allImages.length < 10 && (
                          <TouchableOpacity
                            style={styles.addImageSmallButton}
                            onPress={showImagePickerOptions}
                          >
                            <Ionicons name="add" size={20} color="#3B82F6" />
                            <Text style={styles.addImageSmallText}>Add</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        style={styles.imageScrollContainer}
                        contentContainerStyle={styles.imageScrollContent}
                      >
                        {allImages.map((imageSrc, index) => {
                          const isExisting = existingImages.includes(imageSrc as Id<"_storage">);
                          const isMain = index === mainImageIndex;
                          const originalIndex = isExisting 
                            ? existingImages.indexOf(imageSrc as Id<"_storage">)
                            : newImages.indexOf(imageSrc as string);
                          
                          return (
                            <View 
                              key={`${isExisting ? 'existing' : 'new'}-${imageSrc}-${index}`}
                              style={[styles.imageListItem, isMain && styles.imageListItemMain]}
                            >
                              {/* Image Thumbnail */}
                              <View style={styles.imageListThumbnailContainer}>
                                {isExisting ? (
                                  <ImageDisplay 
                                    imageId={imageSrc as Id<"_storage">} 
                                    style={styles.imageListThumbnail}
                                  />
                                ) : (
                                  <Image
                                    source={{ uri: imageSrc as string }}
                                    style={styles.imageListThumbnail}
                                    contentFit="cover"
                                  />
                                )}
                                
                                {/* Main Image Badge */}
                                {isMain && (
                                  <View style={styles.mainBadge}>
                                    <Text style={styles.mainBadgeText}>MAIN</Text>
                                  </View>
                                )}
                              </View>
                              
                              {/* Image Controls */}
                              <View style={styles.imageListControls}>
                                {!isMain && (
                                  <TouchableOpacity
                                    style={[styles.imageListButton, styles.setMainButton]}
                                    onPress={() => setAsMainImage(isExisting ? 'existing' : 'new', originalIndex)}
                                  >
                                    <Ionicons name="star" size={14} color="#FFFFFF" />
                                    <Text style={styles.imageListButtonText}>Set Main</Text>
                                  </TouchableOpacity>
                                )}
                                
                                <TouchableOpacity
                                  style={[styles.imageListButton, styles.editButton]}
                                  onPress={() => showReplaceImageOptions(isExisting ? 'existing' : 'new', originalIndex)}
                                >
                                  <Ionicons name="camera" size={14} color="#FFFFFF" />
                                  <Text style={styles.imageListButtonText}>Edit</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                  style={[styles.imageListButton, styles.deleteButton]}
                                  onPress={() => {
                                    Alert.alert(
                                      "Delete Image",
                                      isMain ? "This is your main image. Deleting it will make another image the main image." : "Are you sure you want to delete this image?",
                                      [
                                        { text: "Cancel", style: "cancel" },
                                        { 
                                          text: "Delete", 
                                          style: "destructive",
                                          onPress: () => {
                                            if (isExisting) {
                                              removeExistingImage(imageSrc as Id<"_storage">);
                                            } else {
                                              removeNewImage(originalIndex);
                                            }
                                          }
                                        }
                                      ]
                                    );
                                  }}
                                >
                                  <Ionicons name="trash" size={14} color="#FFFFFF" />
                                  <Text style={styles.imageListButtonText}>Delete</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          );
                        })}
                      </ScrollView>
                    </View>
                  </View>
                );
              })()}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Shop Name *</Text>
              <TextInput
                style={styles.input}
                value={shopName}
                onChangeText={setShopName}
                placeholder="Enter shop name"
                autoCapitalize="words"
                placeholderTextColor="#888"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mobile Number *</Text>
              <View style={styles.mobileInputContainer}>
                <Ionicons name="call" size={20} color="#2563EB" style={styles.mobileIcon} />
                <TextInput
                  style={styles.mobileInput}
                  value={mobileNumber}
                  onChangeText={(text) => {
                    // Only allow digits and limit to 10 characters
                    const cleaned = text.replace(/\D/g, '');
                    if (cleaned.length <= 10) {
                      setMobileNumber(cleaned);
                    }
                  }}
                  placeholder="Enter 10-digit mobile number"
                  keyboardType="numeric"
                  maxLength={10}
                  placeholderTextColor="#888"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoryContainer}>
                  {SHOP_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryButton,
                        category === cat && styles.categoryButtonSelected,
                      ]}
                      onPress={() => {
                        setCategory(cat);
                        if (cat !== "other") {
                          setCustomCategory("");
                        }
                      }}
                    >
                      <Text style={[
                        styles.categoryButtonText,
                        category === cat && styles.categoryButtonTextSelected,
                      ]}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Custom Category Input */}
            {category === "other" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Custom Category *</Text>
                <TextInput
                  style={styles.input}
                  value={customCategory}
                  onChangeText={setCustomCategory}
                  placeholder="Enter your shop category"
                  autoCapitalize="words"
                  placeholderTextColor="#888"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address *</Text>
              <AddressInput
                value={address}
                onAddressChange={setAddress}
                onCoordinatesChange={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
              />
            </View>

            <View style={styles.coordinatesContainer}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Latitude *</Text>
                <TextInput
                  style={[styles.input, styles.coordinateInput, styles.readOnlyInput]}
                  value={latitude}
                  placeholder="Auto-filled"
                  keyboardType="numeric"
                  editable={false}
                  placeholderTextColor="#888"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Longitude *</Text>
                <TextInput
                  style={[styles.input, styles.coordinateInput, styles.readOnlyInput]}
                  value={longitude}
                  placeholder="Auto-filled"
                  keyboardType="numeric"
                  editable={false}
                  placeholderTextColor="#888"
                />
              </View>
            </View>

            <View style={styles.coordinatesHint}>
              <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
              <Text style={styles.hintText}>
                Coordinates will be auto-filled when you select an address from the search results.
              </Text>
            </View>

            {/* Business Hours Section */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Hours</Text>
              
              {/* Opening Hours */}
              <View style={styles.businessHoursSection}>
                <Text style={styles.businessHoursLabel}>Opening Time</Text>
                <View style={styles.timeContainer}>
                  <View style={styles.timeInputGroup}>
                    <Text style={styles.timeLabel}>Hours</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={openingHours}
                      onChangeText={(text) => {
                        const cleaned = text.replace(/\D/g, '');
                        const num = parseInt(cleaned);
                        if (cleaned === '' || (num >= 1 && num <= 12)) {
                          setOpeningHours(cleaned);
                        }
                      }}
                      placeholder="1-12"
                      keyboardType="numeric"
                      maxLength={2}
                      placeholderTextColor="#888"
                    />
                  </View>
                  <Text style={styles.timeSeparator}>:</Text>
                  <View style={styles.timeInputGroup}>
                    <Text style={styles.timeLabel}>Minutes</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={openingMinutes}
                      onChangeText={(text) => {
                        const cleaned = text.replace(/\D/g, '');
                        const num = parseInt(cleaned);
                        if (cleaned === '' || (num >= 0 && num <= 59)) {
                          setOpeningMinutes(cleaned);
                        }
                      }}
                      placeholder="0-59"
                      keyboardType="numeric"
                      maxLength={2}
                      placeholderTextColor="#888"
                    />
                  </View>
                  <View style={styles.periodSelector}>
                    <TouchableOpacity
                      style={[
                        styles.periodButton,
                        openingPeriod === "AM" && styles.periodButtonSelected
                      ]}
                      onPress={() => setOpeningPeriod("AM")}
                    >
                      <Text style={[
                        styles.periodButtonText,
                        openingPeriod === "AM" && styles.periodButtonTextSelected
                      ]}>AM</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.periodButton,
                        openingPeriod === "PM" && styles.periodButtonSelected
                      ]}
                      onPress={() => setOpeningPeriod("PM")}
                    >
                      <Text style={[
                        styles.periodButtonText,
                        openingPeriod === "PM" && styles.periodButtonTextSelected
                      ]}>PM</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Closing Hours */}
              <View style={styles.businessHoursSection}>
                <Text style={styles.businessHoursLabel}>Closing Time</Text>
                <View style={styles.timeContainer}>
                  <View style={styles.timeInputGroup}>
                    <Text style={styles.timeLabel}>Hours</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={closingHours}
                      onChangeText={(text) => {
                        const cleaned = text.replace(/\D/g, '');
                        const num = parseInt(cleaned);
                        if (cleaned === '' || (num >= 1 && num <= 12)) {
                          setClosingHours(cleaned);
                        }
                      }}
                      placeholder="1-12"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                  <Text style={styles.timeSeparator}>:</Text>
                  <View style={styles.timeInputGroup}>
                    <Text style={styles.timeLabel}>Minutes</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={closingMinutes}
                      onChangeText={(text) => {
                        const cleaned = text.replace(/\D/g, '');
                        const num = parseInt(cleaned);
                        if (cleaned === '' || (num >= 0 && num <= 59)) {
                          setClosingMinutes(cleaned);
                        }
                      }}
                      placeholder="0-59"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                  <View style={styles.periodSelector}>
                    <TouchableOpacity
                      style={[
                        styles.periodButton,
                        closingPeriod === "AM" && styles.periodButtonSelected
                      ]}
                      onPress={() => setClosingPeriod("AM")}
                    >
                      <Text style={[
                        styles.periodButtonText,
                        closingPeriod === "AM" && styles.periodButtonTextSelected
                      ]}>AM</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.periodButton,
                        closingPeriod === "PM" && styles.periodButtonSelected
                      ]}
                      onPress={() => setClosingPeriod("PM")}
                    >
                      <Text style={[
                        styles.periodButtonText,
                        closingPeriod === "PM" && styles.periodButtonTextSelected
                      ]}>PM</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              
              <Text style={styles.timeHint}>
                Set your regular business hours (12-hour format)
              </Text>
            </View>

            {/* Delivery Section */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Delivery Service</Text>
              <View style={styles.statusButtons}>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    hasDelivery && styles.statusButtonOpen,
                  ]}
                  onPress={() => setHasDelivery(true)}
                >
                  <Ionicons
                    name="bicycle"
                    size={20}
                    color={hasDelivery ? "#FFFFFF" : "#6B7280"}
                  />
                  <Text
                    style={[
                      styles.statusButtonText,
                      hasDelivery && styles.statusButtonTextSelected,
                    ]}
                  >
                    Yes
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    !hasDelivery && styles.statusButtonClosed,
                  ]}
                  onPress={() => setHasDelivery(false)}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={!hasDelivery ? "#FFFFFF" : "#6B7280"}
                  />
                  <Text
                    style={[
                      styles.statusButtonText,
                      !hasDelivery && styles.statusButtonTextSelected,
                    ]}
                  >
                    No
                  </Text>
                </TouchableOpacity>
              </View>

              {hasDelivery && (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.label}>Delivery Range (km)</Text>
                  <TextInput
                    style={styles.input}
                    value={deliveryRange}
                    onChangeText={setDeliveryRange}
                    placeholder="Enter delivery range in kilometers"
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              )}
            </View>
          </View>

          {/* Advertisement Section */}
          <View style={styles.advertisementSection}>
            <Text style={styles.sectionTitle}>Promote Your Shop</Text>
            <TouchableOpacity
              style={styles.advertiseButton}
              onPress={() => setShowAdvertisement(true)}
            >
              <View style={styles.advertiseButtonContent}>
                <Ionicons name="megaphone" size={24} color="#F59E0B" />
                <View style={styles.advertiseButtonText}>
                  <Text style={styles.advertiseButtonTitle}>Advertise here</Text>
                  <Text style={styles.advertiseButtonSubtitle}>Notify locals about your shop</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.historyButton}
              onPress={() => setShowAdvertisementHistory(true)}
            >
              <Ionicons name="time-outline" size={20} color="#6B7280" />
              <Text style={styles.historyButtonText}>Advertisement History</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? "Updating Shop..." : "Update Shop"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Advertisement Modals */}
      <AdvertisementModal
        visible={showAdvertisement}
        onClose={() => {
          setShowAdvertisement(false);
          setEditingAdvertisement(null);
        }}
        shopId={shop._id}
        shopOwnerId={shopOwnerId}
        shopLocation={{ lat: shop.location.lat, lng: shop.location.lng }}
        editingAdvertisement={editingAdvertisement}
      />

      <AdvertisementHistoryModal
        visible={showAdvertisementHistory}
        onClose={() => setShowAdvertisementHistory(false)}
        shopId={shop._id}
        shopOwnerId={shopOwnerId}
        shopLocation={{ lat: shop.location.lat, lng: shop.location.lng }}
        onEditAdvertisement={handleEditAdvertisement}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  form: {
    paddingVertical: 20,
    gap: 20,
  },
  imageSection: {
    alignItems: "center",
    gap: 12,
  },
  currentImageContainer: {
    width: "100%",
    height: "100%",
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#2563EB",
    borderStyle: "dashed",
  },
  currentImageText: {
    fontSize: 14,
    color: "#2563EB",
    fontWeight: "600",
  },
  currentImageSubtext: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 8,
  },
  imageOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 16,
    padding: 6,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    color: "#1F2937",
  },
  mobileInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
  },
  mobileIcon: {
    marginRight: 12,
  },
  mobileInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: "#1F2937",
  },
  categoryContainer: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryButtonSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  categoryButtonText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  categoryButtonTextSelected: {
    color: "#FFFFFF",
  },
  coordinatesContainer: {
    flexDirection: "row",
    gap: 12,
  },
  coordinateInput: {
    backgroundColor: "#F9FAFB",
    color: "#6B7280",
  },
  readOnlyInput: {
    backgroundColor: "#F3F4F6",
    color: "#9CA3AF",
    opacity: 0.8,
  },
  coordinatesHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 4,
    marginTop: -12,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  submitButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  businessHoursSection: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  businessHoursLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timeInputGroup: {
    flex: 1,
    alignItems: "center",
  },
  timeLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  timeInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    color: "#1F2937",
    textAlign: "center",
    minWidth: 60,
  },
  timeSeparator: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#6B7280",
    marginTop: 16,
  },
  periodSelector: {
    flexDirection: "column",
    gap: 4,
    marginTop: 16,
  },
  periodButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minWidth: 50,
    alignItems: "center",
  },
  periodButtonSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  periodButtonText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  periodButtonTextSelected: {
    color: "#FFFFFF",
  },
  timeHint: {
    fontSize: 12,
    color: "#9CA3AF",
    fontStyle: "italic",
    marginTop: 4,
  },
  advertisementSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  advertiseButton: {
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FED7AA",
    marginBottom: 12,
    overflow: "hidden",
  },
  advertiseButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  advertiseButtonText: {
    flex: 1,
  },
  advertiseButtonTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#92400E",
    marginBottom: 2,
  },
  advertiseButtonSubtitle: {
    fontSize: 13,
    color: "#D97706",
  },
  historyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  historyButtonText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  // Image Management Styles
  topImageSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 20,
    textAlign: "center",
  },
  
  // No Images State
  noImagesContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyMainImageArea: {
    width: "100%",
    height: 280,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  cameraIconContainer: {
    marginBottom: 16,
  },
  noImagesTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    textAlign: "center",
  },
  noImagesSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  initialImageOptions: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  imageOptionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    minWidth: 120,
    justifyContent: "center",
  },
  cameraButton: {
    backgroundColor: "#3B82F6",
  },
  galleryButton: {
    backgroundColor: "#10B981",
  },
  multipleButton: {
    backgroundColor: "#8B5CF6",
  },
  imageOptionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  
  // Has Images State
  imagesContainer: {
    gap: 24,
  },
  mainImageSection: {
    alignItems: "center",
    marginBottom: 8,
  },
  mainImageLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
    textAlign: "center",
  },
  mainImageFrame: {
    position: "relative",
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 15,
    backgroundColor: "#FFFFFF",
  },
  mainImage: {
    width: "100%",
    height: 280,
    backgroundColor: "#F3F4F6",
  },
  mainImageControls: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  imageControlButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    gap: 8,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    minWidth: 120,
    justifyContent: "center",
  },
  editControlButton: {
    backgroundColor: "rgba(59, 130, 246, 0.95)",
  },
  deleteControlButton: {
    backgroundColor: "rgba(239, 68, 68, 0.95)",
  },
  controlButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  
  // Image List Section
  imageListSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  imageListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  imageListTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  addImageSmallButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  addImageSmallText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "600",
  },
  imageScrollContainer: {
    marginHorizontal: -4,
  },
  imageScrollContent: {
    paddingHorizontal: 4,
  },
  imageListItem: {
    width: 140,
    marginRight: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  imageListItemMain: {
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
  },
  imageListThumbnailContainer: {
    position: "relative",
    marginBottom: 8,
  },
  imageListThumbnail: {
    width: "100%",
    height: 80,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  mainBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#10B981",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mainBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  imageListControls: {
    gap: 6,
  },
  imageListButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  setMainButton: {
    backgroundColor: "#10B981",
  },
  editButton: {
    backgroundColor: "#3B82F6",
  },
  deleteButton: {
    backgroundColor: "#EF4444",
  },
  imageListButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  
  // Legacy styles (keeping for compatibility)
  addImageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#3B82F6",
    borderStyle: "dashed",
    marginBottom: 16,
  },
  addImageText: {
    fontSize: 16,
    color: "#3B82F6",
    fontWeight: "600",
  },
  imageGalleryContainer: {
    marginTop: 8,
  },
  galleryTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  imageGallery: {
    paddingHorizontal: 4,
  },
  imageItem: {
    marginRight: 12,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mainImageItem: {
    borderWidth: 3,
    borderColor: "#10B981",
  },
  imageContainer: {
    position: "relative",
    width: 120,
    height: 120,
  },
  shopImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  imageControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 8,
    gap: 6,
  },
  controlButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 40,
    alignItems: "center",
  },
  mainButton: {
    backgroundColor: "#3B82F6",
    flex: 1,
  },
  removeButton: {
    backgroundColor: "#EF4444",
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  imageHint: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 12,
    fontStyle: "italic",
  },
  
  // Delivery styles
  statusButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  statusButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  statusButtonOpen: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  statusButtonClosed: {
    backgroundColor: "#EF4444",
    borderColor: "#EF4444",
  },
  statusButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  statusButtonTextSelected: {
    color: "#FFFFFF",
  },
});
