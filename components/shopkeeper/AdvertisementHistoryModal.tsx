import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Image } from "expo-image";

interface AdvertisementHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  shopId: Id<"shops">;
  shopOwnerId: Id<"users">;
  shopLocation: { lat: number; lng: number };
  onEditAdvertisement: (advertisement: any) => void;
}

export default function AdvertisementHistoryModal({
  visible,
  onClose,
  shopId,
  shopOwnerId,
  shopLocation,
  onEditAdvertisement,
}: AdvertisementHistoryModalProps) {
  const [loadingAds, setLoadingAds] = useState<Set<string>>(new Set());
  const [loading, setloading] = useState(false)

  const advertisements = useQuery(api.advertisements.getAdvertisementsByShop, { shopId });
  const deleteAdvertisement = useMutation(api.advertisements.deleteAdvertisement);
  const sendNotifications = useMutation(api.advertisements.sendNotificationsToNearbyUsers);
  const sendPushNotifications = useAction(api.advertisements.sendPushNotificationToNearbyUsers);

  // Helper functions for managing loading state per advertisement
  const setAdLoading = (adId: string, loading: boolean) => {
    setLoadingAds(prev => {
      const newSet = new Set(prev);
      if (loading) {
        newSet.add(adId);
      } else {
        newSet.delete(adId);
      }
      return newSet;
    });
  };

  const isAdLoading = (adId: string) => loadingAds.has(adId);
  const isAnyAdLoading = loadingAds.size > 0;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDeleteAdvertisement = (advertisementId: Id<"advertisements">, message: string) => {
    Alert.alert(
      "Delete Advertisement",
      `Are you sure you want to delete this advertisement?\n\n"${message.substring(0, 50)}..."`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setAdLoading(advertisementId, true);
              await deleteAdvertisement({ advertisementId });
              Alert.alert("Success", "Advertisement deleted successfully!");
            } catch (error) {
              Alert.alert("Error", "Failed to delete advertisement");
            } finally {
              setAdLoading(advertisementId, false);
            }
          },
        },
      ]
    );
  };

  const handleNotifyAgain = async (advertisement: any) => {
    Alert.alert(
      "Send Notification Again",
      `Send this advertisement to nearby users again?\n\n"${advertisement.message.substring(0, 100)}...".`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: async () => {
            try {
              setAdLoading(advertisement._id, true);
              
              // Send in-app notifications first
              console.log('📨 Sending in-app notifications...');
              const notificationCount = await sendNotifications({
                advertisementId: advertisement._id,
                shopLat: shopLocation.lat,
                shopLng: shopLocation.lng,
                radiusKm: 5,
              });

              // Send push notifications
              console.log('🔔 Sending push notifications...');
              const pushResult = await sendPushNotifications({
                advertisementId: advertisement._id,
                shopId: shopId,
                shopLat: shopLocation.lat,
                shopLng: shopLocation.lng,
                radiusKm: 5,
              });

              if (pushResult.success) {
                Alert.alert(
                  "✅ Success",
                  'Notification sended succefully'
                );
              } else {
                Alert.alert(
                  "⚠️ Partial Success", 
                  `In-app notifications sent to ${notificationCount} users.\n\nPush notifications failed: ${pushResult.error || 'Unknown error'}`
                );
              }
            } catch (error) {
              console.error('❌ Error sending notifications:', error);
              Alert.alert(
                "❌ Error", 
                `Failed to send notifications.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`
              );
            } finally {
              setAdLoading(advertisement._id, false);
            }
          },
        },
      ]
    );
  };

  const renderAdvertisement = ({ item: advertisement }: { item: any }) => {
    return (
      <View style={styles.advertisementCard}>
        <View style={styles.advertisementHeader}>
          <View style={styles.advertisementInfo}>
            <Text style={styles.advertisementMessage} numberOfLines={3}>
              {advertisement.message}
            </Text>
            <Text style={styles.advertisementDate}>
              Created: {formatDate(advertisement.createdAt)}
            </Text>
            {advertisement.updatedAt !== advertisement.createdAt && (
              <Text style={styles.advertisementDate}>
                Updated: {formatDate(advertisement.updatedAt)}
              </Text>
            )}
          </View>
          <View style={[
            styles.statusBadge,
            advertisement.isActive ? styles.statusActive : styles.statusInactive,
          ]}>
            <Text style={[
              styles.statusText,
              advertisement.isActive ? styles.statusTextActive : styles.statusTextInactive,
            ]}>
              {advertisement.isActive ? "Active" : "Inactive"}
            </Text>
          </View>
        </View>

        {/* Media Preview */}
        {(advertisement.imageIds?.length > 0 || advertisement.videoIds?.length > 0) && (
          <View style={styles.mediaPreviewSection}>
            <View style={styles.mediaStats}>
              {advertisement.imageIds?.length > 0 && (
                <View style={styles.mediaStat}>
                  <Ionicons name="image" size={16} color="#6B7280" />
                  <Text style={styles.mediaStatText}>{advertisement.imageIds.length} photo{advertisement.imageIds.length > 1 ? 's' : ''}</Text>
                </View>
              )}
              {advertisement.videoIds?.length > 0 && (
                <View style={styles.mediaStat}>
                  <Ionicons name="videocam" size={16} color="#6B7280" />
                  <Text style={styles.mediaStatText}>{advertisement.videoIds.length} video{advertisement.videoIds.length > 1 ? 's' : ''}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Statistics */}
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{advertisement.notificationsSent || 0}</Text>
            <Text style={styles.statLabel}>Notifications Sent</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.advertisementActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              onEditAdvertisement(advertisement);
              onClose();
            }}
            disabled={isAdLoading(advertisement._id)}
          >
            <Ionicons name="create-outline" size={16} color="#2563EB" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton, 
              styles.notifyButton,
              isAdLoading(advertisement._id) && styles.disabledButton
            ]}
            onPress={() => handleNotifyAgain(advertisement)}
            disabled={isAdLoading(advertisement._id)}
          >
            {isAdLoading(advertisement._id) ? (
              <Ionicons name="hourglass-outline" size={16} color="#16A34A" />
            ) : (
              <Ionicons name="notifications-outline" size={16} color="#16A34A" />
            )}
            <Text style={[styles.actionButtonText, styles.notifyButtonText]}>
              {isAdLoading(advertisement._id) ? "Sending..." : "Notify Again"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton, 
              styles.deleteButton,
              isAdLoading(advertisement._id) && styles.disabledButton
            ]}
            onPress={() => handleDeleteAdvertisement(advertisement._id, advertisement.message)}
            disabled={isAdLoading(advertisement._id)}
          >
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (advertisements === undefined) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.title}>Advertisement History</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} disabled={loading}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.title}>Advertisement History</Text>
          <View style={{ width: 24 }} />
        </View>

        {advertisements.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="megaphone-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Advertisements Yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first advertisement to start promoting your shop
            </Text>
          </View>
        ) : (
          <FlatList
            data={advertisements}
            keyExtractor={(item) => item._id}
            renderItem={renderAdvertisement}
            contentContainerStyle={styles.advertisementsList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
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
  advertisementsList: {
    padding: 16,
    gap: 16,
  },
  advertisementCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
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
  advertisementHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  advertisementInfo: {
    flex: 1,
    marginRight: 12,
  },
  advertisementMessage: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 8,
    lineHeight: 22,
  },
  advertisementDate: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: "#DCFCE7",
  },
  statusInactive: {
    backgroundColor: "#F3F4F6",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusTextActive: {
    color: "#16A34A",
  },
  statusTextInactive: {
    color: "#6B7280",
  },
  mediaPreviewSection: {
    marginBottom: 12,
  },
  mediaStats: {
    flexDirection: "row",
    gap: 16,
  },
  mediaStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mediaStatText: {
    fontSize: 12,
    color: "#6B7280",
  },
  statsContainer: {
    flexDirection: "row",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    marginBottom: 12,
  },
  stat: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  advertisementActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "500",
  },
  notifyButton: {
    backgroundColor: "#F0FDF4",
  },
  notifyButtonText: {
    color: "#16A34A",
  },
  deleteButton: {
    backgroundColor: "#FEF2F2",
  },
  deleteButtonText: {
    color: "#DC2626",
  },
  disabledButton: {
    opacity: 0.6,
  },
});
