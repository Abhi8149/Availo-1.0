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
  TextInput,
} from "react-native";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { DirectionsService } from "../../services/directionsService";

interface ShopOrdersModalProps {
  visible: boolean;
  onClose: () => void;
  shopId: Id<"shops">;
}

interface OrderDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  order: any;
  onUpdateStatus: (orderId: Id<"orders">, status: "pending" | "confirmed" |"rejected" | "completed", deliveryTime?: number, rejectionReason?: string) => void;
  openDirections: (customerLocation?: { lat: number; lng: number; address?: string }) => void;
  isHistoryMode?: boolean;
}

// Helper function to calculate distance between two points
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

interface ShopOrdersModalProps {
  visible: boolean;
  onClose: () => void;
  shopId: Id<"shops">;
}

export const ShopOrdersModal: React.FC<ShopOrdersModalProps> = ({
  visible,
  onClose,
  shopId,
}) => {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  
  const allOrders = useQuery(
    api.orders.getShopOrders, 
    visible && shopId ? { shopId } : "skip"
  );
  
  // Show only active orders (not completed, rejected, or cancelled)
  const orders = allOrders?.filter((order: any) => {
    return order.status !== "completed" && 
           order.status !== "rejected" && 
           order.status !== "cancelled";
  });
  
  const updateOrderStatus = useMutation(api.orders.updateOrderStatus);

  // Get shop location for distance calculation
  const shop = useQuery(api.shops.getShop, visible && shopId ? { shopId } : "skip");

  const handleStatusUpdate = async (orderId: Id<"orders">, status: "pending" | "confirmed" | "rejected" | "completed", deliveryTime?: number, rejectionReason?: string) => {
    try {
      await updateOrderStatus({ 
        orderId, 
        status, 
        ...(deliveryTime && { deliveryTime }),
        ...(rejectionReason && { rejectionReason })
      });
      Alert.alert("Success", `Order ${status} successfully`);
      
      // Close modal and clear selection when order is rejected or completed
      if (status === "rejected" || status === "completed") {
        setSelectedOrder(null);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update order status");
    }
  };

  const openDirections = async (customerLocation?: { lat: number; lng: number; address?: string }) => {
    if (!customerLocation) {
      Alert.alert("Error", "Customer location not available");
      return;
    }
    
    try {
      await DirectionsService.openDirections({
        latitude: customerLocation.lat,
        longitude: customerLocation.lng,
        shopName: "Customer Location",
        address: customerLocation.address
      });
    } catch (error) {
      console.error('Error opening directions:', error);
      Alert.alert("Error", "Unable to open directions");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#F59E0B";
      case "confirmed":
        return "#3B82F6";
      case "preparing":
        return "#8B5CF6";
      case "ready":
        return "#10B981";
      case "rejected":
        return "#EF4444";
      case "completed":
        return "#059669";
      default:
        return "#6B7280";
    }
  };

  const getCustomerDistance = (order: any) => {
    if (!shop || !order.deliveryAddress) return "Unknown";
    
    const distance = calculateDistance(
      shop.location.lat,
      shop.location.lng,
      order.deliveryAddress.lat,
      order.deliveryAddress.lng
    );
    
    return `${distance} km away`;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Active Orders</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {!orders ? (
            <Text style={styles.loading}>Loading orders...</Text>
          ) : orders.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No active orders</Text>
              <Text style={styles.emptyStateSubtext}>
                New orders will appear here
              </Text>
            </View>
          ) : (
            orders.map((order) => (
              <TouchableOpacity 
                key={order._id} 
                style={styles.orderCard}
                onPress={() => setSelectedOrder(order)}
              >
                <View style={styles.orderHeader}>
                  <Text style={styles.orderDate}>
                    {new Date(order._creationTime).toLocaleDateString()} at{" "}
                    {new Date(order._creationTime).toLocaleTimeString()}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(order.status) },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {order.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>
                    Customer: {order.customerName}
                  </Text>
                  <Text style={styles.customerPhone}>
                    Phone: {order.customerMobile || "Not provided"}
                  </Text>
                  <Text style={styles.customerDistance}>
                    Distance: {getCustomerDistance(order)}
                  </Text>
                </View>

                <View style={styles.orderSummary}>
                  <Text style={styles.itemCount}>
                    {order.items.length} item(s)
                  </Text>
                  <Text style={styles.totalAmount}>
                    Total: ₹{order.totalAmount || 0}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.directionsButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    openDirections(order.deliveryAddress);
                  }}
                >
                  <Text style={styles.directionsButtonText}>
                    📍 Get Directions
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Order Details Modal */}
        <OrderDetailsModal
          visible={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          order={selectedOrder ? allOrders?.find(o => o._id === selectedOrder._id) || selectedOrder : null}
          onUpdateStatus={handleStatusUpdate}
          openDirections={openDirections}
          isHistoryMode={false}
        />
      </View>
    </Modal>
  );
};

// Order Details Modal Component
const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  visible,
  onClose,
  order,
  onUpdateStatus,
  openDirections,
  isHistoryMode = false,
}) => {
  const [showDeliveryOptions, setShowDeliveryOptions] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  if (!order) return null;

  const deliveryTimes = [10, 15, 20, 30, 45, 60];

  const handleDeliveryTime = (minutes: number) => {
    const isPending = order.status === "pending";
    const actionText = isPending ? "Confirm & set delivery" : "Update delivery time";
    const statusText = isPending ? "Order confirmed and will be delivered" : "Delivery time updated to";
    
    Alert.alert(
      isPending ? "Confirm Delivery" : "Update Delivery Time",
      `${actionText} to ${minutes} minutes?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isPending ? "Confirm" : "Update",
          onPress: async () => {
            const newStatus = isPending ? "confirmed" : order.status;
            await onUpdateStatus(order._id, newStatus, minutes);
            setShowDeliveryOptions(false);
            Alert.alert("Success", `${statusText} ${minutes} minutes`);
          }
        }
      ]
    );
  };

  const handleReject = () => {
    Alert.alert(
      "Confirm Rejection",
      "Are you sure you want to reject this order?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            await onUpdateStatus(order._id, "rejected", undefined, rejectReason || undefined);
            setShowRejectModal(false);
            setRejectReason("");
            // Modal will be closed by handleStatusUpdate
          }
        }
      ]
    );
  };

  const handleMarkAsCompleted = (orderId: Id<"orders">) => {
    Alert.alert(
      "Mark as Completed",
      "Are you sure you want to mark this order as completed?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          onPress: async () => {
            await onUpdateStatus(orderId, "completed");
            Alert.alert("Success", "Order marked as completed successfully!");
            // Modal will be closed by handleStatusUpdate
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Order Details</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Customer Info */}
          <View style={styles.orderCard}>
            <Text style={styles.sectionTitle}>Customer Information</Text>
            <Text style={styles.customerName}>Name: {order.customerName}</Text>
            <Text style={styles.customerPhone}>Phone: {order.customerMobile || "Not provided"}</Text>
            <Text style={styles.orderDate}>
              Ordered: {new Date(order._creationTime).toLocaleDateString()} at{" "}
              {new Date(order._creationTime).toLocaleTimeString()}
            </Text>
            {order.deliveryAddress && (
              <View style={styles.deliveryInfo}>
                <Text style={styles.deliveryLabel}>Delivery Address:</Text>
                <Text style={styles.deliveryAddress}>{order.deliveryAddress.address}</Text>
                <TouchableOpacity 
                  style={styles.detailDirectionsButton}
                  onPress={() => openDirections(order.deliveryAddress)}
                >
                  <Text style={styles.detailDirectionsButtonText}>📍 Get Directions</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Items Details */}
          <View style={styles.orderCard}>
            <Text style={styles.sectionTitle}>Order Items</Text>
            {order.items.map((item: any, index: number) => (
              <View key={index} style={styles.itemRow}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                <Text style={styles.itemPrice}>₹{item.price || 0}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalAmount}>₹{order.totalAmount || 0}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          {/* Action buttons - only show for active orders, not history */}
          {!isHistoryMode && (
            <>
              {order.status === "pending" && (
                <View style={styles.actionContainer}>
                  <TouchableOpacity
                    style={styles.deliverButton}
                    onPress={() => setShowDeliveryOptions(true)}
                  >
                    <Text style={styles.deliverButtonText}>Accept & Set Delivery Time</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => setShowRejectModal(true)}
                  >
                    <Text style={styles.rejectButtonText}>Reject Order</Text>
                  </TouchableOpacity>
                </View>
              )}

              {order.status === "confirmed" && (
                <View style={styles.actionContainer}>
                  <TouchableOpacity
                    style={styles.deliverButton}
                    onPress={() => setShowDeliveryOptions(true)}
                  >
                    <Text style={styles.deliverButtonText}>Update Delivery Time</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => setShowRejectModal(true)}
                  >
                    <Text style={styles.rejectButtonText}>Cancel Order</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Full-width Mark as Completed button */}
              {order.status === "confirmed" && (
                <TouchableOpacity
                  style={styles.fullWidthCompleteButton}
                  onPress={() => handleMarkAsCompleted(order._id)}
                >
                  <Text style={styles.fullWidthCompleteButtonText}>Mark as Completed</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </ScrollView>

        {/* Delivery Time Options Modal */}
        <Modal
          visible={showDeliveryOptions}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Delivery Time</Text>
              {deliveryTimes.map((minutes) => (
                <TouchableOpacity
                  key={minutes}
                  style={styles.timeOption}
                  onPress={() => handleDeliveryTime(minutes)}
                >
                  <Text style={styles.timeOptionText}>{minutes} minutes</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.cancelOption}
                onPress={() => setShowDeliveryOptions(false)}
              >
                <Text style={styles.cancelOptionText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Reject Reason Modal */}
        <Modal
          visible={showRejectModal}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Reject Order</Text>
              <Text style={styles.modalSubtitle}>Reason (Optional):</Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="Enter reason for rejection..."
                value={rejectReason}
                onChangeText={setRejectReason}
                multiline
                numberOfLines={3}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowRejectModal(false);
                    setRejectReason("");
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalRejectButton}
                  onPress={handleReject}
                >
                  <Text style={styles.modalRejectText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 18,
    color: "#6B7280",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loading: {
    textAlign: "center",
    fontSize: 16,
    color: "#6B7280",
    marginTop: 40,
  },
  emptyState: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderDate: {
    fontSize: 14,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  customerInfo: {
    marginBottom: 16,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  customerAddress: {
    fontSize: 14,
    color: "#6B7280",
  },
  itemsSection: {
    marginBottom: 16,
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
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
    marginHorizontal: 8,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    textAlign: "right",
    marginBottom: 16,
  },
  orderActions: {
    gap: 12,
  },
  directionsButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  directionsButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  statusActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  confirmButton: {
    backgroundColor: "#10B981",
  },
  cancelButton: {
    backgroundColor: "#EF4444",
  },
  preparingButton: {
    backgroundColor: "#F59E0B",
  },
  // New styles for simplified view
  customerDistance: {
    fontSize: 14,
    color: "#10B981",
  },
  orderSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  itemCount: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  // Order Details Modal styles
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  actionContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  deliverButton: {
    flex: 1,
    backgroundColor: "#10B981",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  deliverButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  rejectButton: {
    flex: 1,
    backgroundColor: "#EF4444",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  rejectButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  fullWidthCompleteButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 0,
    backgroundColor: "#059669",
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  fullWidthCompleteButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 16,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 8,
  },
  timeOption: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: "center",
  },
  timeOptionText: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
  },
  cancelOption: {
    backgroundColor: "#EF4444",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    alignItems: "center",
  },
  cancelOptionText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
    marginBottom: 16,
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalCancelText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
  modalRejectButton: {
    flex: 1,
    backgroundColor: "#EF4444",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalRejectText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  deliveryInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  deliveryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  deliveryAddress: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  detailDirectionsButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  detailDirectionsButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
});
