import React, { useState } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import AddressInput from "../common/AddressInput";
import { FlexibleImagePicker } from "../common/FlexibleImagePicker";
import { ImageOptimizer } from "../../utils/imageOptimizer";

interface AddShopModalProps {
  visible: boolean;
  onClose: () => void;
  ownerUid: Id<"users">;
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

export default function AddShopModal({ visible, onClose, ownerUid }: AddShopModalProps) {
  const [shopName, setShopName] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [openingHours, setOpeningHours] = useState("");
  const [openingMinutes, setOpeningMinutes] = useState("");
  const [openingPeriod, setOpeningPeriod] = useState("AM");
  const [closingHours, setClosingHours] = useState("");
  const [closingMinutes, setClosingMinutes] = useState("");
  const [closingPeriod, setClosingPeriod] = useState("PM");
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [deliveryRange, setDeliveryRange] = useState("");

  const createShop = useMutation(api.shops.createShop);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  // Helper function to convert AM/PM time to 24-hour format
  const formatTimeFor24Hour = (hours: string, minutes: string, period: string) => {
    let hour = parseInt(hours, 10);
    const minute = parseInt(minutes, 10);
    
    if (period === 'PM' && hour !== 12) {
      hour += 12;
    } else if (period === 'AM' && hour === 12) {
      hour = 0;
    }
    
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const showImagePicker = async () => {
    if (imageUris.length >= 10) {
      Alert.alert("Limit Reached", "You can add maximum 10 photos per shop");
      return;
    }

    try {
      const images = await FlexibleImagePicker.pickShopPhoto({
        quality: 0.8,
        selectionLimit: 10 - imageUris.length,
      });

      if (images.length > 0) {
        const newUris = images.map(img => img.uri);
        setImageUris(prev => [...prev, ...newUris]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert("Error", "Failed to select images");
    }
  };

  const addMorePhotos = async () => {
    if (imageUris.length >= 10) {
      Alert.alert("Limit Reached", "You can add maximum 10 photos per shop");
      return;
    }

    try {
      const images = await FlexibleImagePicker.pickShopPhoto({
        quality: 0.8,
        selectionLimit: 10 - imageUris.length,
      });

      if (images.length > 0) {
        const newUris = images.map(img => img.uri);
        setImageUris(prev => [...prev, ...newUris]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert("Error", "Failed to select images");
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImageUris(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const editImage = async (indexToEdit: number) => {
    try {
      const image = await FlexibleImagePicker.pickImage({
        quality: 0.8,
        cropEnabled: true,
      });

      if (image) {
        setImageUris(prev => prev.map((uri, index) => 
          index === indexToEdit ? image.uri : uri
        ));
      }
    } catch (error) {
      console.error('Error editing image:', error);
      Alert.alert("Error", "Failed to edit image");
    }
  };

  const convertTo24Hour = (hours: string, period: string): number => {
    let hour = parseInt(hours);
    if (isNaN(hour) || hour < 1 || hour > 12) return 0;
    
    if (period === "AM") {
      return hour === 12 ? 0 : hour;
    } else {
      return hour === 12 ? 12 : hour + 12;
    }
  };

  const uploadImage = async (uri: string): Promise<Id<"_storage"> | null> => {
    try {
      // Optimize image before uploading
      console.log('Optimizing shop image...');
      const optimizedUri = await ImageOptimizer.optimizeShopImage(uri);
      
      const uploadUrl = await generateUploadUrl();
      
      const response = await fetch(optimizedUri);
      const blob = await response.blob();
      
      console.log(`Uploading optimized shop image (${(blob.size / 1024).toFixed(2)} KB)...`);
      
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await uploadResponse.json();
      console.log('Shop image uploaded successfully');
      return storageId;
    } catch (error) {
      console.error("Image upload error:", error);
      return null;
    }
  };

  const handleSubmit = async () => {
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
      let shopImageIds: Id<"_storage">[] = [];

      // Upload all selected images with progress
      if (imageUris.length > 0) {
        console.log(`Starting upload of ${imageUris.length} shop images...`);
        for (let i = 0; i < imageUris.length; i++) {
          console.log(`Uploading image ${i + 1} of ${imageUris.length}...`);
          const imageId = await uploadImage(imageUris[i]);
          if (imageId) {
            shopImageIds.push(imageId);
          }
        }
        console.log(`Successfully uploaded ${shopImageIds.length} images`);
      }

      // For backward compatibility, set the first image as shopImageId
      const shopImageId = shopImageIds.length > 0 ? shopImageIds[0] : undefined;

      // Don't set estimatedTime for new shops - it should only be used for actual status changes
      // The businessHours field will be used to display regular hours in the shop card
      const estimatedTime = undefined;

      // Format business hours
      const businessHours = openingHours && closingHours ? {
        openTime: formatTimeFor24Hour(openingHours, openingMinutes, openingPeriod),
        closeTime: formatTimeFor24Hour(closingHours, closingMinutes, closingPeriod),
      }:undefined;
      if(businessHours===undefined){
      Alert.alert("Error", "Please fill the business hours in which you operate");
      return;
      }

      // Validate delivery range if delivery is enabled
      if (hasDelivery && (!deliveryRange || isNaN(parseFloat(deliveryRange)) || parseFloat(deliveryRange) <= 0)) {
        Alert.alert("Error", "Please enter a valid delivery range");
        return;
      }

      await createShop({
        ownerUid,
        name: shopName.trim(),
        category: finalCategory,
        location: {
          lat,
          lng,
          address: address.trim(),
        },
        isOpen,
        mobileNumber: mobileNumber.trim(),
        shopImageId,
        shopImageIds: shopImageIds.length > 0 ? shopImageIds : undefined,
        estimatedTime,
        businessHours,
        hasDelivery,
        deliveryRange: hasDelivery ? parseFloat(deliveryRange) : undefined,
      });

      // Reset form
      setShopName("");
      setCategory("");
      setCustomCategory("");
      setAddress("");
      setLatitude("");
      setLongitude("");
      setMobileNumber("");
      setIsOpen(true);
      setOpeningHours("");
      setOpeningMinutes("");
      setOpeningPeriod("AM");
      setClosingHours("");
      setClosingMinutes("");
      setClosingPeriod("PM");
      setImageUris([]);
      setHasDelivery(false);
      setDeliveryRange("");
      
      onClose();
      Alert.alert("Success", "Shop added successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to add shop. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

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
          <Text style={styles.title}>Add New Shop</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            {/* Shop Images Section */}
            <View style={styles.imageSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="camera" size={20} color="#2563EB" />
                  <Text style={styles.sectionTitle}>Shop Photos</Text>
                  {imageUris.length > 0 && (
                    <View style={styles.imageCountBadge}>
                      <Text style={styles.imageCountText}>{imageUris.length}/10</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.sectionSubtitle}>
                  Add high-quality photos to showcase your shop
                </Text>
              </View>
              
              {/* Main Image Preview (First Image) */}
              {imageUris.length > 0 && (
                <View style={styles.mainImagePreview}>
                  <View style={styles.mainImageContainer}>
                    <Image
                      source={{ uri: imageUris[0] }}
                      style={styles.mainImage}
                      contentFit="cover"
                    />
                    <View style={styles.mainImageOverlay}>
                      <Text style={styles.mainImageLabel}>Main Photo</Text>
                    </View>
                    <View style={styles.mainImageActions}>
                      <TouchableOpacity
                        style={styles.editImageButton}
                        onPress={() => editImage(0)}
                      >
                        <Ionicons name="create" size={18} color="#2563EB" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removeMainImageButton}
                        onPress={() => removeImage(0)}
                      >
                        <Ionicons name="close-circle" size={20} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {/* Add Image Button */}
              <TouchableOpacity 
                style={[
                  styles.addImageButton,
                  imageUris.length >= 10 && styles.addImageButtonDisabled,
                  imageUris.length === 0 && styles.addImageButtonPrimary
                ]} 
                onPress={imageUris.length === 0 ? showImagePicker : addMorePhotos}
                disabled={imageUris.length >= 10}
              >
                <View style={styles.addImageIconContainer}>
                  <Ionicons 
                    name={imageUris.length === 0 ? "camera" : "add"} 
                    size={24} 
                    color={imageUris.length >= 10 ? "#9CA3AF" : "#2563EB"} 
                  />
                </View>
                <View style={styles.addImageTextContainer}>
                  <Text style={[
                    styles.addImageTitle,
                    imageUris.length >= 10 && styles.addImageTitleDisabled
                  ]}>
                    {imageUris.length === 0 ? "Add Your First Photo" : "Add More Photos"}
                  </Text>
                  <Text style={[
                    styles.addImageSubtitle,
                    imageUris.length >= 10 && styles.addImageSubtitleDisabled
                  ]}>
                    {imageUris.length === 0 
                      ? "Show customers what your shop looks like" 
                      : `${10 - imageUris.length} more photos allowed`
                    }
                  </Text>
                </View>
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color={imageUris.length >= 10 ? "#9CA3AF" : "#6B7280"} 
                />
              </TouchableOpacity>

              {/* Additional Images Grid */}
              {imageUris.length > 1 && (
                <View style={styles.additionalImagesSection}>
                  <View style={styles.additionalImagesTitleContainer}>
                    <Text style={styles.additionalImagesTitle}>Additional Photos</Text>
                    <Text style={styles.additionalImagesSubtitle}>Tap to edit • First photo is main</Text>
                  </View>
                  <View style={styles.additionalImagesGrid}>
                    {imageUris.slice(1).map((uri, index) => (
                      <TouchableOpacity
                        key={index + 1}
                        style={styles.additionalImageItem}
                        onPress={() => editImage(index + 1)}
                        onLongPress={() => {
                          Alert.alert(
                            "Set as Main Photo",
                            "Do you want to make this your main shop photo?",
                            [
                              { text: "Cancel", style: "cancel" },
                              { 
                                text: "Set as Main", 
                                onPress: () => {
                                  const newImageUris = [...imageUris];
                                  const [movedImage] = newImageUris.splice(index + 1, 1);
                                  newImageUris.unshift(movedImage);
                                  setImageUris(newImageUris);
                                }
                              },
                            ]
                          );
                        }}
                      >
                        <Image
                          source={{ uri }}
                          style={styles.additionalImage}
                          contentFit="cover"
                        />
                        <View style={styles.additionalImageOverlay}>
                          <Ionicons name="create" size={14} color="#FFFFFF" />
                        </View>
                        <TouchableOpacity
                          style={styles.removeAdditionalImageButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            removeImage(index + 1);
                          }}
                        >
                          <Ionicons name="close-circle" size={18} color="#DC2626" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Image Tips */}
              <View style={styles.imageTips}>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                  <Text style={styles.tipText}>Use well-lit, clear photos</Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                  <Text style={styles.tipText}>Show your shop's exterior and interior</Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                  <Text style={styles.tipText}>Include products and signage</Text>
                </View>
              </View>
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
              <TextInput
                style={styles.input}
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
                You can also manually enter them if needed.
              </Text>
            </View>

            <View style={styles.statusContainer}>
              <Text style={styles.label}>Initial Status</Text>
              <View style={styles.statusButtons}>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    isOpen && styles.statusButtonOpen,
                  ]}
                  onPress={() => setIsOpen(true)}
                >
                  <Ionicons 
                    name="checkmark-circle" 
                    size={20} 
                    color={isOpen ? "#FFFFFF" : "#16A34A"} 
                  />
                  <Text style={[
                    styles.statusButtonText,
                    isOpen && styles.statusButtonTextSelected,
                  ]}>
                    Open
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    !isOpen && styles.statusButtonClosed,
                  ]}
                  onPress={() => setIsOpen(false)}
                >
                  <Ionicons 
                    name="close-circle" 
                    size={20} 
                    color={!isOpen ? "#FFFFFF" : "#DC2626"} 
                  />
                  <Text style={[
                    styles.statusButtonText,
                    !isOpen && styles.statusButtonTextSelected,
                  ]}>
                    Closed
                  </Text>
                </TouchableOpacity>
              </View>
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
                      placeholderTextColor="#C4C4C4"
                      keyboardType="numeric"
                      maxLength={2}
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
                      placeholderTextColor="#C4C4C4"
                      keyboardType="numeric"
                      maxLength={2}
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
                      placeholderTextColor="#C4C4C4"
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
                      placeholderTextColor="#C4C4C4"
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
            <View style={styles.businessHoursSection}>
              <Text style={styles.businessHoursLabel}>Delivery Service</Text>
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
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? "Adding Shop..." : "Add Shop"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  form: {
    paddingVertical: 24,
    gap: 24,
  },
  imageSection: {
    gap: 16,
  },
  sectionHeader: {
    gap: 8,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  imageCountBadge: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCountText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  mainImagePreview: {
    alignItems: "center",
  },
  mainImageContainer: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#F9FAFB",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  mainImage: {
    width: "100%",
    height: "100%",
  },
  mainImageOverlay: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(37, 99, 235, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  mainImageLabel: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  mainImageActions: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    gap: 8,
  },
  editImageButton: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  removeMainImageButton: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  addImageButtonPrimary: {
    borderColor: "#2563EB",
    borderWidth: 2,
    backgroundColor: "#EFF6FF",
  },
  addImageIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  addImageTextContainer: {
    flex: 1,
    gap: 4,
  },
  addImageTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  addImageTitleDisabled: {
    color: "#9CA3AF",
  },
  addImageSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 18,
  },
  addImageSubtitleDisabled: {
    color: "#9CA3AF",
  },
  additionalImagesSection: {
    gap: 12,
  },
  additionalImagesTitleContainer: {
    gap: 4,
  },
  additionalImagesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  additionalImagesSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
  },
  additionalImagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  additionalImageItem: {
    position: "relative",
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  additionalImage: {
    width: "100%",
    height: "100%",
  },
  additionalImageOverlay: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 8,
    padding: 2,
  },
  removeAdditionalImageButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 10,
    padding: 1,
  },
  imageTips: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tipText: {
    fontSize: 14,
    color: "#16A34A",
    flex: 1,
    fontWeight: "500",
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  imageCounter: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  addImageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  addImageButtonDisabled: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    opacity: 0.6,
  },
  addImageText: {
    fontSize: 16,
    color: "#2563EB",
    fontWeight: "600",
  },
  addImageTextDisabled: {
    color: "#9CA3AF",
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    width: "100%",
  },
  imageItem: {
    position: "relative",
    width: 120,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
  },
  removeImageButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
  },
  imageContainer: {
    width: 200,
    height: 120,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  shopImage: {
    width: "100%",
    height: "100%",
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
    gap: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    color: "#1F2937",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textArea: {
    minHeight: 80,
  },
  categoryContainer: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryButtonSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
    shadowColor: "#2563EB",
    shadowOpacity: 0.2,
  },
  categoryButtonText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
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
  statusContainer: {
    gap: 8,
  },
  statusButtons: {
    flexDirection: "row",
    gap: 12,
  },
  statusButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statusButtonOpen: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
    shadowColor: "#16A34A",
    shadowOpacity: 0.2,
  },
  statusButtonClosed: {
    backgroundColor: "#DC2626",
    borderColor: "#DC2626",
    shadowColor: "#DC2626",
    shadowOpacity: 0.2,
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  statusButtonTextSelected: {
    color: "#FFFFFF",
  },
  businessHoursSection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  businessHoursLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 12,
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
    color: "#806b6bff",
    marginBottom: 4,
  },
  timeInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    color: "#1F2937",
    textAlign: "center",
    minWidth: 70,
    fontWeight: "600",
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
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    minWidth: 60,
    alignItems: "center",
  },
  periodButtonSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  periodButtonText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "700",
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
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  submitButton: {
    backgroundColor: "#2563EB",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
});