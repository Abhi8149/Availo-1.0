import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import AddItemModal from "./AddItemModal";
import ItemImage from "../common/ItemImage";
import AdvertisementModal from "./AdvertisementModal";
import AdvertisementHistoryModal from "./AdvertisementHistoryModal";

interface ItemsManagementProps {
  shopId: Id<"shops">;
  shopName: string;
  shopOwnerId: Id<"users">;
  shopLocation: { lat: number; lng: number };
  onBack: () => void;
}

export default function ItemsManagement({ shopId, shopName, shopOwnerId, shopLocation, onBack }: ItemsManagementProps) {
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Advertisement modal states
  const [showAdvertisement, setShowAdvertisement] = useState(false);
  const [showAdvertisementHistory, setShowAdvertisementHistory] = useState(false);
  const [editingAdvertisement, setEditingAdvertisement] = useState(null);

  const items = useQuery(api.items.getItemsByShop, { shopId });
  const deleteItem = useMutation(api.items.deleteItem);
  const updateItem = useMutation(api.items.updateItem);

  const handleDeleteItem = (itemId: Id<"items">, itemName: string) => {
    Alert.alert(
      "Delete Item",
      `Are you sure you want to delete "${itemName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteItem({ itemId });
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            } catch (error) {
              Alert.alert("Error", "Failed to delete item");
            }
          },
        },
      ]
    );
  };

  const handleToggleStock = async (itemId: Id<"items">, currentStock: boolean) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    try {
      await updateItem({
        itemId,
        inStock: !currentStock,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to update stock status");
    }
  };

  const handleEditAdvertisement = (advertisement: any) => {
    setEditingAdvertisement(advertisement);
    setShowAdvertisementHistory(false);
    setShowAdvertisement(true);
  };

  const renderItem = ({ item }: { item: any }) => {
    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={styles.itemImageContainer}>
            {item.imageId ? (
              <ItemImage imageId={item.imageId} />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="image-outline" size={24} color="#9CA3AF" />
              </View>
            )}
          </View>
          
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.name}</Text>
            {item.description && (
              <Text style={styles.itemDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            {item.price && (
              <Text style={styles.itemPrice}>₹{item.price}</Text>
            )}
            {item.category && (
              <Text style={styles.itemCategory}>{item.category}</Text>
            )}
          </View>

          <View style={styles.itemActions}>
            <View style={[
              styles.stockBadge,
              item.inStock ? styles.stockInStock : styles.stockOutOfStock,
            ]}>
              <Text style={[
                styles.stockText,
                item.inStock ? styles.stockTextInStock : styles.stockTextOutOfStock,
              ]}>
                {item.inStock ? "In Stock" : "Out of Stock"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.itemFooter}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setEditingItem(item)}
          >
            <Ionicons name="create-outline" size={16} color="#2563EB" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              item.inStock ? styles.stockButtonOutOfStock : styles.stockButtonInStock,
            ]}
            onPress={() => handleToggleStock(item._id, item.inStock)}
          >
            <Ionicons 
              name={item.inStock ? "close-circle-outline" : "checkmark-circle-outline"} 
              size={16} 
              color={item.inStock ? "#DC2626" : "#16A34A"} 
            />
            <Text style={[
              styles.actionButtonText,
              item.inStock ? styles.actionButtonTextRed : styles.actionButtonTextGreen,
            ]}>
              {item.inStock ? "Mark Out" : "Mark In"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteItem(item._id, item.name)}
          >
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
            <Text style={[styles.actionButtonText, styles.actionButtonTextRed]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (items === undefined) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.title}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>{shopName}</Text>
          <Text style={styles.subtitle}>{items.length} items</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddItem(true)}
        >
          <Ionicons name="add" size={24} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {/* Advertisement Section */}
      <View style={styles.advertisementSection}>
        <Text style={styles.sectionTitle}>Promote Your Items</Text>
        <TouchableOpacity
          style={styles.advertiseButton}
          onPress={() => setShowAdvertisement(true)}
        >
          <View style={styles.advertiseButtonContent}>
            <Ionicons name="megaphone" size={24} color="#F59E0B" />
            <View style={styles.advertiseButtonText}>
              <Text style={styles.advertiseButtonTitle}>Advertise here</Text>
              <Text style={styles.advertiseButtonSubtitle}>Notify locals about your items</Text>
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

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cube-outline" size={64} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>No items yet</Text>
          <Text style={styles.emptySubtitle}>
            Add your first item to start managing your inventory
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.itemsList}
          showsVerticalScrollIndicator={false}
        />
      )}

      <AddItemModal
        visible={showAddItem || !!editingItem}
        onClose={() => {
          setShowAddItem(false);
          setEditingItem(null);
        }}
        shopId={shopId}
        editingItem={editingItem}
      />

      {/* Advertisement Modals */}
      <AdvertisementModal
        visible={showAdvertisement}
        onClose={() => {
          setShowAdvertisement(false);
          setEditingAdvertisement(null);
        }}
        shopId={shopId}
        shopOwnerId={shopOwnerId}
        shopLocation={shopLocation}
        editingAdvertisement={editingAdvertisement}
      />

      <AdvertisementHistoryModal
        visible={showAdvertisementHistory}
        onClose={() => setShowAdvertisementHistory(false)}
        shopId={shopId}
        shopOwnerId={shopOwnerId}
        shopLocation={shopLocation}
        onEditAdvertisement={handleEditAdvertisement}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  addButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 32,
  },
  itemsList: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  itemHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  itemImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
    overflow: "hidden",
  },
  itemImage: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#16A34A",
    marginBottom: 2,
  },
  itemCategory: {
    fontSize: 12,
    color: "#9CA3AF",
    textTransform: "capitalize",
  },
  itemActions: {
    alignItems: "flex-end",
  },
  stockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stockInStock: {
    backgroundColor: "#DCFCE7",
  },
  stockOutOfStock: {
    backgroundColor: "#FEE2E2",
  },
  stockText: {
    fontSize: 11,
    fontWeight: "600",
  },
  stockTextInStock: {
    color: "#16A34A",
  },
  stockTextOutOfStock: {
    color: "#DC2626",
  },
  itemFooter: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    gap: 4,
  },
  stockButtonInStock: {
    backgroundColor: "#DCFCE7",
  },
  stockButtonOutOfStock: {
    backgroundColor: "#FEE2E2",
  },
  actionButtonText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "500",
  },
  actionButtonTextGreen: {
    color: "#16A34A",
  },
  actionButtonTextRed: {
    color: "#DC2626",
  },

  // Advertisement Section Styles
  advertisementSection: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
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
});