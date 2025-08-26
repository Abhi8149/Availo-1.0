import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Id } from "../../convex/_generated/dataModel";

interface Shop {
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
}

interface ShopMapModalProps {
  visible: boolean;
  onClose: () => void;
  shops: Shop[];
}

export default function ShopMapModal({ visible, onClose, shops }: ShopMapModalProps) {
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

  const handleShopPress = (shop: Shop) => {
    const { lat, lng } = shop.location;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    
    Alert.alert(
      shop.name,
      `${shop.category.charAt(0).toUpperCase() + shop.category.slice(1)} • ${shop.isOpen ? "Open" : "Closed"}\n\nGet directions to this shop?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Get Directions", 
          onPress: () => {
            // In a real app, you'd use Linking.openURL(url)
            Alert.alert("Info", "This would open Google Maps with directions");
          }
        },
      ]
    );
  };

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
          <Text style={styles.title}>Shop Locations</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.mapPlaceholder}>
          <Ionicons name="map" size={64} color="#9CA3AF" />
          <Text style={styles.mapPlaceholderTitle}>Map View</Text>
          <Text style={styles.mapPlaceholderSubtitle}>
            In a real app, this would show Google Maps with shop markers
          </Text>
        </View>

        <View style={styles.shopListHeader}>
          <Text style={styles.shopListTitle}>
            {shops.length} Shop{shops.length !== 1 ? "s" : ""} Found
          </Text>
        </View>

        <ScrollView style={styles.shopList} showsVerticalScrollIndicator={false}>
          {shops.map((shop) => (
            <TouchableOpacity
              key={shop._id}
              style={styles.shopItem}
              onPress={() => handleShopPress(shop)}
            >
              <View style={styles.shopItemIcon}>
                <Ionicons 
                  name={getCategoryIcon(shop.category) as any} 
                  size={20} 
                  color="#2563EB" 
                />
              </View>
              <View style={styles.shopItemInfo}>
                <Text style={styles.shopItemName}>{shop.name}</Text>
                <Text style={styles.shopItemCategory}>
                  {shop.category.charAt(0).toUpperCase() + shop.category.slice(1)}
                </Text>
                {shop.location.address && (
                  <Text style={styles.shopItemAddress} numberOfLines={1}>
                    {shop.location.address}
                  </Text>
                )}
              </View>
              <View style={styles.shopItemRight}>
                <View style={[
                  styles.statusIndicator,
                  shop.isOpen ? styles.statusOpen : styles.statusClosed,
                ]}>
                  <Text style={[
                    styles.statusText,
                    shop.isOpen ? styles.statusTextOpen : styles.statusTextClosed,
                  ]}>
                    {shop.isOpen ? "Open" : "Closed"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
  mapPlaceholder: {
    height: 200,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    margin: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  mapPlaceholderTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 12,
  },
  mapPlaceholderSubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
    paddingHorizontal: 32,
  },
  shopListHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  shopListTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  shopList: {
    flex: 1,
  },
  shopItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  shopItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  shopItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  shopItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  shopItemCategory: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  shopItemAddress: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  shopItemRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusOpen: {
    backgroundColor: "#DCFCE7",
  },
  statusClosed: {
    backgroundColor: "#FEE2E2",
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
});