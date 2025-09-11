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
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import { Video, Audio } from "expo-av";
import { useMutation, useQuery, useAction } from "convex/react";
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface AdvertisementModalProps {
  visible: boolean;
  onClose: () => void;
  shopId: Id<"shops">;
  shopOwnerId: Id<"users">;
  shopLocation: { lat: number; lng: number };
  editingAdvertisement?: any; // For editing from history
}

export default function AdvertisementModal({ 
  visible, 
  onClose, 
  shopId, 
  shopOwnerId,
  shopLocation,
  editingAdvertisement
}: AdvertisementModalProps) {
  const [message, setMessage] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [imageIds, setImageIds] = useState<Id<"_storage">[]>([]);
  const [videoIds, setVideoIds] = useState<Id<"_storage">[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [existingVideoUrls, setExistingVideoUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState("");
  const [discountText, setDiscountText] = useState("");

  const createAdvertisement = useMutation(api.advertisements.createAdvertisement);
  const updateAdvertisement = useMutation(api.advertisements.updateAdvertisement);
  const deleteAdvertisement = useMutation(api.advertisements.deleteAdvertisement);
  const sendNotifications = useMutation(api.advertisements.sendNotificationsToNearbyUsers);
  const sendPushNotifications = useAction(api.advertisements.sendPushNotificationToNearbyUsers);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const convex = useConvex();

  // Function to load existing media URLs using Convex
  const loadExistingMedia = async () => {
    if (!imageIds.length && !videoIds.length) {
      setExistingImageUrls([]);
      setExistingVideoUrls([]);
      return;
    }

    try {
      // Load image URLs
      const imageUrlPromises = imageIds.map(async (id) => {
        try {
          const url = await convex.query(api.files.getFileUrl, { storageId: id });
          return url;
        } catch (error) {
          console.error('Error loading image URL:', error);
          return null;
        }
      });

      // Load video URLs
      const videoUrlPromises = videoIds.map(async (id) => {
        try {
          const url = await convex.query(api.files.getFileUrl, { storageId: id });
          return url;
        } catch (error) {
          console.error('Error loading video URL:', error);
          return null;
        }
      });

      const imageUrls = await Promise.all(imageUrlPromises);
      const videoUrls = await Promise.all(videoUrlPromises);

      setExistingImageUrls(imageUrls.filter(url => url !== null));
      setExistingVideoUrls(videoUrls.filter(url => url !== null));
    } catch (error) {
      console.error('Error loading existing media:', error);
      setExistingImageUrls([]);
      setExistingVideoUrls([]);
    }
  };

  // Effect to load existing media when imageIds or videoIds change
  useEffect(() => {
    if (imageIds.length > 0 || videoIds.length > 0) {
      loadExistingMedia();
    } else {
      setExistingImageUrls([]);
      setExistingVideoUrls([]);
    }
  }, [imageIds, videoIds]);

  useEffect(() => {
    if (editingAdvertisement) {
      setMessage(editingAdvertisement.message);
      // Reset new media arrays
      setImages([]);
      setVideos([]);
      setImageIds(editingAdvertisement.imageIds || []);
      setVideoIds(editingAdvertisement.videoIds || []);
      setHasDiscount(editingAdvertisement.hasDiscount || false);
      setDiscountPercentage(editingAdvertisement.discountPercentage ? editingAdvertisement.discountPercentage.toString() : "");
      setDiscountText(editingAdvertisement.discountText || "");
      console.log('Editing Advertisement:', editingAdvertisement);
    } else {
      resetForm();
    }
  }, [editingAdvertisement, visible]);

  const resetForm = () => {
    setMessage("");
    setImages([]);
    setVideos([]);
    setImageIds([]);
    setVideoIds([]);
    setExistingImageUrls([]);
    setExistingVideoUrls([]);
    setFullscreenImage(null);
    setHasDiscount(false);
    setDiscountPercentage("");
    setDiscountText("");
  };

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== "granted" || mediaStatus !== "granted") {
      Alert.alert(
        "Permissions Required",
        "Please grant camera and photo library permissions to add media."
      );
      return false;
    }
    return true;
  };

  const addImage = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    const options = ["Take Photo", "Choose Photo", "Cancel"];
    
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 2,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            openCamera();
          } else if (buttonIndex === 1) {
            openImageGallery();
          }
        }
      );
    } else {
      Alert.alert(
        "Add Image",
        "Choose an option",
        [
          { text: "Take Photo", onPress: openCamera },
          { text: "Choose Photo", onPress: openImageGallery },
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
        setImages(prev => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const openImageGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri);
        setImages(prev => [...prev, ...newImages]);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select images");
    }
  };

  const checkVideoDuration = async (videoUri: string): Promise<{ isValid: boolean, duration?: number }> => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: videoUri },
        { shouldPlay: false }
      );

      const status = await sound.getStatusAsync();
      await sound.unloadAsync();

      if (status.isLoaded && status.durationMillis) {
        const durationSeconds = status.durationMillis / 1000;
        return {
          isValid: durationSeconds <= 30,
          duration: durationSeconds
        };
      }

      return { isValid: false };
    } catch (error) {
      console.log('Error checking video duration:', error);
      return { isValid: false };
    }
  };

  const addVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "video/*",
        multiple: true,
      });

      if (!result.canceled && result.assets) {
        const validVideos: string[] = [];
        const invalidVideos: { name: string, duration: number }[] = [];

        setLoading(true);

        // Check duration for each video
        for (const asset of result.assets) {
          try {
            const { isValid, duration } = await checkVideoDuration(asset.uri);
            
            if (isValid) {
              validVideos.push(asset.uri);
            } else {
              invalidVideos.push({
                name: asset.name || 'Unknown video',
                duration: duration || 0
              });
            }
          } catch (error) {
            console.log('Error validating video:', error);
            invalidVideos.push({
              name: asset.name || 'Unknown video',
              duration: 0
            });
          }
        }

        setLoading(false);

        if (validVideos.length > 0) {
          setVideos(prev => [...prev, ...validVideos]);
        }

        if (invalidVideos.length > 0) {
          const invalidVideosList = invalidVideos
            .map(video => `• ${video.name} (${video.duration > 0 ? `${Math.round(video.duration)}s` : 'Unknown duration'})`)
            .join('\n');

          Alert.alert(
            "Video Duration Limit Exceeded",
            `The following videos exceed the 30-second limit and were not added:\n\n${invalidVideosList}\n\nPlease select videos that are 30 seconds or shorter.`,
            [{ text: "OK" }]
          );
        }

        if (validVideos.length === 0 && invalidVideos.length > 0) {
          Alert.alert(
            "No Valid Videos Selected",
            "All selected videos exceed the 30-second limit. Please choose shorter videos for your advertisement.",
            [{ text: "OK" }]
          );
        } else if (validVideos.length > 0) {
          Alert.alert(
            "Videos Added Successfully",
            `${validVideos.length} video${validVideos.length > 1 ? 's' : ''} added to your advertisement.`,
            [{ text: "OK" }]
          );
        }
      }
    } catch (error) {
      setLoading(false);
      Alert.alert("Error", "Failed to select videos. Please try again.");
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    setVideos(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setImageIds(prev => prev.filter((_, i) => i !== index));
    setExistingImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingVideo = (index: number) => {
    setVideoIds(prev => prev.filter((_, i) => i !== index));
    setExistingVideoUrls(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFile = async (uri: string): Promise<Id<"_storage"> | null> => {
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
      console.error("File upload error:", error);
      return null;
    }
  };

  const handleDeleteAdvertisement = async () => {
    if (!editingAdvertisement) return;

    Alert.alert(
      "Delete Advertisement",
      "Are you sure you want to delete this advertisement?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await deleteAdvertisement({ advertisementId: editingAdvertisement._id });
              resetForm();
              onClose();
              Alert.alert("Success", "Advertisement deleted successfully!");
            } catch (error) {
              Alert.alert("Error", "Failed to delete advertisement");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSaveAdvertisement = async () => {
    if (!message.trim()) {
      Alert.alert("Error", "Please enter a message");
      return;
    }

    // Validate discount fields if discount is enabled
    if (hasDiscount && (!discountPercentage.trim() && !discountText.trim())) {
      Alert.alert(
        "Please enter the discount", 
        "You have enabled discount option. Please enter either discount percentage or discount text, or disable the discount option to proceed without discount."
      );
      return;
    }

    if (editingAdvertisement) {
      // For editing, save immediately without terms
      await saveAdvertisementData();
    } else {
      // For new advertisements, show terms first
      setShowTerms(true);
    }
  };

  const saveAdvertisementData = async () => {
    // Validate discount fields if discount is enabled
    if (hasDiscount && (!discountPercentage.trim() && !discountText.trim())) {
      Alert.alert(
        "Please enter the discount", 
        "You have enabled discount option. Please enter either discount percentage or discount text, or disable the discount option to proceed without discount."
      );
      return;
    }

    setLoading(true);
    try {
      // Upload new images
      const uploadedImageIds: Id<"_storage">[] = [];
      for (const imageUri of (images || [])) {
        const imageId = await uploadFile(imageUri);
        if (imageId) uploadedImageIds.push(imageId);
      }

      // Upload new videos
      const uploadedVideoIds: Id<"_storage">[] = [];
      for (const videoUri of (videos || [])) {
        const videoId = await uploadFile(videoUri);
        if (videoId) uploadedVideoIds.push(videoId);
      }

      // Combine existing IDs (after removals) with new uploaded IDs
      const finalImageIds = [...(imageIds || []), ...uploadedImageIds];
      const finalVideoIds = [...(videoIds || []), ...uploadedVideoIds];

      if (editingAdvertisement) {
        // Update existing advertisement
        await updateAdvertisement({
          advertisementId: editingAdvertisement._id,
          message: message.trim(),
          imageIds: finalImageIds.length > 0 ? finalImageIds : undefined,
          videoIds: finalVideoIds.length > 0 ? finalVideoIds : undefined,
          hasDiscount: hasDiscount,
          discountPercentage: hasDiscount && discountPercentage ? parseInt(discountPercentage) : undefined,
          discountText: hasDiscount && discountText.trim() ? discountText.trim() : undefined,
        });
        Alert.alert("Success", "Advertisement updated successfully!");
        resetForm();
        onClose();
      } else {
        // Create new advertisement
        const advertisementId = await createAdvertisement({
          shopId,
          shopOwnerId,
          message: message.trim(),
          imageIds: finalImageIds.length > 0 ? finalImageIds : undefined,
          videoIds: finalVideoIds.length > 0 ? finalVideoIds : undefined,
          hasDiscount: hasDiscount,
          discountPercentage: hasDiscount && discountPercentage ? parseInt(discountPercentage) : undefined,
          discountText: hasDiscount && discountText.trim() ? discountText.trim() : undefined,
        });

        // Send push notifications to nearby users (5km radius)
        try {
          const pushResult = await sendPushNotifications({
            advertisementId,
            shopId,
            shopLat: shopLocation.lat,
            shopLng: shopLocation.lng,
            radiusKm: 5,
          });

          if (pushResult.success) {
            Alert.alert(
              "Success!", 
              `Advertisement created and push notifications sent to ${pushResult.sentCount} nearby users!${
                (pushResult.nearbyUsersCount && pushResult.enabledUsersCount && pushResult.nearbyUsersCount > pushResult.enabledUsersCount)
                  ? ` (${pushResult.nearbyUsersCount - pushResult.enabledUsersCount} users don't have notifications enabled)` 
                  : ''
              }`
            );
          } else {
            Alert.alert(
              "Partial Success", 
              `Advertisement created but failed to send push notifications: ${pushResult.error}`
            );
          }
        } catch (error) {
          console.error('Push notification error:', error);
          Alert.alert(
            "Partial Success", 
            "Advertisement created but failed to send push notifications. Please check your internet connection."
          );
        }

        // Also send in-app notifications (existing system)
        try {
          await sendNotifications({
            advertisementId,
            shopLat: shopLocation.lat,
            shopLng: shopLocation.lng,
            radiusKm: 5,
          });
        } catch (error) {
          console.error('In-app notification error:', error);
        }

        resetForm();
        onClose();
      }
    } catch (error) {
      Alert.alert("Error", "Failed to save advertisement");
    } finally {
      setLoading(false);
    }
  };

  const handleNotifyLocals = () => {
    // For editing mode - just show terms for re-notification
    setShowTerms(true);
  };

  const handleAcceptTerms = async () => {
    setShowTerms(false);
    
    if (editingAdvertisement) {
      // For editing mode - send push notifications
      setLoading(true);
      try {
        const pushResult = await sendPushNotifications({
          advertisementId: editingAdvertisement._id,
          shopId,
          shopLat: shopLocation.lat,
          shopLng: shopLocation.lng,
          radiusKm: 5,
        });

        if (pushResult.success) {
          Alert.alert(
            "Success!",
            `Push notifications sent to ${pushResult.sentCount} nearby users!${
              (pushResult.nearbyUsersCount && pushResult.enabledUsersCount && pushResult.nearbyUsersCount > pushResult.enabledUsersCount)
                ? ` (${pushResult.nearbyUsersCount - pushResult.enabledUsersCount} users don't have notifications enabled)` 
                : ''
            }`
          );
        } else {
          Alert.alert(
            "Error", 
            `Failed to send push notifications: ${pushResult.error}`
          );
        }

        // Also send in-app notifications
        try {
          const notificationResult = await sendNotifications({
            advertisementId: editingAdvertisement._id,
            shopLat: shopLocation.lat,
            shopLng: shopLocation.lng,
            radiusKm: 5,
          });
        } catch (error) {
          console.error('In-app notification error:', error);
        }

      } catch (error) {
        console.error('Push notification error:', error);
        Alert.alert("Error", "Failed to send notifications");
      } finally {
        setLoading(false);
      }
    } else {
      // For new advertisements - save and notify
      await saveAdvertisementData();
    }
  };

  const TermsModal = () => (
    <Modal
      visible={showTerms}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowTerms(false)}
    >
      <View style={styles.termsOverlay}>
        <View style={styles.termsContainer}>
          <Text style={styles.termsTitle}>Terms and Conditions</Text>
          <ScrollView style={styles.termsContent}>
            <Text style={styles.termsText}>
              By clicking "I Agree", you acknowledge that:
              {"\n\n"}
              {editingAdvertisement ? (
                <>
                  1. Your existing advertisement will be re-sent to all users within 5km radius of your shop.
                  {"\n\n"}
                  2. Users who have already received this advertisement may receive it again.
                  {"\n\n"}
                  3. You are responsible for not spamming users with excessive notifications.
                  {"\n\n"}
                  4. You agree to comply with local advertising regulations.
                  {"\n\n"}
                  5. The notification service is provided as-is without guarantees.
                </>
              ) : (
                <>
                  1. Your advertisement will be created and automatically sent to all users within 5km radius of your shop.
                  {"\n\n"}
                  2. You are responsible for the content of your advertisement.
                  {"\n\n"}
                  3. Inappropriate or misleading content may result in account suspension.
                  {"\n\n"}
                  4. You agree to comply with local advertising regulations.
                  {"\n\n"}
                  5. The notification service is provided as-is without guarantees.
                  {"\n\n"}
                  6. Once created, your advertisement will be immediately distributed to nearby customers.
                </>
              )}
            </Text>
          </ScrollView>
          <View style={styles.termsButtons}>
            <TouchableOpacity
              style={styles.termsDeclineButton}
              onPress={() => setShowTerms(false)}
            >
              <Text style={styles.termsDeclineText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.termsAcceptButton}
              onPress={handleAcceptTerms}
            >
              <Text style={styles.termsAcceptText}>I Agree</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView 
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.title}>
              {editingAdvertisement ? "Edit Advertisement" : "Create Advertisement"}
            </Text>
            {editingAdvertisement && (
              <TouchableOpacity 
                onPress={handleDeleteAdvertisement} 
                disabled={loading}
                style={styles.deleteButton}
              >
                <Ionicons name="trash" size={24} color="#DC2626" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.form}>
              {/* Message Section */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Advertisement Message *</Text>
                <TextInput
                  style={[styles.input, styles.messageInput]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Enter your advertisement message..."
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Images Section */}
              <View style={styles.mediaSection}>
                <View style={styles.mediaSectionHeader}>
                  <Text style={styles.label}>Photos</Text>
                  <TouchableOpacity style={styles.addMediaButton} onPress={addImage}>
                    <Ionicons name="camera" size={20} color="#2563EB" />
                    <Text style={styles.addMediaButtonText}>Add Photos</Text>
                  </TouchableOpacity>
                </View>
                
                {((existingImageUrls?.length > 0) || (images?.length > 0)) && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.mediaContainer}>
                      {/* Existing Images */}
                      {existingImageUrls?.map((imageUrl, index) => (
                        imageUrl && (
                          <View key={`existing-${index}`} style={styles.mediaItem}>
                            <TouchableOpacity
                              activeOpacity={0.8}
                              onPress={() => setFullscreenImage(imageUrl)}
                            >
                              <Image source={{ uri: imageUrl }} style={styles.mediaPreview} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.removeMediaButton}
                              onPress={() => removeExistingImage(index)}
                            >
                              <Ionicons name="close-circle" size={20} color="#DC2626" />
                            </TouchableOpacity>
                            <View style={styles.existingMediaBadge}>
                              <Text style={styles.existingMediaText}>Saved</Text>
                            </View>
                            <View style={styles.expandIndicator}>
                              <Ionicons name="expand" size={16} color="#FFFFFF" />
                            </View>
                          </View>
                        )
                      ))}
                      {/* New Images */}
                      {images?.map((imageUri, index) => (
                        <View key={`new-${index}`} style={styles.mediaItem}>
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => setFullscreenImage(imageUri)}
                          >
                            <Image source={{ uri: imageUri }} style={styles.mediaPreview} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.removeMediaButton}
                            onPress={() => removeImage(index)}
                          >
                            <Ionicons name="close-circle" size={20} color="#DC2626" />
                          </TouchableOpacity>
                          <View style={styles.expandIndicator}>
                            <Ionicons name="expand" size={16} color="#FFFFFF" />
                          </View>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </View>

              {/* Videos Section */}
              <View style={styles.mediaSection}>
                <View style={styles.mediaSectionHeader}>
                  <Text style={styles.label}>Videos</Text>
                  <TouchableOpacity style={styles.addMediaButton} onPress={addVideo}>
                    <Ionicons name="videocam" size={20} color="#2563EB" />
                    <Text style={styles.addMediaButtonText}>Add Videos</Text>
                  </TouchableOpacity>
                </View>
                
                {/* Video Duration Limit Notice */}
                <View style={styles.durationLimitNotice}>
                  <Ionicons name="time-outline" size={16} color="#F59E0B" />
                  <Text style={styles.durationLimitText}>
                    Videos must be 30 seconds or shorter
                  </Text>
                </View>
                
                {((existingVideoUrls?.length > 0) || (videos?.length > 0)) && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.mediaContainer}>
                      {/* Existing Videos */}
                      {existingVideoUrls?.map((videoUrl, index) => (
                        <View key={`existing-video-${index}`} style={styles.mediaItem}>
                          <View style={styles.videoPreview}>
                            <Ionicons name="play-circle" size={40} color="#FFFFFF" />
                            <Text style={styles.videoText}>Video {index + 1}</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.removeMediaButton}
                            onPress={() => removeExistingVideo(index)}
                          >
                            <Ionicons name="close-circle" size={20} color="#DC2626" />
                          </TouchableOpacity>
                          <View style={styles.existingMediaBadge}>
                            <Text style={styles.existingMediaText}>Saved</Text>
                          </View>
                        </View>
                      ))}
                      {/* New Videos */}
                      {videos?.map((videoUri, index) => (
                        <View key={`new-video-${index}`} style={styles.mediaItem}>
                          <View style={styles.videoPreview}>
                            <Ionicons name="play-circle" size={40} color="#FFFFFF" />
                            <Text style={styles.videoText}>Video {(existingVideoUrls?.length || 0) + index + 1}</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.removeMediaButton}
                            onPress={() => removeVideo(index)}
                          >
                            <Ionicons name="close-circle" size={20} color="#DC2626" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </View>

              {/* Discount Section */}
              <View style={styles.discountSection}>
                <View style={styles.discountHeader}>
                  <Text style={styles.label}>Special Discount (Optional)</Text>
                  <TouchableOpacity
                    style={styles.discountToggle}
                    onPress={() => setHasDiscount(!hasDiscount)}
                  >
                    <View style={[styles.toggleCircle, hasDiscount && styles.toggleActive]}>
                      {hasDiscount && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                    </View>
                    <Text style={[styles.toggleText, hasDiscount && styles.toggleTextActive]}>
                      {hasDiscount ? "Discount Enabled" : "Enable Discount"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {hasDiscount && (
                  <View style={styles.discountForm}>
                    <View style={styles.discountInputRow}>
                      <View style={styles.percentageInput}>
                        <Text style={styles.discountLabel}>Discount %</Text>
                        <TextInput
                          style={styles.percentageField}
                          value={discountPercentage}
                          onChangeText={(text) => {
                            // Only allow numbers and limit to 99
                            const numericText = text.replace(/[^0-9]/g, '');
                            if (parseInt(numericText) <= 99 || numericText === '') {
                              setDiscountPercentage(numericText);
                            }
                          }}
                          placeholder="10"
                          keyboardType="numeric"
                          maxLength={2}
                        />
                        <Text style={styles.percentSymbol}>%</Text>
                      </View>
                    </View>

                    <View style={styles.discountInputGroup}>
                      <Text style={styles.discountLabel}>Discount Description (Optional)</Text>
                      <TextInput
                        style={styles.discountTextInput}
                        value={discountText}
                        onChangeText={setDiscountText}
                        placeholder="e.g., 'Buy 2 Get 1 Free', 'Flash Sale', 'Limited Time Offer'"
                        multiline
                        numberOfLines={2}
                        textAlignVertical="top"
                      />
                    </View>

                    <View style={styles.discountPreview}>
                      <Text style={styles.previewLabel}>Preview:</Text>
                      <View style={styles.previewBadge}>
                        <Ionicons name="pricetag" size={16} color="#FFFFFF" />
                        <Text style={styles.previewText}>
                          {discountPercentage ? `${discountPercentage}% OFF` : 'XX% OFF'}
                          {discountText ? ` • ${discountText}` : ''}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.buttonDisabled]}
              onPress={handleSaveAdvertisement}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? "Processing..." : editingAdvertisement ? "Update Advertisement" : "Create & Notify"}
              </Text>
            </TouchableOpacity>

            {editingAdvertisement && (
              <TouchableOpacity
                style={[styles.notifyButton, loading && styles.buttonDisabled]}
                onPress={handleNotifyLocals}
                disabled={loading}
              >
                <Ionicons name="notifications" size={20} color="#FFFFFF" />
                <Text style={styles.notifyButtonText}>Notify Locals (5km)</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <TermsModal />

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <Modal
          visible={!!fullscreenImage}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setFullscreenImage(null)}
        >
          <View style={styles.fullscreenContainer}>
            <TouchableOpacity 
              style={styles.fullscreenCloseButton}
              onPress={() => setFullscreenImage(null)}
            >
              <Ionicons name="close" size={30} color="#FFFFFF" />
            </TouchableOpacity>
            <ScrollView
              style={styles.fullscreenScrollView}
              contentContainerStyle={styles.fullscreenScrollContent}
              maximumZoomScale={3}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
            >
              <Image 
                source={{ uri: fullscreenImage }} 
                style={styles.fullscreenImage}
                contentFit="contain"
              />
            </ScrollView>
            <View style={styles.fullscreenHint}>
              <Text style={styles.fullscreenHintText}>Pinch to zoom • Tap to close</Text>
            </View>
          </View>
        </Modal>
      )}
    </>
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
  deleteButton: {
    padding: 4,
    borderRadius: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  form: {
    paddingVertical: 20,
    gap: 24,
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
  messageInput: {
    minHeight: 120,
  },
  mediaSection: {
    gap: 12,
  },
  mediaSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addMediaButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    gap: 6,
  },
  addMediaButtonText: {
    fontSize: 14,
    color: "#2563EB",
    fontWeight: "500",
  },
  durationLimitNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  durationLimitText: {
    fontSize: 12,
    color: "#F59E0B",
    fontWeight: "500",
    flex: 1,
  },
  mediaContainer: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 8,
  },
  mediaItem: {
    position: "relative",
  },
  mediaPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  videoPreview: {
    width: 100,
    height: 100,
    backgroundColor: "#374151",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  videoText: {
    color: "#FFFFFF",
    fontSize: 12,
    marginTop: 4,
  },
  removeMediaButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
  },
  existingMediaBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "rgba(22, 163, 74, 0.9)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  existingMediaText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  expandIndicator: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 12,
    padding: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 12,
  },
  saveButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  notifyButton: {
    backgroundColor: "#16A34A",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  notifyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  
  // Terms Modal Styles
  termsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  termsContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxHeight: "80%",
  },
  termsTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
    textAlign: "center",
  },
  termsContent: {
    maxHeight: 300,
    marginBottom: 20,
  },
  termsText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  termsButtons: {
    flexDirection: "row",
    gap: 12,
  },
  termsDeclineButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    alignItems: "center",
  },
  termsDeclineText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6B7280",
  },
  termsAcceptButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#16A34A",
    borderRadius: 8,
    alignItems: "center",
  },
  termsAcceptText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  
  // Fullscreen Image Modal Styles
  fullscreenContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenCloseButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 1000,
    padding: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 25,
  },
  fullscreenScrollView: {
    flex: 1,
    width: "100%",
  },
  fullscreenScrollContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: Dimensions.get('window').height,
  },
  fullscreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.8,
    maxWidth: "100%",
    maxHeight: "100%",
  },
  fullscreenHint: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  fullscreenHintText: {
    color: "#FFFFFF",
    fontSize: 14,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    textAlign: "center",
  },

  // Discount Section Styles
  discountSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  discountHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  discountToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toggleCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleActive: {
    backgroundColor: "#10B981",
  },
  toggleText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  toggleTextActive: {
    color: "#10B981",
    fontWeight: "600",
  },
  discountForm: {
    gap: 16,
  },
  discountInputRow: {
    flexDirection: "row",
    gap: 12,
  },
  percentageInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  discountLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  percentageField: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    textAlign: "center",
  },
  percentSymbol: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  discountInputGroup: {
    gap: 8,
  },
  discountTextInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    minHeight: 60,
  },
  discountPreview: {
    gap: 8,
    alignItems: "flex-start",
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
  },
  previewBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EF4444",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  previewText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
