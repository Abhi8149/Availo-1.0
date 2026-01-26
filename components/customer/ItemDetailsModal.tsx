import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Id } from "../../convex/_generated/dataModel";
import ItemImage from "../common/ItemImage";
import ZoomableItemImage from "../common/ZoomableItemImage";
// import ShopDetailsModal from "./ShopDetailsModal";

interface Item {
  _id: Id<"items">;
  name: string;
  description?: string;
  price?: number;
  priceDescription?: string;
  category?: string;
  imageId?: Id<"_storage">;
  imageIds?: Id<"_storage">[];
  inStock: boolean;
  createdAt: number;
  updatedAt: number;
  shopName?: string;
  shopId?: Id<"shops">;
  offer?: string;
  isDeliveryAvailable?: boolean;
  isInDeliveryRange?: boolean;
}

interface ItemDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  item: Item | null;
  onAddToWishlist?: (item: Item) => void;
  isInWishlist?: boolean;
  onShopPress?: (shopId: Id<"shops">) => void;
  onAddToCart?: (item: Item) => void;
  isInCart?: boolean;
}

export default function ItemDetailsModal({ 
  visible, 
  onClose, 
  item, 
  onAddToWishlist,
  isInWishlist = false,
  onShopPress,
  onAddToCart,
  isInCart = false
}: ItemDetailsModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  if (!item) return null;

  const formatPrice = (price?: number) => {
    if (!price) return "Price not specified";
    return `₹${price}`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const getCategoryIcon = (category?: string) => {
    if (!category) return "cube-outline";
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
      other: "cube-outline",
    };
    return icons[category] || "cube-outline";
  };

  const handleAddToCart = () => {
    if (onAddToCart && item) {
      onAddToCart(item);
      Alert.alert(
        "Added to Cart",
        `${item.name} has been added to your cart. Complete your booking by going to the shop details.`,
        [{ text: "OK", style: "default" }]
      );
    }
  };

  // Handle image scroll to update indicators
  const handleImageScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / screenWidth);
    setCurrentImageIndex(index);
  };

  // Get all item images
  const allImages: Id<"_storage">[] = [];
  if (item?.imageId) {
    allImages.push(item.imageId);
  }
  if (item?.imageIds && item.imageIds.length > 0) {
    allImages.push(...item.imageIds.filter(img => img !== item.imageId));
  }

  const styles = StyleSheet.create({
    offerSection: {
      marginBottom: 20,
      backgroundColor: '#FEF9C3',
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#FDE68A',
      alignSelf: 'flex-start',
    },
    offerText: {
      fontSize: 16,
      color: '#B45309',
      fontWeight: '600',
    },
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
    closeButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: "#1F2937",
    },
    content: {
      flex: 1,
    },
    
    // Image Section
    imageSection: {
      backgroundColor: "#FFFFFF",
      marginBottom: 8,
    },
    imageContainer: {
      position: "relative",
      width: "100%",
      height: 300,
      backgroundColor: "#F9FAFB",
    },
    imageOverlay: {
      position: "absolute",
      bottom: 16,
      right: 16,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      gap: 4,
    },
    imageOverlayText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "500",
    },
    placeholderImageContainer: {
      width: "100%",
      height: 300,
      backgroundColor: "#F9FAFB",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    placeholderText: {
      fontSize: 14,
      color: "#9CA3AF",
    },

    // Item Info Section
    itemInfoSection: {
      backgroundColor: "#FFFFFF",
      padding: 20,
    },
    itemHeader: {
      marginBottom: 20,
    },
    itemTitleContainer: {
      marginBottom: 12,
    },
    itemName: {
      fontSize: 24,
      fontWeight: "700",
      color: "#1F2937",
      marginBottom: 8,
    },
    categoryContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    categoryText: {
      fontSize: 14,
      color: "#6B7280",
      fontWeight: "500",
    },
    stockBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      alignSelf: "flex-start",
      gap: 6,
    },
    stockInStock: {
      backgroundColor: "#DCFCE7",
    },
    stockOutOfStock: {
      backgroundColor: "#FEE2E2",
    },
    stockDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    stockDotInStock: {
      backgroundColor: "#16A34A",
    },
    stockDotOutOfStock: {
      backgroundColor: "#DC2626",
    },
    stockText: {
      fontSize: 12,
      fontWeight: "600",
    },
    stockTextInStock: {
      color: "#16A34A",
    },
    stockTextOutOfStock: {
      color: "#DC2626",
    },

    // Sections
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: "#1F2937",
      marginBottom: 8,
    },
    priceSection: {
      marginBottom: 20,
    },
    priceText: {
      fontSize: 20,
      fontWeight: "700",
      color: "#16A34A",
    },
    descriptionSection: {
      marginBottom: 20,
    },
    descriptionText: {
      fontSize: 16,
      color: "#374151",
      lineHeight: 24,
    },
    shopSection: {
      marginBottom: 20,
    },
    shopContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: "#EFF6FF",
      borderRadius: 12,
      alignSelf: "flex-start",
    },
    shopText: {
      fontSize: 14,
      color: "#2563EB",
      fontWeight: "500",
    },
    infoSection: {
      marginBottom: 20,
    },
    infoGrid: {
      gap: 12,
    },
    infoItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: "#F3F4F6",
    },
    infoLabel: {
      fontSize: 14,
      color: "#6B7280",
      fontWeight: "500",
    },
    infoValue: {
      fontSize: 14,
      color: "#1F2937",
      fontWeight: "500",
    },

    // Action Section
    actionSection: {
      padding: 20,
      backgroundColor: "#FFFFFF",
    },
    wishlistButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      backgroundColor: "#F59E0B",
      borderRadius: 12,
      gap: 8,
    },
    wishlistButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#FFFFFF",
    },
    wishlistButtonAdded: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      backgroundColor: "#DCFCE7",
      borderRadius: 12,
      gap: 8,
    },
    wishlistButtonAddedText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#16A34A",
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
      minHeight: screenHeight,
    },
    fullscreenImageContainer: {
      flex: 1,
      width: "100%",
      justifyContent: "center",
      alignItems: "center",
    },
    fullscreenImage: {
      width: screenWidth,
      height: screenHeight * 0.8,
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
    priceDescriptionText: {
      fontSize: 14,
      color: '#6B7280',
      marginTop: 4,
      fontStyle: 'italic',
    },
    cartButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      backgroundColor: "#2563EB",
      borderRadius: 12,
      gap: 8,
      marginBottom: 12,
    },
    cartButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#FFFFFF",
    },
    cartButtonAdded: {
      backgroundColor: "#DCFCE7",
    },
    cartButtonAddedText: {
      color: "#16A34A",
    },
    cartButtonDisabled: {
      backgroundColor: "#E5E7EB",
    },
    cartButtonTextDisabled: {
      color: "#9CA3AF",
    },
    deliveryMessageContainer: {
      backgroundColor: "#FEF2F2",
      padding: 12,
      borderRadius: 8,
      marginBottom: 12,
    },
    deliveryMessageText: {
      color: "#DC2626",
      fontSize: 14,
      textAlign: "center",
      fontWeight: "500",
    },
    imageScrollView: {
      width: screenWidth,
      height: 300,
    },
    imageScrollContainer: {
      width: screenWidth,
      height: 300,
    },
    imageIndicators: {
      position: "absolute",
      bottom: 20,
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 6,
    },
    indicatorDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#FFFFFF",
    },
    imageCounter: {
      position: "absolute",
      top: 16,
      right: 16,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    imageCounterText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "600",
    },
  });

  // Enhanced Fullscreen Image Modal Component
  const ImageFullscreenModal = () => (
    <Modal
      visible={selectedImageIndex !== null}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setSelectedImageIndex(null)}
    >
      <View style={styles.fullscreenContainer}>
        <TouchableOpacity 
          style={styles.fullscreenCloseButton}
          onPress={() => setSelectedImageIndex(null)}
        >
          <Ionicons name="close" size={30} color="#FFFFFF" />
        </TouchableOpacity>
        
        {selectedImageIndex !== null && allImages[selectedImageIndex] && (
          <View style={styles.fullscreenImageContainer}>
            <ZoomableItemImage 
              imageUrl={allImages[selectedImageIndex]} 
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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="arrow-back" size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Item Details</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Item Image Carousel */}
            <View style={styles.imageSection}>
              {allImages.length > 0 ? (
                <View style={styles.imageContainer}>
                  <ScrollView
                    horizontal
                    pagingEnabled={true}
                    showsHorizontalScrollIndicator={false}
                    style={styles.imageScrollView}
                    onScroll={handleImageScroll}
                    scrollEventThrottle={16}
                    snapToInterval={screenWidth}
                    snapToAlignment="center"
                    decelerationRate="fast"
                  >
                    {allImages.map((imageId, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => setSelectedImageIndex(index)}
                        style={styles.imageScrollContainer}
                        activeOpacity={0.8}
                      >
                        <ItemImage 
                          imageUrl={imageId} 
                          showOriginalSize={true}
                          contentFit="contain"
                        />
                        <View style={styles.imageOverlay}>
                          <Ionicons name="expand" size={20} color="#FFFFFF" />
                          <Text style={styles.imageOverlayText}>Tap for full size</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  
                  {/* Image Indicators */}
                  {allImages.length > 1 && (
                    <View style={styles.imageIndicators}>
                      {allImages.map((_, index) => (
                        <View
                          key={index}
                          style={[
                            styles.indicatorDot,
                            { 
                              opacity: index === currentImageIndex ? 1 : 0.4,
                              transform: [{ scale: index === currentImageIndex ? 1.2 : 1 }]
                            }
                          ]}
                        />
                      ))}
                    </View>
                  )}
                  
                  {/* Image Counter */}
                  <View style={styles.imageCounter}>
                    <Text style={styles.imageCounterText}>
                      {allImages.length > 1 
                        ? `${currentImageIndex + 1} of ${allImages.length}` 
                        : `${allImages.length} photo${allImages.length > 1 ? 's' : ''}`
                      }
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.placeholderImageContainer}>
                  <Ionicons name="image-outline" size={60} color="#9CA3AF" />
                  <Text style={styles.placeholderText}>No image available</Text>
                </View>
              )}
            </View>

            {/* Item Information */}
            <View style={styles.itemInfoSection}>
              {/* Item Header */}
              <View style={styles.itemHeader}>
                <View style={styles.itemTitleContainer}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <View style={styles.categoryContainer}>
                    <Ionicons 
                      name={getCategoryIcon(item.category) as any} 
                      size={16} 
                      color="#6B7280" 
                    />
                    <Text style={styles.categoryText}>
                      {item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : "Uncategorized"}
                    </Text>
                  </View>
                </View>
                <View style={[styles.stockBadge, item.inStock ? styles.stockInStock : styles.stockOutOfStock]}>
                  <View style={[styles.stockDot, item.inStock ? styles.stockDotInStock : styles.stockDotOutOfStock]} />
                  <Text style={[styles.stockText, item.inStock ? styles.stockTextInStock : styles.stockTextOutOfStock]}>
                    {item.inStock ? "In Stock" : "Out of Stock"}
                  </Text>
                </View>
              </View>

              {/* Price */}
              <View style={styles.priceSection}>
                <Text style={styles.sectionTitle}>Price</Text>
                <Text style={styles.priceText}>{formatPrice(item.price)}</Text>
                {/* Price Description */}
                {item.priceDescription && (
                  <Text style={styles.priceDescriptionText}>{item.priceDescription}</Text>
                )}
              </View>

              {/* Offer/Discount */}
              {item.offer && (
                <View style={styles.offerSection}>
                  <Text style={styles.sectionTitle}>Discount / Offer</Text>
                  <Text style={styles.offerText}>{item.offer}</Text>
                </View>
              )}

              {/* Description */}
              {item.description && (
                <View style={styles.descriptionSection}>
                  <Text style={styles.sectionTitle}>Description</Text>
                  <Text style={styles.descriptionText}>{item.description}</Text>
                </View>
              )}

              {/* Shop Information */}
              {item.shopName && item.shopId && (
                <View style={styles.shopSection}>
                  <Text style={styles.sectionTitle}>Available at</Text>
                  <TouchableOpacity style={styles.shopContainer} onPress={() => item.shopId && onShopPress && onShopPress(item.shopId)}>
                    <Ionicons name="storefront" size={16} color="#2563EB" />
                    <Text style={[styles.shopText, { color: '#2563EB', textDecorationLine: 'underline' }]}>{item.shopName}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Item Information */}
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Item Information</Text>
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Added on</Text>
                    <Text style={styles.infoValue}>{formatDate(item.createdAt)}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Last updated</Text>
                    <Text style={styles.infoValue}>{formatDate(item.updatedAt)}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionSection}>
              {/* Add to Cart Section */}
              {onAddToCart && (
                <>
                  {/* Show Add to Cart button only when delivery is available and in range */}
                  {item.isDeliveryAvailable === true && item.isInDeliveryRange === true ? (
                    <TouchableOpacity
                      style={[
                        styles.cartButton,
                        isInCart && styles.cartButtonAdded,
                        !item.inStock && styles.cartButtonDisabled,
                        isInCart && styles.cartButtonDisabled // Disable when already in cart
                      ]}
                      onPress={() => !isInCart && item.inStock && handleAddToCart()}
                      disabled={!item.inStock || isInCart} // Disable when out of stock OR already in cart
                    >
                      <Ionicons 
                        name={isInCart ? "checkmark-circle" : "cart-outline"} 
                        size={20} 
                        color={isInCart ? "#16A34A" : !item.inStock ? "#9CA3AF" : "#FFFFFF"} 
                      />
                      <Text style={[
                        styles.cartButtonText,
                        isInCart && styles.cartButtonAddedText,
                        !item.inStock && styles.cartButtonTextDisabled
                      ]}>
                        {!item.inStock ? "Out of Stock" : isInCart ? "Added to Cart" : "Add to Cart"}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.deliveryMessageContainer}>
                      <Text style={styles.deliveryMessageText}>
                        {item.isDeliveryAvailable === false 
                          ? "Delivery unavailable - This shop does not offer delivery service" 
                          : item.isDeliveryAvailable === true && item.isInDeliveryRange === false 
                          ? "Delivery status out of range - This shop is outside your delivery range"
                          : "Delivery status unavailable - Unable to determine delivery availability"}
                      </Text>
                    </View>
                  )}
                </>
              )}

              {/* Add to Wishlist Button */}
              {onAddToWishlist && (
                <>
                  {isInWishlist ? (
                    <View style={styles.wishlistButtonAdded}>
                      <Ionicons name="heart" size={20} color="#16A34A" />
                      <Text style={styles.wishlistButtonAddedText}>In Wishlist</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.wishlistButton}
                      onPress={() => onAddToWishlist(item)}
                    >
                      <Ionicons name="heart-outline" size={20} color="#FFFFFF" />
                      <Text style={styles.wishlistButtonText}>Add to Wishlist</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Fullscreen Image Modal */}
      <ImageFullscreenModal />
    </>
  );
}
