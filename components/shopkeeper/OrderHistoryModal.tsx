import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Linking,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

const { width, height } = Dimensions.get("window");

interface OrderHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  userId: Id<"users"> | null;
}

export default function OrderHistoryModal({
  visible,
  onClose,
  userId,
}: OrderHistoryModalProps) {
  const orderHistory = useQuery(
    api.orders.getUserOrderHistory,
    visible && userId ? { ownerUid: userId } : "skip"
  );

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
      case "completed":
        return "#16A34A";
      case "rejected":
        return "#DC2626";
      default:
        return "#9CA3AF";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "checkmark-circle";
      case "rejected":
        return "close-circle";
      default:
        return "help-circle";
    }
  };

  const handleContactCustomer = (customerMobile: string) => {
    if (customerMobile.includes('@')) {
      // It's an email
      Linking.openURL(`mailto:${customerMobile}`).catch(() => {
        Alert.alert("Error", "Unable to open email client");
      });
    } else {
      // It's a phone number
      Linking.openURL(`tel:${customerMobile}`).catch(() => {
        Alert.alert("Error", "Unable to make phone call");
      });
    }
  };

  const renderOrderCard = (order: any) => (
    <TouchableOpacity
      key={order._id}
      style={styles.orderCard}
      activeOpacity={0.7}
    >
      <View style={styles.orderCardHeader}>
        <View style={styles.customerInfo}>
          <View style={styles.customerAvatar}>
            <Text style={styles.customerAvatarText}>
              {order.customerName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.customerDetails}>
            <Text style={styles.customerName}>{order.customerName}</Text>
            {order.customerMobile && (
              <TouchableOpacity 
                onPress={() => handleContactCustomer(order.customerMobile)}
                activeOpacity={0.7}
              >
                <Text style={styles.customerMobile}>
                  {order.customerMobile.includes('@') ? '📧' : '📞'} {order.customerMobile}
                </Text>
              </TouchableOpacity>
            )}
            {order.shopName && (
              <Text style={styles.shopName}>🏪 {order.shopName}</Text>
            )}
            <Text style={styles.orderTime}>{formatDate(order.createdAt)}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + "20" }]}>
          <Ionicons
            name={getStatusIcon(order.status)}
            size={16}
            color={getStatusColor(order.status)}
            style={styles.statusIcon}
          />
          <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.orderItems}>
        <Text style={styles.itemsLabel}>Items:</Text>
        {order.items.slice(0, 2).map((item: any, index: number) => (
          <Text key={index} style={styles.itemText}>
            • {item.itemName} x{item.quantity}
          </Text>
        ))}
        {order.items.length > 2 && (
          <Text style={styles.moreItemsText}>
            +{order.items.length - 2} more items
          </Text>
        )}
      </View>

      {order.totalAmount && (
        <View style={styles.totalAmountContainer}>
          <Text style={styles.totalAmountText}>
            Total: ₹{order.totalAmount}
          </Text>
        </View>
      )}

      {order.rejectionReason && (
        <View style={styles.rejectionReasonContainer}>
          <Text style={styles.rejectionReasonLabel}>Rejection Reason:</Text>
          <Text style={styles.rejectionReasonText}>{order.rejectionReason}</Text>
        </View>
      )}

      {order.deliveryTime && order.status === "completed" && (
        <View style={styles.deliveryTimeContainer}>
          <Text style={styles.deliveryTimeText}>
            Delivered in {order.deliveryTime} minutes
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Order History</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {orderHistory && orderHistory.length > 0 ? (
            orderHistory.map(renderOrderCard)
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>No Order History</Text>
              <Text style={styles.emptyStateSubtitle}>
                Completed and rejected orders will appear here
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
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  orderCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  customerInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  customerAvatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  shopName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3B82F6",
    marginBottom: 2,
  },
  customerMobile: {
    fontSize: 12,
    fontWeight: "500",
    color: "#059669",
    marginBottom: 2,
  },
  orderTime: {
    fontSize: 14,
    color: "#6B7280",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  orderItems: {
    marginBottom: 12,
  },
  itemsLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  itemText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  moreItemsText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontStyle: "italic",
    marginTop: 2,
  },
  totalAmountContainer: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 8,
    marginBottom: 8,
  },
  totalAmountText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    textAlign: "right",
  },
  rejectionReasonContainer: {
    backgroundColor: "#FEF2F2",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  rejectionReasonLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#DC2626",
    marginBottom: 2,
  },
  rejectionReasonText: {
    fontSize: 14,
    color: "#7F1D1D",
  },
  deliveryTimeContainer: {
    backgroundColor: "#F0FDF4",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  deliveryTimeText: {
    fontSize: 14,
    color: "#16A34A",
    fontWeight: "500",
    textAlign: "center",
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
