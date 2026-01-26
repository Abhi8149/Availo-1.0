import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Id } from "../../convex/_generated/dataModel";
import ShopImage from "../common/ShopImage";

interface FavouriteShop {
  _id: Id<"shops">;
  name: string;
  category: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  isOpen: boolean;
  lastUpdated: number;
  mobileNumber?: string;
  shopImageId?: Id<"_storage">;
  shopImageIds?: Id<"_storage">[];
  estimatedTime?: {
    hours: number;
    minutes: number;
    action: "opening" | "closing";
  };
  distance?: number | null;
  addedAt: number;
}

interface FavouriteShopsModalProps {
  visible: boolean;
  onClose: () => void;
  favouriteShops: FavouriteShop[];
  onRemoveFromFavourites: (shopId: Id<"shops">) => void;
  onViewShop: (shop: FavouriteShop) => void;
}

export default function FavouriteShopsModal({
  visible,
  onClose,
  favouriteShops,
  onRemoveFromFavourites,
  onViewShop,
}: FavouriteShopsModalProps) {
  
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      grocery: "basket",
      restaurant: "restaurant",
      pharmacy: "medical",
      clothing: "shirt",
      electronics: "phone-portrait",
      bakery: "cafe",
      hardware: "hammer",
      beauty: "sparkles",
      books: "book",
      other: "storefront",
    };
    return icons[category] || "storefront";
  };

  const formatDistance = (distance: number | null | undefined) => {
    if (distance === null || distance === undefined) return null;
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m away`;
    }
    return `${distance}km away`;
  };

  const formatFavouriteDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  const renderFavouriteShop = ({ item }: { item: FavouriteShop }) => (
    <TouchableOpacity
      style={styles.shopCard}
      onPress={() => {
        onClose();
        onViewShop(item);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.shopCardContent}>
        {/* Shop Image */}
        <View style={styles.shopImageContainer}>
          {item.shopImageId ? (
            <ShopImage imageUrl={item.shopImageId} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons 
                name={getCategoryIcon(item.category) as any} 
                size={24} 
                color="#9CA3AF" 
              />
            </View>
          )}
        </View>

        {/* Shop Info */}
        <View style={styles.shopInfo}>
          <View style={styles.shopMainInfo}>
            <Text style={styles.shopName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.shopCategory}>
              {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
            </Text>
          </View>

          <View style={styles.shopStatusRow}>
            <View style={[
              styles.statusBadge,
              item.isOpen ? styles.statusOpen : styles.statusClosed,
            ]}>
              <View style={[
                styles.statusDot,
                item.isOpen ? styles.statusDotOpen : styles.statusDotClosed,
              ]} />
              <Text style={[
                styles.statusText,
                item.isOpen ? styles.statusTextOpen : styles.statusTextClosed,
              ]}>
                {item.isOpen ? "Open" : "Closed"}
              </Text>
            </View>

            {item.distance !== null && item.distance !== undefined && (
              <Text style={styles.distanceText}>
                {formatDistance(item.distance)}
              </Text>
            )}
          </View>

          <Text style={styles.addedDate}>
            Added {formatFavouriteDate(item.addedAt)}
          </Text>
        </View>
      </View>

      <View style={styles.tapIndicator}>
        <Ionicons name="chevron-forward" size={16} color="#6B7280" />
        <Text style={styles.tapIndicatorText}>Tap to view details</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>My Favourite Shops</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {favouriteShops.length === 0 ? (
            <View style={styles.emptyFavourites}>
              <Ionicons name="heart-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyFavouritesTitle}>No favourite shops yet</Text>
              <Text style={styles.emptyFavouritesSubtitle}>
                Start adding shops to your favourites by tapping the heart icon when viewing shop details
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.favouritesCount}>
                {favouriteShops.length} favourite shop{favouriteShops.length !== 1 ? 's' : ''}
              </Text>
              <FlatList
                data={favouriteShops}
                keyExtractor={(item) => item._id}
                renderItem={renderFavouriteShop}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.favouritesList}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
  },
  modalCloseButton: {
    padding: 4,
  },
  favouritesCount: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
    textAlign: "center",
  },
  favouritesList: {
    paddingVertical: 8,
  },
  shopCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  shopCardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  shopImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    marginRight: 12,
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  shopInfo: {
    flex: 1,
  },
  shopMainInfo: {
    marginBottom: 6,
  },
  shopName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  shopCategory: {
    fontSize: 12,
    color: "#6B7280",
  },
  shopStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusOpen: {
    backgroundColor: "#DCFCE7",
  },
  statusClosed: {
    backgroundColor: "#FEE2E2",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotOpen: {
    backgroundColor: "#16A34A",
  },
  statusDotClosed: {
    backgroundColor: "#DC2626",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusTextOpen: {
    color: "#16A34A",
  },
  statusTextClosed: {
    color: "#DC2626",
  },
  distanceText: {
    fontSize: 11,
    color: "#16A34A",
    fontWeight: "500",
  },
  addedDate: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  tapIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    justifyContent: "center",
  },
  tapIndicatorText: {
    fontSize: 12,
    color: "#6B7280",
  },
  emptyFavourites: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyFavouritesTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
    textAlign: "center",
  },
  emptyFavouritesSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});
