import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import AddShopModal from "./AddShopModal";
import EditShopModal from "./EditShopModal";
import ItemsManagement from "./ItemsManagement";
import ShopImage from "../common/ShopImage";
import ShopStatusScheduleModal from "./ShopStatusScheduleModal";
import ShopkeeperSidebar from "./ShopkeeperSidebar";
import { ShopOrdersModal } from "./ShopOrdersModal";

interface User {
  _id: Id<"users">;
  name: string;
  email: string;
  role: "shopkeeper" | "customer";
}

interface ShopkeeperDashboardProps {
  user: User;
  onLogout: () => void;
  onSwitchToCustomer: () => void;
}

// Component to show pending orders count for a shop
const PendingOrdersBadge = ({ shopId }: { shopId: Id<"shops"> }) => {
  const pendingCount = useQuery(api.orders.getPendingOrdersCount, { shopId });
  
  if (!pendingCount || pendingCount === 0) return null;
  
  return (
    <View style={styles.notificationBadge}>
      <Text style={styles.notificationText}>
        {pendingCount > 99 ? '99+' : pendingCount.toString()}
      </Text>
    </View>
  );
};

export default function ShopkeeperDashboard({ user, onLogout, onSwitchToCustomer }: ShopkeeperDashboardProps) {
  const [showAddShop, setShowAddShop] = useState(false);
  const [editShop, setEditShop] = useState<any>(null);
  const [selectedShopForItems, setSelectedShopForItems] = useState<any | null>(null);
  const [scheduleModal, setScheduleModal] = useState<{
    shopId: Id<"shops">;
    currentStatus: boolean;
    shopName: string;
  } | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedShopForOrders, setSelectedShopForOrders] = useState<any | null>(null);
  
  const shops = useQuery(api.shops.getShopsByOwner, { ownerUid: user._id });
  const updateShopStatus = useMutation(api.shops.updateShopStatus);

  const handleToggleStatus = (shopId: Id<"shops">, currentStatus: boolean, shopName: string) => {
    setScheduleModal({ shopId, currentStatus, shopName });
  };

  const handleScheduleStatus = async (minutes: number) => {
    if (!scheduleModal) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    try {
      let estimatedTime;
      
      // If minutes is 0, change status immediately without estimated time
      if (minutes === 0) {
        estimatedTime = undefined;
      } else {
        // Calculate hours and minutes from total minutes
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        
        estimatedTime = {
          hours,
          minutes: remainingMinutes,
          action: scheduleModal.currentStatus ? "closing" as const : "opening" as const,
        };
      }

      await updateShopStatus({
        shopId: scheduleModal.shopId,
        isOpen: minutes === 0 ? !scheduleModal.currentStatus : scheduleModal.currentStatus,
        estimatedTime,
      });

      setScheduleModal(null);
    } catch (error) {
      Alert.alert("Error", "Failed to update shop status");
    }
  };
function timeStringToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}
  const formatLastUpdated = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const formatEstimatedTime = (estimatedTime: any) => {
    if (!estimatedTime) return null;
    const { hours, minutes, action } = estimatedTime;
    const totalMinutes = hours * 60 + minutes;
    
    if (totalMinutes === 0) return null;
    
    const timeText = `${action === "opening" ? "Opening" : "Closing"} in ${totalMinutes} min`;
    const urgencyLevel = getUrgencyLevel(totalMinutes);
    const isOpening = action === "opening";
    
    return {
      text: timeText,
      urgencyLevel,
      isOpening,
      totalMinutes
    };
  };

  const formatBusinessHours = (businessHours: any) => {
    if (!businessHours) return null;
    
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const minute = parseInt(minutes, 10);
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
    };

    const openingTime = formatTime(businessHours.openTime);
    const closingTime = formatTime(businessHours.closeTime);
    
    return `${openingTime} - ${closingTime}`;
  };

  const getUrgencyLevel = (totalMinutes: number) => {
    if (totalMinutes <= 5) return 'critical';
    if (totalMinutes <= 10) return 'urgent';
    if (totalMinutes <= 30) return 'warning';
    return 'normal';
  };

  if (selectedShopForItems) {
    return (
      <SafeAreaView style={styles.container}>
        <ItemsManagement
          shopId={selectedShopForItems._id}
          shopName={selectedShopForItems.name}
          shopOwnerId={user._id}
          shopLocation={selectedShopForItems.location}
          onBack={() => setSelectedShopForItems(null)}
        />
      </SafeAreaView>
    );
  }

  if (shops === undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user.name}!</Text>
          <Text style={styles.subtitle}>Manage your shops</Text>
        </View>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.menuButton}>
          <Ionicons name="menu" size={24} color="#1F2937" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {shops.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="storefront-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No shops yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first shop to start managing your business status
            </Text>
          </View>
        ) : (
          <View style={styles.shopsContainer}>
            {shops.map((shop) => {
              return (
                <TouchableOpacity 
                  key={shop._id} 
                  style={styles.shopCard}
                  onPress={() => setEditShop(shop)}
                  activeOpacity={0.7}
                >
                  {/* Shop Image */}
                  {shop.shopImageId && (
                    <ShopImage shopImageId={shop.shopImageId} />
                  )}

                  <View style={styles.shopHeader}>
                    <View style={styles.shopInfo}>
                      <View style={styles.nameWithEdit}>
                        <Text style={styles.shopName}>{shop.name}</Text>
                        <Ionicons name="create-outline" size={16} color="#9CA3AF" />
                      </View>
                      <Text style={styles.shopCategory}>{shop.category}</Text>
                      {shop.mobileNumber && (
                        <View style={styles.mobileContainer}>
                          <Ionicons name="call" size={14} color="#2563EB" />
                          <Text style={styles.mobileNumber}>{shop.mobileNumber}</Text>
                        </View>
                      )}
                    </View>
                    <View style={[
                      styles.statusBadge,
                      shop.isOpen ? styles.statusOpen : styles.statusClosed,
                    ]}>
                      <View style={[
                        styles.statusDot,
                        shop.isOpen ? styles.statusDotOpen : styles.statusDotClosed,
                      ]} />
                      <Text style={[
                        styles.statusText,
                        shop.isOpen ? styles.statusTextOpen : styles.statusTextClosed,
                      ]}>
                        {shop.isOpen ? "Open" : "Closed"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.lastUpdated}>
                    Last updated: {formatLastUpdated(shop.lastUpdated)}
                  </Text>

                  {/* Business Hours */}
                  {shop.businessHours && (
                    <View style={styles.businessHoursContainer}>
                      <Ionicons name="time-outline" size={14} color="#6B7280" />
                      <Text style={styles.businessHoursText}>
                        Regular hours: {formatBusinessHours(shop.businessHours)}
                      </Text>
                    </View>
                  )}

                  {/* Enhanced Estimated Time */}
                  {shop.estimatedTime && (() => {
                    const timeInfo = formatEstimatedTime(shop.estimatedTime);
                    if (!timeInfo) return null;
                    
                    const getEstimatedTimeStyle = () => {
                      if (timeInfo.isOpening) {
                        switch (timeInfo.urgencyLevel) {
                          case 'critical':
                            return styles.estimatedTimeCriticalOpening;
                          case 'urgent':
                            return styles.estimatedTimeUrgentOpening;
                          case 'warning':
                            return styles.estimatedTimeWarningOpening;
                          default:
                            return styles.estimatedTimeNormal;
                        }
                      } else {
                        switch (timeInfo.urgencyLevel) {
                          case 'critical':
                            return styles.estimatedTimeCriticalClosing;
                          case 'urgent':
                            return styles.estimatedTimeUrgentClosing;
                          case 'warning':
                            return styles.estimatedTimeWarningClosing;
                          default:
                            return styles.estimatedTimeNormal;
                        }
                      }
                    };
                    
                    const getIconName = () => {
                      if (timeInfo.urgencyLevel === 'critical') {
                        return timeInfo.isOpening ? "flash" : "warning";
                      }
                      return "time-outline";
                    };
                    
                    const getIconColor = () => {
                      if (timeInfo.isOpening) {
                        switch (timeInfo.urgencyLevel) {
                          case 'critical':
                            return "#059669";
                          case 'urgent':
                            return "#16A34A";
                          case 'warning':
                            return "#65A30D";
                          default:
                            return "#2563EB";
                        }
                      } else {
                        switch (timeInfo.urgencyLevel) {
                          case 'critical':
                            return "#DC2626";
                          case 'urgent':
                            return "#EA580C";
                          case 'warning':
                            return "#D97706";
                          default:
                            return "#2563EB";
                        }
                      }
                    };
                    
                    // Only render if the estimated time does not match the shop's closing time in minutes
                    if (timeInfo.urgencyLevel) {
                      return (
                        <View style={getEstimatedTimeStyle()}>
                          <Ionicons name={getIconName() as any} size={14} color={getIconColor()} />
                          <Text style={styles.estimatedTimeText}>
                            {timeInfo.text}
                          </Text>
                        </View>
                      );
                    }
                    return null;
                  })()}

                  <View style={styles.shopActions}>
                    <TouchableOpacity
                      style={styles.ordersButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        setSelectedShopForOrders(shop);
                      }}
                    >
                      <View style={styles.ordersButtonContent}>
                        <Ionicons name="receipt-outline" size={16} color="#2563EB" />
                        <Text style={styles.ordersButtonText}>Orders</Text>
                        <PendingOrdersBadge shopId={shop._id} />
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.manageItemsButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        setSelectedShopForItems(shop);
                      }}
                    >
                      <Ionicons name="cube-outline" size={16} color="#2563EB" />
                      <Text style={styles.manageItemsButtonText}>Items</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        shop.isOpen ? styles.toggleButtonClose : styles.toggleButtonOpen,
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(shop._id, shop.isOpen, shop.name);
                      }}
                    >
                      <Ionicons 
                        name={shop.isOpen ? "close-circle" : "checkmark-circle"} 
                        size={16} 
                        color="#FFFFFF" 
                      />
                      <Text style={styles.toggleButtonText}>
                        {shop.isOpen ? "Close" : "Open"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddShop(true)}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Add Shop</Text>
      </TouchableOpacity>

      <AddShopModal
        visible={showAddShop}
        onClose={() => setShowAddShop(false)}
        ownerUid={user._id}
      />

      {/* Edit Shop Modal */}
      <EditShopModal
        visible={!!editShop}
        onClose={() => setEditShop(null)}
        shop={editShop}
        shopOwnerId={user._id}
      />

      {/* Shop Status Schedule Modal */}
      <ShopStatusScheduleModal
        visible={!!scheduleModal}
        onClose={() => setScheduleModal(null)}
        currentStatus={scheduleModal?.currentStatus ?? false}
        shopId={scheduleModal?.shopId ?? ("" as Id<"shops">)}
        shopName={scheduleModal?.shopName ?? ""}
        onSchedule={handleScheduleStatus}
      />

      {/* Sidebar */}
      <ShopkeeperSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        user={user}
        onLogout={onLogout}
        onSwitchToCustomer={onSwitchToCustomer}
      />

      {/* Shop Orders Modal */}
      {selectedShopForOrders && (
        <ShopOrdersModal
          visible={!!selectedShopForOrders}
          onClose={() => setSelectedShopForOrders(null)}
          shopId={selectedShopForOrders._id}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
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
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
  },
  menuButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
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
  shopsContainer: {
    paddingVertical: 20,
    gap: 16,
  },
  shopCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  shopHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  nameWithEdit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  shopCategory: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
    textTransform: "capitalize",
  },
  mobileNumber: {
    fontSize: 14,
    color: "#2563EB",
    marginLeft: 4,
  },
  mobileContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusOpen: {
    backgroundColor: "#DCFCE7",
  },
  statusClosed: {
    backgroundColor: "#FEE2E2",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotOpen: {
    backgroundColor: "#16A34A",
  },
  statusDotClosed: {
    backgroundColor: "#DC2626",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusTextOpen: {
    color: "#16A34A",
  },
  statusTextClosed: {
    color: "#DC2626",
  },
  lastUpdated: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 8,
  },
  businessHoursContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  businessHoursText: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
  },
  estimatedTimeNormal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  estimatedTimeCriticalOpening: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    alignSelf: "flex-start",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#059669",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  estimatedTimeUrgentOpening: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#16A34A",
  },
  estimatedTimeWarningOpening: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  estimatedTimeCriticalClosing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    alignSelf: "flex-start",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#DC2626",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  estimatedTimeUrgentClosing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#FFF7ED",
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EA580C",
  },
  estimatedTimeWarningClosing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#FFFBEB",
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  estimatedTimeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  estimatedTimeTextCriticalOpening: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },
  estimatedTimeTextUrgentOpening: {
    fontSize: 12,
    fontWeight: "600",
    color: "#16A34A",
  },
  estimatedTimeTextWarningOpening: {
    fontSize: 12,
    fontWeight: "600",
    color: "#65A30D",
  },
  estimatedTimeTextCriticalClosing: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },
  estimatedTimeTextUrgentClosing: {
    fontSize: 12,
    fontWeight: "600",
    color: "#EA580C",
  },
  estimatedTimeTextWarningClosing: {
    fontSize: 12,
    fontWeight: "600",
    color: "#D97706",
  },
  estimatedTime: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "500",
    marginBottom: 16,
  },
  shopActions: {
    flexDirection: "row",
    gap: 6,
  },
  ordersButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
    position: "relative",
  },
  ordersButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  ordersButtonText: {
    color: "#D97706",
    fontSize: 12,
    fontWeight: "600",
  },
  notificationBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  notificationText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
  },
  manageItemsButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    gap: 4,
  },
  manageItemsButtonText: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "600",
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
  },
  toggleButtonOpen: {
    backgroundColor: "#16A34A",
  },
  toggleButtonClose: {
    backgroundColor: "#DC2626",
  },
  toggleButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  statusModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  statusModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  statusModalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 24,
  },
  timeInputGroup: {
    alignItems: "center",
  },
  timeLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  timeInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    color: "#1F2937",
    textAlign: "center",
    minWidth: 60,
  },
  timeSeparator: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#6B7280",
    marginTop: 16,
  },
  statusModalActions: {
    flexDirection: "row",
    gap: 12,
  },
  statusModalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  statusModalCancelText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
  statusModalConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    alignItems: "center",
  },
  statusModalConfirmText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});