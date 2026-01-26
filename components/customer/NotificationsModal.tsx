import React, { useState, useEffect, useRef } from "react";
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
import ZoomableAdvertisementImage from "../common/ZoomableAdvertisementImage";
import { Video, ResizeMode } from "expo-av";

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  userId: Id<"users">;
  onViewShop: (shopId: Id<"shops">) => void;
  targetAdvertisementId?: Id<"advertisements"> | null; // Add this prop to highlight specific advertisement
}

export default function NotificationsModal({
  visible,
  onClose,
  userId,
  onViewShop,
  targetAdvertisementId,
}: NotificationsModalProps) {
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [fullscreenImageId, setFullscreenImageId] = useState<string | null>(
    null,
  );
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
  const notifications = useQuery(api.advertisements.getNotificationsByUser, {
    userId,
  });

  // Auto-scroll to target advertisement when modal opens
  useEffect(() => {
    if (
      visible &&
      targetAdvertisementId &&
      notifications &&
      notifications.length > 0
    ) {
      const targetIndex = notifications.findIndex(
        (notification: any) =>
          notification.advertisement?._id === targetAdvertisementId,
      );

      if (targetIndex >= 0 && flatListRef.current) {
        // Delay scroll to ensure modal is fully rendered
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: targetIndex,
            animated: true,
            viewPosition: 0.2, // Show the target ad at 20% from top
          });
        }, 300);
      }
    }
  }, [visible, targetAdvertisementId, notifications]);

  const handleVideoPress = (videoUrl: string) => {
    setSelectedVideoId(videoUrl);
    setVideoModalVisible(true);
  };

  const handleImagePress = (imageUrl: string) => {
    setFullscreenImageId(imageUrl);
  };

  // Video Component with Convex URL fetching
  const VideoComponent = ({
    videoId,
    index,
  }: {
    videoId: string;
    index: number;
  }) => {
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

  const renderNotificationItem = ({ item }: { item: any }) => {
    // Check if this is the target advertisement to highlight
    const isTargetAd =
      targetAdvertisementId &&
      item.advertisement?._id === targetAdvertisementId;

    return (
      <TouchableOpacity
        style={[
          styles.adCard,
          isTargetAd && styles.targetAdCard, // Add highlight style for target ad
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.8}
      >
        {/* Professional Ad Badge */}
        {/* <View style={[styles.adBadge, isTargetAd && styles.targetAdBadge]}>
          <Ionicons name="megaphone" size={12} color="#FFFFFF" />
          <Text style={styles.adBadgeText}>
            {isTargetAd ? "📍 FROM NOTIFICATION" : "SPECIAL OFFER"}
          </Text>
        </View> */}

        {/* Shop Info Header */}
        <View style={styles.adHeader}>
          <View style={styles.shopInfo}>
            <View style={styles.shopAvatar}>
              <Ionicons name="storefront" size={24} color="#3B82F6" />
            </View>
            <View>
              <Text style={styles.premiumShopName}>
                {item.advertisement?.shop?.name}
              </Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={styles.verifiedText}>Verified Shop</Text>
              </View>
            </View>
          </View>
          {/* Professional Ad Badge */}
          <View style={[styles.adBadge, isTargetAd && styles.targetAdBadge]}>
            <Ionicons name="megaphone" size={12} color="#FFFFFF" />
            <Text style={styles.adBadgeText}>
              {isTargetAd ? "📍 FROM NOTIFICATION" : "SPECIAL OFFER"}
            </Text>
          </View>
          {/* Time Container in Corner */}
          <View style={styles.timeContainer}>
            <Ionicons name="time-outline" size={12} color="#6B7280" />
            <Text style={styles.timeAgo}>
              {formatTimeAgo(item._creationTime)}
            </Text>
          </View>
        </View>

        {/* Enhanced Ad Content */}
        <View style={styles.adContentContainer}>
          {/* Discount Badge */}
          {item.advertisement?.hasDiscount &&
            item.advertisement?.discountPercentage && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>
                  {item.advertisement.discountPercentage}% OFF
                </Text>
              </View>
            )}

          {/* Message - Enhanced */}
          <View style={styles.messageContainer}>
            <Text style={styles.adDescriptionHighlighted} numberOfLines={3}>
              {item.advertisement?.message}
            </Text>
          </View>

          {/* Enhanced Media Preview */}
          {(item.advertisement?.imageIds?.length > 0 ||
            item.advertisement?.videoIds?.length > 0) && (
            <View style={styles.mediaPreview}>
              <View style={styles.mediaRow}>
                {item.advertisement?.imageIds?.length > 0 && (
                  <View style={styles.mediaChip}>
                    <Ionicons name="images" size={14} color="#3B82F6" />
                    <Text style={styles.mediaChipText}>
                      {item.advertisement.imageIds.length} Photo
                      {item.advertisement.imageIds.length > 1 ? "s" : ""}
                    </Text>
                  </View>
                )}
                {item.advertisement?.videoIds?.length > 0 && (
                  <View style={styles.mediaChip}>
                    <Ionicons name="videocam" size={14} color="#3B82F6" />
                    <Text style={styles.mediaChipText}>
                      {item.advertisement.videoIds.length} Video
                      {item.advertisement.videoIds.length > 1 ? "s" : ""}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailView = () => {
    if (!selectedNotification) return null;

    const advertisement = selectedNotification.advertisement;

    return (
      <ScrollView style={styles.detailContainer}>
        <View style={styles.detailHeader}>
          <TouchableOpacity
            onPress={handleBackToList}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.detailHeaderInfo}>
            <Text style={styles.detailShopName}>
              {advertisement?.shop?.name}
            </Text>
            <Text style={styles.detailTimeAgo}>
              {formatTimeAgo(selectedNotification._creationTime)}
            </Text>
          </View>
        </View>

        <View style={styles.detailContent}>
          {advertisement?.hasDiscount && advertisement?.discountPercentage && (
            <View style={styles.detailDiscountBadge}>
              <Text style={styles.detailDiscountText}>
                {advertisement.discountPercentage}% OFF
                {advertisement.discountText
                  ? ` • ${advertisement.discountText}`
                  : ""}
              </Text>
            </View>
          )}

          {/* Enhanced Message */}
          <View style={styles.detailMessageContainer}>
            <Text style={styles.detailMessageHighlighted}>
              {advertisement?.message}
            </Text>
          </View>

          {/* Images */}
          {advertisement?.imageIds?.length > 0 && (
            <View style={styles.mediaSection}>
              <Text style={styles.mediaSectionTitle}>Photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.mediaContainer}>
                  {advertisement.imageIds.map(
                    (imageId: string, index: number) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => handleImagePress(imageId)}
                        style={styles.imageWrapper}
                        activeOpacity={0.8}
                      >
                        <AdvertisementImage
                          imageUrl={imageId}
                          style={styles.notificationImage}
                        />
                        <View style={styles.imageOverlay}>
                          <Ionicons name="expand" size={16} color="#FFFFFF" />
                        </View>
                      </TouchableOpacity>
                    ),
                  )}
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
                  {advertisement.videoIds.map(
                    (videoId: string, index: number) => (
                      <VideoComponent
                        key={index}
                        videoId={videoId}
                        index={index}
                      />
                    ),
                  )}
                </View>
              </ScrollView>
            </View>
          )}

          <TouchableOpacity
            style={styles.shopDetailsButton}
            onPress={handleViewShop}
          >
            <Ionicons name="storefront" size={20} color="#FFFFFF" />
            <Text style={styles.shopDetailsButtonText}>Visit Shop</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // Video Player Modal Component
  const VideoPlayerModal = () => {
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
            <Video
              source={{ uri: selectedVideoId }}
              style={styles.videoPlayer}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              isLooping={false}
              shouldPlay={true}
            />
          </View>

          <View style={styles.videoPlayerHint}>
            <Text style={styles.videoPlayerHintText}>Tap outside to close</Text>
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
          <View style={styles.fullscreenImageContainer}>
            <ZoomableAdvertisementImage
              imageUrl={fullscreenImageId}
              style={styles.fullscreenImage}
            />
          </View>
        )}

        {/* Zoom Hint */}
        <View style={styles.fullscreenHint}>
          <Text style={styles.fullscreenHintText}>
            Double tap to zoom • Tap X to close
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
                <View style={styles.headerWithIcon}>
                  <Ionicons name="megaphone" size={24} color="#3B82F6" />
                  <Text style={styles.title}>🔥 Special Offers & Deals</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {notifications === undefined ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>
                    Loading notifications...
                  </Text>
                </View>
              ) : notifications?.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons
                    name="megaphone-outline"
                    size={64}
                    color="#9CA3AF"
                  />
                  <Text style={styles.emptyTitle}>
                    No Special Offers Yet! 🛍️
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    Keep checking back for exclusive deals and amazing offers
                    from your favorite shops nearby! You'll be the first to know
                    about flash sales and special promotions.
                  </Text>
                </View>
              ) : (
                <FlatList
                  ref={flatListRef}
                  data={notifications}
                  renderItem={renderNotificationItem}
                  keyExtractor={(item) => item._id}
                  contentContainerStyle={styles.listContainer}
                  showsVerticalScrollIndicator={false}
                  onScrollToIndexFailed={(info) => {
                    // Handle scroll failure gracefully
                    console.log("Scroll to index failed:", info);
                    setTimeout(() => {
                      flatListRef.current?.scrollToIndex({
                        index: Math.min(info.index, notifications.length - 1),
                        animated: true,
                      });
                    }, 100);
                  }}
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
  headerWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    padding: 12,
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
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
    shadowColor: "#2563EB",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  shopDetailsButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
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
    minHeight: Dimensions.get("window").height,
  },
  fullscreenImageContainer: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenImage: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height * 0.8,
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

  // Enhanced Professional Advertisement Styles
  adCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    position: "relative",
  },
  adBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
    zIndex: 1,
  },
  adBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  // Target Advertisement Highlighting Styles
  targetAdCard: {
    borderColor: "#3B82F6",
    borderWidth: 2,
    backgroundColor: "#F0F9FF",
    shadowColor: "#3B82F6",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  targetAdBadge: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 8,
  },
  adHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    paddingRight: 60, // Space for badge
  },
  shopInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  shopAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#3B82F6",
  },
  premiumShopName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  verifiedText: {
    fontSize: 10,
    color: "#10B981",
    fontWeight: "500",
  },
  timeAndAction: {
    alignItems: "flex-end",
    gap: 4,
  },
  rightColumn: {
    alignItems: "flex-end",
    gap: 6,
    minWidth: 80,
    marginTop: 10, // Added gap from the special offer badge
  },
  viewMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  viewMoreText: {
    fontSize: 10,
    color: "#3B82F6",
    fontWeight: "500",
  },
  adContentContainer: {
    gap: 8,
  },
  adTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    lineHeight: 20,
  },
  adDescription: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 18,
  },
  discountBadge: {
    backgroundColor: "#059669",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
  },
  discountText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  mediaPreview: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 8,
    marginTop: 4,
  },
  mediaRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  mediaChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  mediaChipText: {
    fontSize: 11,
    color: "#1E40AF",
    fontWeight: "500",
  },

  // Enhanced Detail View Styles
  detailTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
    lineHeight: 26,
  },
  detailDiscountBadge: {
    backgroundColor: "#DC2626",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  detailDiscountText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Enhanced Shop Button Styles
  enhancedShopDetailsButton: {
    backgroundColor: "#2563EB",
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: "#2563EB",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  shopButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  shopButtonIcon: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 12,
    borderRadius: 12,
  },
  shopButtonText: {
    flex: 1,
  },

  // New Enhanced Styles
  timeContainer: {
    position: "absolute",
    top: 40,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    zIndex: 2,
  },
  viewMoreButtonCorner: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
  },
  viewMoreTextSmall: {
    fontSize: 10,
    color: "#3B82F6",
    fontWeight: "600",
  },
  messageContainer: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#3B82F6",
    marginVertical: 8,
  },
  adDescriptionHighlighted: {
    fontSize: 15,
    color: "#1F2937",
    fontWeight: "500",
    lineHeight: 22,
  },
  detailMessageContainer: {
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#3B82F6",
    marginVertical: 12,
  },
  detailMessageHighlighted: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
    lineHeight: 24,
  },
});
