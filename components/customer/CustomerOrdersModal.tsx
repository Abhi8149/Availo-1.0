import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

const { width } = Dimensions.get("window");

interface CustomerOrdersModalProps {
  visible: boolean;
  onClose: () => void;
  userId: Id<"users">;
}

export default function CustomerOrdersModal({
  visible,
  onClose,
  userId,
}: CustomerOrdersModalProps) {
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  
  // Query to get customer orders
  const orders = useQuery(
    api.orders.getCustomerOrders,
    visible && userId ? { customerId: userId } : "skip"
  );

  // Query to get shop details for contact info
  const shops = useQuery(
    api.shops.getAllShops,
    visible ? {} : "skip"
  );

  const cancelOrder = useMutation(api.orders.cancelOrder);
  const updateOrderStatus = useMutation(api.orders.updateOrderStatus);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes} min ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} days ago`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#F59E0B";
      case "accepted":
        return "#10B981";
      case "completed":
        return "#16A34A";
      case "rejected":
        return "#DC2626";
      case "cancelled":
        return "#6B7280";
      default:
        return "#9CA3AF";
    }
  };

  const getStatusText = (order: any) => {
    switch (order.status) {
      case "pending":
        return "Pending from shopkeeper";
      case "accepted":
        return order.deliveryTime ? `Delivering in ${order.deliveryTime} minutes` : "Accepted by shopkeeper";
      case "completed":
        return "Order completed";
      case "rejected":
        return order.rejectionReason ? `Rejected: ${order.rejectionReason}` : "Rejected by shopkeeper";
      case "cancelled":
        return "Cancelled by you";
      default:
        return "Unknown status";
    }
  };

  const getShopDetails = (shopId: Id<"shops">) => {
    return shops?.find(shop => shop._id === shopId);
  };

  const handleCallShop = (mobileNumber?: string) => {
    if (!mobileNumber) {
      Alert.alert("Error", "Shop contact number not available");
      return;
    }
    
    Linking.openURL(`tel:${mobileNumber}`).catch(() => {
      Alert.alert("Error", "Unable to make phone call");
    });
  };

  const handleCancelOrder = (orderId: Id<"orders">) => {
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this order?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelOrder({ orderId });
              Alert.alert("Success", "Order cancelled successfully");
            } catch (error) {
              Alert.alert("Error", "Failed to cancel order");
            }
          }
        }
      ]
    );
  };

  const handleMarkCompleted = (orderId: Id<"orders">) => {
    Alert.alert(
      "Mark as Completed",
      "Confirm that you have received your order?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Mark Complete",
          onPress: async () => {
            try {
              await updateOrderStatus({ orderId, status: "completed" });
              Alert.alert("Success", "Order marked as completed");
            } catch (error) {
              Alert.alert("Error", "Failed to update order status");
            }
          }
        }
      ]
    );
  };

  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const renderOrderCard = (order: any) => {
    const shop = getShopDetails(order.shopId);
    const isExpanded = expandedOrders.has(order._id);
    const canTakeAction = order.status === "pending" || order.status === "accepted";

    return (
      <View key={order._id} style={styles.orderCard}>
        {/* Shop Info Bar */}
        <TouchableOpacity 
          style={styles.shopInfoBar}
          onPress={() => shop?.mobileNumber && handleCallShop(shop.mobileNumber)}
          activeOpacity={0.7}
        >
          <View style={styles.shopInfo}>
            <Text style={styles.shopName}>🏪 {shop?.name || "Unknown Shop"}</Text>
            <Text style={styles.shopContact}>
              📞 {shop?.mobileNumber || "Contact not available"}
            </Text>
          </View>
          <Ionicons name="call" size={20} color="#0EA5E9" />
        </TouchableOpacity>

        {/* Order Summary */}
        <TouchableOpacity 
          style={styles.orderSummary}
          onPress={() => toggleOrderExpansion(order._id)}
          activeOpacity={0.7}
        >
          <View style={styles.orderHeader}>
            <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
            <Text style={styles.orderTotal}>₹{order.totalAmount || 0}</Text>
          </View>
          
          <Text style={styles.itemsPreview}>
            {order.items.slice(0, 2).map((item: any) => item.itemName).join(", ")}
            {order.items.length > 2 && ` +${order.items.length - 2} more`}
          </Text>

          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + "20" }]}>
              <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                {getStatusText(order)}
              </Text>
            </View>
            <Ionicons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#9CA3AF" 
            />
          </View>
        </TouchableOpacity>

        {/* Expanded Details */}
        {isExpanded && (
          <View style={styles.expandedDetails}>
            <Text style={styles.itemsTitle}>Items:</Text>
            {order.items.map((item: any, index: number) => (
              <View key={index} style={styles.itemRow}>
                <Text style={styles.itemName}>{item.itemName}</Text>
                <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                <Text style={styles.itemPrice}>₹{item.price || 0}</Text>
              </View>
            ))}
            
            {/* Action Buttons */}
            {canTakeAction && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.completeButton}
                  onPress={() => handleMarkCompleted(order._id)}
                >
                  <Text style={styles.completeButtonText}>Mark as Completed</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => handleCancelOrder(order._id)}
                >
                  <Text style={styles.cancelButtonText}>Cancel Order</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  // Filter out cancelled orders and sort by date
  const activeOrders = orders?.filter(order => order.status !== "cancelled") || [];
  const sortedOrders = activeOrders.sort((a, b) => b.createdAt - a.createdAt);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Orders</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {sortedOrders.length > 0 ? (
            sortedOrders.map(renderOrderCard)
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="bag-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>No Orders Yet</Text>
              <Text style={styles.emptyStateSubtitle}>
                Your orders will appear here once you start shopping
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  shopInfoBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  shopContact: {
    fontSize: 14,
    color: "#0EA5E9",
    fontWeight: "500",
  },
  orderSummary: {
    padding: 16,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  orderDate: {
    fontSize: 14,
    color: "#6B7280",
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  itemsPreview: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  expandedDetails: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    padding: 16,
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
  },
  itemQuantity: {
    fontSize: 14,
    color: "#6B7280",
    marginHorizontal: 16,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  completeButton: {
    flex: 1,
    backgroundColor: "#16A34A",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  completeButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#DC2626",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
});
