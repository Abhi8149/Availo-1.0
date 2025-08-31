import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Id } from "../../convex/_generated/dataModel";
import ShopImage from "../common/ShopImage";
import { DirectionsService } from "../../services/directionsService";

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
  mobileNumber?: string;
  shopImageId?: Id<"_storage">;
  estimatedTime?: {
    hours: number;
    minutes: number;
    action: "opening" | "closing";
  };
  businessHours?: {
    openTime: string; // Format: "09:00" 
    closeTime: string; // Format: "18:00"
  };
  hasDelivery?: boolean;
  deliveryRange?: number;
  distance?: number | null; // Distance in kilometers
}

interface ShopCardProps {
  shop: Shop;
  onViewInventory?: () => void;
  showInventoryButton?: boolean;
}

export default function ShopCard({ shop, onViewInventory, showInventoryButton = false }: ShopCardProps) {
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
    const isUrgent = totalMinutes <= 10; // Changed from 5 to 10 minutes for better UX
    const isOpening = action === "opening";
    
    return {
      text: timeText,
      isUrgent,
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
    if (totalMinutes <= 5) return 'critical'; // 0-5 minutes
    if (totalMinutes <= 10) return 'urgent';  // 6-10 minutes
    if (totalMinutes <= 30) return 'warning'; // 11-30 minutes
    return 'normal'; // 30+ minutes
  };

  const formatDistance = (distance: number | null | undefined) => {
    if (distance === null || distance === undefined) return null;
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m away`;
    }
    return `${distance}km away`;
  };

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

  const handleGetDirections = async () => {
    const { lat, lng, address } = shop.location;
    
    try {
      await DirectionsService.openDirections({
        latitude: lat,
        longitude: lng,
        shopName: shop.name,
        address: address
      });
    } catch (error) {
      console.error('Error opening directions:', error);
      Alert.alert("Error", "Unable to open directions");
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onViewInventory}
      activeOpacity={onViewInventory ? 0.8 : 1}
      disabled={!onViewInventory}
    >
      {/* Shop Image */}
      {shop.shopImageId && (
        <View style={styles.imageContainer}>
          <ShopImage shopImageId={shop.shopImageId} />
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name={getCategoryIcon(shop.category) as any} 
            size={24} 
            color="#2563EB" 
          />
        </View>
        <View style={styles.shopInfo}>
          <Text style={styles.shopName}>{shop.name}</Text>
          <Text style={styles.category}>{shop.category.charAt(0).toUpperCase() + shop.category.slice(1)}</Text>
          {shop.location.address && (
            <Text style={styles.address} numberOfLines={1}>
              {shop.location.address}
            </Text>
          )}
          
          {/* Business Hours Display */}
          {shop.businessHours && (
            <View style={styles.businessHoursContainer}>
              <Ionicons name="time-outline" size={12} color="#6B7280" />
              <Text style={styles.businessHoursText}>
                Regular hours: {formatBusinessHours(shop.businessHours)}
              </Text>
            </View>
          )}
          
          {/* Delivery Information */}
          {shop.hasDelivery && (
            <View style={styles.deliveryContainer}>
              <Ionicons name="bicycle" size={12} color="#2563EB" />
              <Text style={styles.deliveryText}>
                Delivers up to {shop.deliveryRange}km
                {shop.distance && shop.distance <= (shop.deliveryRange ?? 0) 
                  ? ' (Available here)'
                  : ' (Out of range)'}
              </Text>
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

      {/* Enhanced Estimated Time with Multiple Urgency Levels */}
      {shop.estimatedTime && (() => {
        const timeInfo = formatEstimatedTime(shop.estimatedTime);
        if (!timeInfo) return null;
        
        const urgencyLevel = getUrgencyLevel(timeInfo.totalMinutes);
        
        const getTimeStyle = () => {
          if (timeInfo.isOpening) {
            switch (urgencyLevel) {
              case 'critical':
                return styles.estimatedTimeCriticalOpening;
              case 'urgent':
                return styles.estimatedTimeUrgentOpening;
              case 'warning':
                return styles.estimatedTimeWarningOpening;
              default:
                return styles.estimatedTimeNormalOpening;
            }
          } else {
            switch (urgencyLevel) {
              case 'critical':
                return styles.estimatedTimeCriticalClosing;
              case 'urgent':
                return styles.estimatedTimeUrgentClosing;
              case 'warning':
                return styles.estimatedTimeWarningClosing;
              default:
                return styles.estimatedTimeNormalClosing;
            }
          }
        };
        
        const getTextStyle = () => {
          if (timeInfo.isOpening) {
            switch (urgencyLevel) {
              case 'critical':
                return styles.estimatedTimeTextCriticalOpening;
              case 'urgent':
                return styles.estimatedTimeTextUrgentOpening;
              case 'warning':
                return styles.estimatedTimeTextWarningOpening;
              default:
                return styles.estimatedTimeTextNormalOpening;
            }
          } else {
            switch (urgencyLevel) {
              case 'critical':
                return styles.estimatedTimeTextCriticalClosing;
              case 'urgent':
                return styles.estimatedTimeTextUrgentClosing;
              case 'warning':
                return styles.estimatedTimeTextWarningClosing;
              default:
                return styles.estimatedTimeTextNormalClosing;
            }
          }
        };
        
        const getIconColor = () => {
          if (timeInfo.isOpening) {
            switch (urgencyLevel) {
              case 'critical':
                return "#059669"; // Emerald-600 - brightest green
              case 'urgent':
                return "#16A34A"; // Green-600
              case 'warning':
                return "#65A30D"; // Lime-600
              default:
                return "#2563EB"; // Blue-600
            }
          } else {
            switch (urgencyLevel) {
              case 'critical':
                return "#DC2626"; // Red-600 - brightest red
              case 'urgent':
                return "#EA580C"; // Orange-600
              case 'warning':
                return "#D97706"; // Amber-600
              default:
                return "#2563EB"; // Blue-600
            }
          }
        };
        
        const getIconName = () => {
          if (urgencyLevel === 'critical') {
            return timeInfo.isOpening ? "flash" : "warning";
          }
          return "time-outline";
        };
        
        return (
          <View style={getTimeStyle()}>
            <Ionicons name={getIconName() as any} size={14} color={getIconColor()}/>
            <Text style={getTextStyle()}>
              {timeInfo.text}
            </Text>
          </View>
        );
      })()}

      {/* Distance */}
      {shop.distance !== null && shop.distance !== undefined && (
        <View style={styles.distanceContainer}>
          <Ionicons name="location-outline" size={14} color="#16A34A" />
          <Text style={styles.distanceText}>
            {formatDistance(shop.distance)}
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.lastUpdated}>
          Updated {formatLastUpdated(shop.lastUpdated)}
        </Text>
        <View style={styles.actions}>
          {showInventoryButton && onViewInventory && (
            <TouchableOpacity style={styles.inventoryButton} onPress={onViewInventory}>
              <Ionicons name="cube-outline" size={16} color="#2563EB" />
              <Text style={styles.inventoryText}>Items</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.directionsButton} onPress={handleGetDirections}>
            <Ionicons name="navigate" size={16} color="#2563EB" />
            <Text style={styles.directionsText}>Directions</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  imageContainer: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  shopImage: {
    width: "100%",
    height: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  shopInfo: {
    flex: 1,
    marginRight: 12,
  },
  shopName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  category: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  address: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  businessHoursContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  businessHoursText: {
    fontSize: 11,
    color: "#6B7280",
    fontStyle: "italic",
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
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
  
  // Enhanced Estimated Time Styles with Multiple Urgency Levels
  // Normal Opening Styles
  estimatedTimeNormalOpening: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  estimatedTimeTextNormalOpening: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "500",
  },
  
  // Warning Opening Styles (11-30 minutes)
  estimatedTimeWarningOpening: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  estimatedTimeTextWarningOpening: {
    fontSize: 12,
    color: "#65A30D",
    fontWeight: "600",
  },
  
  // Urgent Opening Styles (6-10 minutes)
  estimatedTimeUrgentOpening: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#16A34A",
    shadowColor: "#16A34A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  estimatedTimeTextUrgentOpening: {
    fontSize: 12,
    color: "#16A34A",
    fontWeight: "700",
  },
  
  // Critical Opening Styles (0-5 minutes)
  estimatedTimeCriticalOpening: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    alignSelf: "flex-start",
    borderWidth: 2,
    borderColor: "#059669",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  estimatedTimeTextCriticalOpening: {
    fontSize: 13,
    color: "#059669",
    fontWeight: "800",
  },
  
  // Normal Closing Styles
  estimatedTimeNormalClosing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  estimatedTimeTextNormalClosing: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "500",
  },
  
  // Warning Closing Styles (11-30 minutes)
  estimatedTimeWarningClosing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#FFFBEB",
    borderRadius: 10,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  estimatedTimeTextWarningClosing: {
    fontSize: 12,
    color: "#D97706",
    fontWeight: "600",
  },
  
  // Urgent Closing Styles (6-10 minutes)
  estimatedTimeUrgentClosing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#FFF7ED",
    borderRadius: 10,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#EA580C",
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  estimatedTimeTextUrgentClosing: {
    fontSize: 12,
    color: "#EA580C",
    fontWeight: "700",
  },
  
  // Critical Closing Styles (0-5 minutes)
  estimatedTimeCriticalClosing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    alignSelf: "flex-start",
    borderWidth: 2,
    borderColor: "#DC2626",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  estimatedTimeTextCriticalClosing: {
    fontSize: 13,
    color: "#DC2626",
    fontWeight: "800",
  },
  
  // Legacy styles (keeping for compatibility)
  estimatedTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  estimatedTime: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "500",
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  distanceText: {
    fontSize: 12,
    color: "#16A34A",
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastUpdated: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  inventoryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    gap: 4,
  },
  inventoryText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "500",
  },

  directionsButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    gap: 4,
  },
  directionsText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "500",
  },
  deliveryContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  deliveryText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "500",
  },
});