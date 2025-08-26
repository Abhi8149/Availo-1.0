import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ScrollView,
  Alert,
  Dimensions,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import AdvertisementImage from "../common/AdvertisementImage";
import { Video, ResizeMode } from 'expo-av';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  userId: Id<"users">;
  onViewShop: (shopId: Id<"shops">) => void;
}

export default function NotificationsModal({ 
  visible, 
  onClose, 
  userId, 
  onViewShop 
}: NotificationsModalProps) {
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [fullscreenImageId, setFullscreenImageId] = useState<Id<"_storage"> | null>(null);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<Id<"_storage"> | null>(null);
  
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const notifications = useQuery(api.advertisements.getNotificationsByUser, { 
    userId 
  });

  const handleImagePress = (imageId: Id<"_storage">) => {
    setFullscreenImageId(imageId);
  };

  const handleVideoPress = (videoId: Id<"_storage">) => {
    setSelectedVideoId(videoId);
    setVideoModalVisible(true);
  };

  // Video Component with Convex URL fetching
  const VideoComponent = ({ videoId, index }: { videoId: Id<"_storage">, index: number }) => {
    return (
      <TouchableOpacity 
        style={styles.videoWrapper} 
        onPress={() => handleVideoPress(videoId)}
        activeOpacity={0.8}
      >
        <View style={styles.videoPlaceholder}>
          <Ionicons name="play-circle" size={48} color="#FFFFFF" />
          <View style={styles.videoOverlay}>
            <Ionicons name="play" size={16} color="#FFFFFF" />
          </View>
        </View>
        <Text style={styles.videoText}>Video {index + 1}</Text>
      </TouchableOpacity>
    );
  };

  const handleNotificationPress = (notification: any) => {
    setSelectedNotification(notification);
  };

  const handleBackToList = () => {
    setSelectedNotification(null);
  };

  const handleViewShop = () => {
    if (selectedNotification?.advertisement?.shopId) {
      onViewShop(selectedNotification.advertisement.shopId);
      onClose();
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return `${days}d ago`;
    }
  };

  const renderNotificationItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.notificationItem}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationHeader}>
        <View style={styles.notificationInfo}>
          <Text style={styles.shopName}>{item.advertisement?.shop?.name}</Text>
          <Text style={styles.timeAgo}>{formatTimeAgo(item._creationTime)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </View>
      <Text style={styles.notificationMessage} numberOfLines={2}>
        {item.advertisement?.message}
      </Text>
      {(item.advertisement?.imageIds?.length > 0 || item.advertisement?.videoIds?.length > 0) && (
        <View style={styles.mediaIndicator}>
          <Ionicons name="image" size={16} color="#6B7280" />
          <Text style={styles.mediaText}>
            {item.advertisement?.imageIds?.length > 0 ? "Photos" : ""}
            {item.advertisement?.imageIds?.length > 0 && item.advertisement?.videoIds?.length > 0 ? " & " : ""}
            {item.advertisement?.videoIds?.length > 0 ? "Videos" : ""}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderDetailView = () => {
    if (!selectedNotification) return null;

    const advertisement = selectedNotification.advertisement;

    return (
      <ScrollView style={styles.detailContainer}>
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={handleBackToList} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.detailHeaderInfo}>
            <Text style={styles.detailShopName}>{advertisement?.shop?.name}</Text>
            <Text style={styles.detailTimeAgo}>
              {formatTimeAgo(selectedNotification._creationTime)}
            </Text>
          </View>
        </View>

        <View style={styles.detailContent}>
          <Text style={styles.detailMessage}>{advertisement?.message}</Text>

          {/* Images */}
          {advertisement?.imageIds?.length > 0 && (
            <View style={styles.mediaSection}>
              <Text style={styles.mediaSectionTitle}>Photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.mediaContainer}>
                  {advertisement.imageIds.map((imageId: Id<"_storage">, index: number) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleImagePress(imageId)}
                      style={styles.imageWrapper}
                      activeOpacity={0.8}
                    >
                      <AdvertisementImage
                        imageId={imageId}
                        style={styles.notificationImage}
                      />
                      <View style={styles.imageOverlay}>
                        <Ionicons name="expand" size={16} color="#FFFFFF" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Videos */}
          {advertisement?.videoIds?.length > 0 && (
            <View style={styles.mediaSection}>
              <Text style={styles.mediaSectionTitle}>Videos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.mediaContainer}>
                  {advertisement.videoIds.map((videoId: Id<"_storage">, index: number) => (
                    <VideoComponent key={index} videoId={videoId} index={index} />
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          <TouchableOpacity style={styles.shopDetailsButton} onPress={handleViewShop}>
            <Ionicons name="storefront" size={20} color="#FFFFFF" />
            <Text style={styles.shopDetailsButtonText}>Shop Details</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // Video Player Modal Component
  const VideoPlayerModal = () => {
    const videoUrl = useQuery(
      api.files.getFileUrl, 
      selectedVideoId ? { storageId: selectedVideoId } : "skip"
    );

    const handleCloseVideo = () => {
      setVideoModalVisible(false);
      setSelectedVideoId(null);
    };

    if (!selectedVideoId) {
      return null;
    }

    return (
      <Modal
        visible={videoModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseVideo}
      >
        <View style={styles.videoModalContainer}>
          <TouchableOpacity 
            style={styles.videoModalCloseButton}
            onPress={handleCloseVideo}
          >
            <Ionicons name="close" size={30} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.videoPlayerContainer}>
            {videoUrl ? (
              <Video
                source={{ uri: videoUrl }}
                style={styles.videoPlayer}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                isLooping={false}
                shouldPlay={true}
              />
            ) : (
              <View style={styles.videoLoadingContainer}>
                <Ionicons name="refresh" size={48} color="#FFFFFF" />
                <Text style={styles.videoLoadingText}>Loading video...</Text>
              </View>
            )}
          </View>
          
          <View style={styles.videoPlayerHint}>
            <Text style={styles.videoPlayerHintText}>
              Tap outside to close
            </Text>
          </View>
        </View>
      </Modal>
    );
  };

  // Fullscreen Image Modal Component
  const FullscreenImageModal = () => (
    <Modal
      visible={fullscreenImageId !== null}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setFullscreenImageId(null)}
    >
      <View style={styles.fullscreenContainer}>
        <TouchableOpacity 
          style={styles.fullscreenCloseButton}
          onPress={() => setFullscreenImageId(null)}
        >
          <Ionicons name="close" size={30} color="#FFFFFF" />
        </TouchableOpacity>
        
        {fullscreenImageId && (
          <ScrollView
            style={styles.fullscreenScrollView}
            contentContainerStyle={styles.fullscreenScrollContent}
            maximumZoomScale={5}
            minimumZoomScale={1}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.fullscreenImage}>
              <AdvertisementImage 
                imageId={fullscreenImageId} 
                showOriginalSize={true}
                contentFit="contain"
              />
            </View>
          </ScrollView>
        )}
        
        {/* Zoom Hint */}
        <View style={styles.fullscreenHint}>
          <Text style={styles.fullscreenHintText}>
            Pinch to zoom • Double tap to zoom • Tap outside to close
          </Text>
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
        <View style={styles.container}>
          {!selectedNotification ? (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Notifications</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {notifications === undefined ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading notifications...</Text>
                </View>
              ) : notifications?.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="notifications-outline" size={64} color="#9CA3AF" />
                  <Text style={styles.emptyTitle}>No notifications yet</Text>
                  <Text style={styles.emptySubtitle}>
                    You'll receive notifications when nearby shops post advertisements
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={notifications}
                  renderItem={renderNotificationItem}
                  keyExtractor={(item) => item._id}
                  contentContainerStyle={styles.listContainer}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </>
          ) : (
            renderDetailView()
          )}
        </View>
      </Modal>

      {/* Fullscreen Image Modal */}
      <FullscreenImageModal />
      
      {/* Video Player Modal */}
      <VideoPlayerModal />
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
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  listContainer: {
    padding: 16,
  },
  notificationItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  notificationInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  timeAgo: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  notificationMessage: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
    marginBottom: 8,
  },
  mediaIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mediaText: {
    fontSize: 12,
    color: "#6B7280",
  },
  detailContainer: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  detailHeaderInfo: {
    flex: 1,
  },
  detailShopName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  detailTimeAgo: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  detailContent: {
    padding: 20,
  },
  detailMessage: {
    fontSize: 16,
    color: "#1F2937",
    lineHeight: 24,
    marginBottom: 24,
  },
  mediaSection: {
    marginBottom: 24,
  },
  mediaSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  mediaContainer: {
    flexDirection: "row",
    gap: 12,
  },
  imageWrapper: {
    borderRadius: 12,
    overflow: "hidden",
  },
  notificationImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  videoWrapper: {
    alignItems: "center",
  },
  videoPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: "#1F2937",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  videoText: {
    fontSize: 12,
    color: "#6B7280",
  },
  videoOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 12,
    padding: 4,
  },
  shopDetailsButton: {
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
  },
  shopDetailsButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  
  // Image overlay styles
  imageOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 12,
    padding: 4,
  },
  
  // Enhanced Fullscreen Image Modal Styles
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
    borderRadius: 8,
    overflow: "hidden",
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
  
  // Video Player Modal Styles
  videoModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  videoModalCloseButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 1000,
    padding: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 25,
  },
  videoPlayerContainer: {
    width: "95%",
    height: "60%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000000",
  },
  videoPlayer: {
    width: "100%",
    height: "100%",
  },
  videoLoadingContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
  },
  videoLoadingText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginTop: 12,
  },
  videoPlayerHint: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  videoPlayerHintText: {
    color: "#FFFFFF",
    fontSize: 14,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    textAlign: "center",
  },
});
