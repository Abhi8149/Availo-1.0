import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  Animated,
  ScrollView,
  Dimensions,
  Alert,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import ItemImage from "../common/ItemImage";
import ShopImage from "../common/ShopImage";
import { DirectionsService } from "../../services/directionsService";
import ItemDetailsModal from "./ItemDetailsModal";
import ShopCartModal from "./ShopCartModal";

import { Shop, CartItem } from "../../types/interfaces";

interface ShopInventoryModalProps {
  visible: boolean;
  onClose: () => void;
  shop: Shop;
  userLocation?: { latitude: number; longitude: number } | null;
  onAddToWishlist?: (item: any) => void;
  wishlistItems?: any[];
  onAddToFavourites?: (shop: Shop) => void;
  onRemoveFromFavourites?: (shopId: Id<"shops">) => void;
  isFavourite?: boolean;
  cartItems?: CartItem[];
  onAddToCart?: (item: any) => void;
  onRemoveFromCart?: (itemId: Id<"items">) => void;
  onUpdateQuantity?: (itemId: Id<"items">, newQuantity: number) => void;
  onIncreaseQuantity?: (itemId: Id<"items">) => void;
  onDecreaseQuantity?: (itemId: Id<"items">) => void;
  onBookItems?: (items: CartItem[]) => void;
  onViewOrders?: () => void; // New prop for viewing orders
  hasOrders?: boolean; // New prop to check if customer has orders
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ShopInventoryModal({ 
  visible, 
  onClose, 
  shop, 
  userLocation,
  onAddToWishlist, 
  wishlistItems = [],
  onAddToFavourites,
  onRemoveFromFavourites,
  isFavourite = false,
  cartItems = [],
  onAddToCart,
  onRemoveFromCart,
  onUpdateQuantity,
  onIncreaseQuantity,
  onDecreaseQuantity,
  onBookItems,
  onViewOrders,
  hasOrders = false
}: ShopInventoryModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const handleToggleFavourite = () => {
    if (isFavourite) {
      onRemoveFromFavourites?.(shop._id);
      Alert.alert("Removed from Favourites", `${shop.name} has been removed from your favourites.`);
    } else {
      const favouriteShop = {
        ...shop,
        addedAt: Date.now(),
      };
      onAddToFavourites?.(favouriteShop);
      Alert.alert("Added to Favourites", `${shop.name} has been added to your favourites.`);
    }
  };
  const [itemDetailsVisible, setItemDetailsVisible] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  const items = useQuery(api.items.getItemsByShop, { shopId: shop._id });

  // Function to calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  };

  // Calculate delivery availability
  const calculateDeliveryAvailability = (item: any) => {
    // Check if shop has delivery service
    const hasDelivery = shop.hasDelivery === true;
    
    console.log('Delivery calculation for item:', item.name);
    console.log('Shop hasDelivery:', shop.hasDelivery);
    console.log('Shop deliveryRange:', shop.deliveryRange);
    console.log('User location:', userLocation);
    console.log('Shop location:', shop.location);
    
    if (!hasDelivery) {
      console.log('Shop does not have delivery service');
      return {
        ...item,
        isDeliveryAvailable: false,
        isInDeliveryRange: false
      };
    }

    // If user location is not available, we can't determine range
    if (!userLocation || !shop.location) {
      console.log('Missing location data - userLocation:', !!userLocation, 'shopLocation:', !!shop.location);
      return {
        ...item,
        isDeliveryAvailable: true,
        isInDeliveryRange: false
      };
    }

    // Calculate distance between customer and shop
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      shop.location.lat,
      shop.location.lng
    );

    // Check if customer is within delivery range
    const deliveryRange = shop.deliveryRange || 0;
    const isInRange = distance <= deliveryRange;

    console.log('Distance calculated:', distance, 'km');
    console.log('Delivery range:', deliveryRange, 'km');
    console.log('Is in range:', isInRange);

    return {
      ...item,
      isDeliveryAvailable: true,
      isInDeliveryRange: isInRange,
      distance: distance
    };
  };

  // Helper functions
  const formatEstimatedTime = (estimatedTime: any) => {
    if (!estimatedTime) return null;
    const { hours, minutes, action } = estimatedTime;
    const totalMinutes = hours * 60 + minutes;
    
    if (totalMinutes === 0) return null;
    
    const timeText = `${action === "opening" ? "Opening" : "Closing"} in ${totalMinutes} min`;
    const isUrgent = totalMinutes <= 10;
    const isOpening = action === "opening";
    
    return {
      text: timeText,
      isUrgent,
      isOpening,
      totalMinutes
    };
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

  // Handle image scroll to update indicators
  const handleImageScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / screenWidth);
    setCurrentImageIndex(index);
  };

  // Calculate time info and styles
  const timeInfo = shop.estimatedTime ? formatEstimatedTime(shop.estimatedTime) : null;

  const getEstimatedTimeStyles = () => {
    if (!timeInfo) return null;
    
    let containerStyle = styles.estimatedTimeContainer;
    let textStyle: any = styles.estimatedTime;
    let iconColor = "#2563EB";
    
    if (timeInfo.isUrgent) {
      if (timeInfo.isOpening) {
        containerStyle = styles.estimatedTimeUrgentOpening;
        textStyle = styles.estimatedTimeTextUrgentOpening;
        iconColor = "#16A34A"; // Green for opening
      } else {
        containerStyle = styles.estimatedTimeUrgentClosing;
        textStyle = styles.estimatedTimeTextUrgentClosing;
        iconColor = "#DC2626"; // Red for closing
      }
    }
    
    return {
      containerStyle,
      textStyle,
      iconColor
    };
  };

  // Get all shop images
  const allImages: Id<"_storage">[] = [];
  if (shop.shopImageId) {
    allImages.push(shop.shopImageId);
  }
  if (shop.shopImageIds && shop.shopImageIds.length > 0) {
    allImages.push(...shop.shopImageIds.filter(img => img !== shop.shopImageId));
  }

  // Debounce search term
  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm) {
      setIsSearching(true);
      // Fade out current results
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
    
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setIsSearching(false);
      // Fade in new results
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchTerm, debouncedSearchTerm, fadeAnim]);

  // Reset search when modal is closed
  useEffect(() => {
    if (!visible) {
      setSearchTerm("");
      setDebouncedSearchTerm("");
      setSelectedCategory("all");
      setIsSearching(false);
      setSelectedItem(null);
      setItemDetailsVisible(false);
    }
  }, [visible]);

  // Memoized filtered items for better performance
  const filteredItems = useMemo(() => {
    if (!items) return [];
    
    return items.filter(item => {
      const matchesSearch = !debouncedSearchTerm || 
        item.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [items, debouncedSearchTerm, selectedCategory]);

  // Memoized categories for better performance
  const categories = useMemo(() => {
    if (!items) return ["all"];
    return ["all", ...Array.from(new Set(items.map(item => item.category).filter((cat): cat is string => Boolean(cat))))];
  }, [items]);

  const handleItemPress = (item: any) => {
    setSelectedItem({ ...item, shopName: shop.name, shopId: shop._id });
    setItemDetailsVisible(true);
  };

  const handleItemDetailsClose = () => {
    setItemDetailsVisible(false);
    setSelectedItem(null);
  };

  const renderItem = React.useCallback(({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemHeader}>
          <View style={styles.itemImageContainer}>
            {item.imageId ? (
              <ItemImage imageId={item.imageId} />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="cube-outline" size={20} color="#9CA3AF" />
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
            {item.offer && (
              <Text style={styles.itemOffer}>{item.offer}</Text>
            )}
            {item.category && (
              <Text style={styles.itemCategory}>{item.category}</Text>
            )}
          </View>

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

        {/* Tap to view details indicator */}
        <View style={styles.tapIndicator}>
          <Ionicons name="chevron-forward" size={16} color="#6B7280" />
          <Text style={styles.tapIndicatorText}>Tap for details</Text>
        </View>

        {/* Wishlist Button */}
        {onAddToWishlist && (
          (() => {
            const isInWishlist = wishlistItems.some(wishlistItem => wishlistItem._id === item._id);
            if (isInWishlist) {
              return (
                <TouchableOpacity
                  style={styles.wishlistButtonAdded}
                  onPress={(e) => {
                    e.stopPropagation();
                    // Optional: Could implement remove from wishlist here
                  }}
                >
                  <Ionicons name="heart" size={16} color="#16A34A" />
                  <Text style={styles.wishlistButtonAddedText}>In Wishlist</Text>
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                style={styles.wishlistButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onAddToWishlist({ ...item, shopName: shop.name, shopId: shop._id });
                }}
              >
                <Ionicons name="heart-outline" size={16} color="#F59E0B" />
                <Text style={styles.wishlistButtonText}>Add to Wishlist</Text>
              </TouchableOpacity>
            );
          })()
        )}
      </TouchableOpacity>
    );
  }, [wishlistItems, shop.name, shop._id]);

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
          <ScrollView
            style={styles.fullscreenScrollView}
            contentContainerStyle={styles.fullscreenScrollContent}
            maximumZoomScale={5}
            minimumZoomScale={1}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            bounces={false}
          >
            <ShopImage 
              shopImageId={allImages[selectedImageIndex]} 
              style={styles.fullscreenImage}
              contentFit="contain"
            />
          </ScrollView>
        )}
        
        {/* Zoom Hint */}
        <View style={styles.fullscreenHint}>
          <Text style={styles.fullscreenHintText}>
            {/* Pinch to zoom • Double tap to zoom • Tap outside to close */}
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
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>{shop.name}</Text>
                {shop.isVerified && (
                  <View style={styles.verifiedBadgeModal}>
                    <Ionicons name="shield-checkmark" size={18} color="#10B981" />
                    <Text style={styles.verifiedTextModal}>Verified</Text>
                  </View>
                )}
              </View>
              <Text style={styles.subtitle}>Shop Details & Items</Text>
            </View>
            {/* Cart Button */}
            <TouchableOpacity
              onPress={() => setShowCart(true)}
              style={styles.cartButton}
              activeOpacity={0.7}
            >
              <Ionicons name="cart-outline" size={24} color="#2563EB" />
              {cartItems.filter(item => item.shopId === shop._id).length > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>
                    {cartItems.filter(item => item.shopId === shop._id).length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Favourite Button */}
            <TouchableOpacity
              onPress={handleToggleFavourite}
              style={styles.favouriteButtonHeader}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isFavourite ? "heart" : "heart-outline"}
                size={24}
                color={isFavourite ? "#DC2626" : "#6B7280"}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Enhanced Shop Images Gallery - Full Width & Original Size */}
            {allImages.length > 0 && (
              <View style={styles.imageGalleryFullSize}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  pagingEnabled={true}
                  style={styles.imageScrollViewFullSize}
                  decelerationRate="fast"
                  snapToInterval={screenWidth}
                  snapToAlignment="center"
                  onScroll={handleImageScroll}
                  scrollEventThrottle={16}
                >
                  {allImages.map((imageId, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => setSelectedImageIndex(index)}
                      style={styles.imageContainerFullSize}
                      activeOpacity={0.95}
                    >
                      <View style={styles.shopImageWrapperFullSize}>
                        <ShopImage 
                          shopImageId={imageId} 
                          style={styles.fullSizeShopImage}
                          contentFit="contain"
                          showOriginalSize={true}
                        />
                        {/* Gradient overlay for better text visibility */}
                        <View style={styles.imageOverlayGradient}>
                          <View style={styles.expandHint}>
                            <Ionicons name="expand" size={20} color="#FFFFFF" />
                            <Text style={styles.expandHintText}>Tap to view full size</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                {/* Enhanced Image Indicators */}
                {allImages.length > 1 && (
                  <View style={styles.imageIndicatorsFullSize}>
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
                
                {/* Enhanced Image Counter */}
                <View style={styles.imageCounterFullSize}>
                  <Text style={styles.imageCounterTextFullSize}>
                    {allImages.length > 1 
                      ? `${currentImageIndex + 1} of ${allImages.length}` 
                      : `${allImages.length} photo${allImages.length > 1 ? 's' : ''}`
                    }
                  </Text>
                </View>
              </View>
            )}

            {/* Shop Details Section */}
            <View style={styles.shopDetailsSection}>

              {/* Shop Information */}
              <View style={styles.shopInfoContainer}>
                {/* Shop Header */}
                <View style={styles.shopHeader}>
                  <View style={styles.shopIconContainer}>
                    <Ionicons 
                      name={getCategoryIcon(shop.category) as any} 
                      size={28} 
                      color="#2563EB" 
                    />
                  </View>
                  <View style={styles.shopMainInfo}>
                    <Text style={styles.shopName}>{shop.name}</Text>
                    <Text style={styles.shopCategory}>
                      {shop.category.charAt(0).toUpperCase() + shop.category.slice(1)}
                    </Text>
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

                {/* Delivery Information */}
                {shop.hasDelivery && (
                  <View style={styles.infoRow}>
                    <View style={styles.infoIcon}>
                      <Ionicons name="bicycle" size={20} color="#2563EB" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Delivery Service</Text>
                      <Text style={styles.infoValue}>
                        Available up to {shop.deliveryRange}km
                        {shop.distance !== undefined && shop.distance !== null && (
                          <Text style={styles.deliveryStatus}>
                            {shop.distance <= (shop.deliveryRange ?? 0)
                              ? ' (Available at your location)'
                              : ` (${Math.ceil(shop.distance - (shop.deliveryRange ?? 0))}km outside delivery zone)`}
                          </Text>
                        )}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Emergency Status */}
                {timeInfo && (
                  <View style={styles.emergencySection}>
                    {(() => {
                      const styleInfo = getEstimatedTimeStyles();
                      if (!styleInfo) return null;
                      
                      return (
                        <View style={styleInfo.containerStyle}>
                          <Ionicons name="time-outline" size={16} color={styleInfo.iconColor}/>
                          <Text style={styleInfo.textStyle}>
                            {timeInfo.text}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>
                )}

                {/* Distance and Actions */}
                <View style={styles.distanceActionsContainer}>
                  {shop.distance !== null && shop.distance !== undefined && (
                    <TouchableOpacity 
                      style={styles.distanceContainer}
                      // onPress={handleGetDirections}
                    >
                      <Ionicons name="location-outline" size={16} color="#16A34A" />
                      <Text style={styles.distanceText}>
                        {formatDistance(shop.distance)}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity 
                    style={styles.directionsButton} 
                    onPress={handleGetDirections}
                  >
                    <Ionicons name="navigate" size={16} color="#2563EB" />
                    <Text style={styles.directionsButtonText}>Directions</Text>
                  </TouchableOpacity>
                </View>

                {/* Address */}
                {shop.location.address && (
                  <View style={styles.addressContainer}>
                    <Ionicons name="location" size={14} color="#6B7280" />
                    <Text style={styles.addressText}>
                      {shop.location.address}
                    </Text>
                  </View>
                )}

                {/* Contact */}
                {shop.mobileNumber && (
                  <TouchableOpacity 
                    style={styles.contactContainer}
                    onPress={() => {
                      const phoneNumber = `tel:${shop.mobileNumber}`;
                      Linking.openURL(phoneNumber).catch((err) => {
                        console.error('Error opening phone dialer:', err);
                        Alert.alert("Error", "Unable to open phone dialer");
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="call" size={14} color="#2563EB" />
                    <Text style={styles.contactText}>
                      {shop.mobileNumber}
                    </Text>
                    <Ionicons name="chevron-forward" size={12} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Items Section */}
            <View style={styles.itemsSection}>
              <Text style={styles.itemsSectionTitle}>Available Items</Text>
              
              <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                  <Ionicons name="search" size={20} color="#6B7280" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search items..."
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {isSearching ? (
                    <Ionicons name="reload" size={20} color="#6B7280" />
                  ) : searchTerm.length > 0 ? (
                    <TouchableOpacity onPress={() => setSearchTerm("")}>
                      <Ionicons name="close-circle" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {categories.length > 1 && (
                <View style={styles.categoriesContainer}>
                  <FlatList
                    data={categories}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item}
                    renderItem={({ item: category }) => (
                      <TouchableOpacity
                        style={[
                          styles.categoryButton,
                          selectedCategory === category && styles.categoryButtonSelected,
                        ]}
                        onPress={() => setSelectedCategory(category)}
                      >
                        <Text style={[
                          styles.categoryButtonText,
                          selectedCategory === category && styles.categoryButtonTextSelected,
                        ]}>
                          {category === "all" ? "All" : category.charAt(0).toUpperCase() + category.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.categoriesList}
                  />
                </View>
              )}

              <View style={styles.resultsHeader}>
                <Text style={styles.resultsCount}>
                  {isSearching ? (
                    "Searching..."
                  ) : (
                    `${filteredItems.length} item${filteredItems.length !== 1 ? "s" : ""} found`
                  )}
                </Text>
              </View>

              {filteredItems.length === 0 ? (
                <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
                  <Ionicons name="cube-outline" size={64} color="#9CA3AF" />
                  <Text style={styles.emptyTitle}>
                    {items === undefined ? "Loading..." : 
                     items.length === 0 ? "No items available" : "No items match your search"}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {items === undefined ? "Please wait..." :
                     items.length === 0 ? "This shop hasn't added any items yet" :
                     "Try adjusting your search or category filter"}
                  </Text>
                </Animated.View>
              ) : (
                <Animated.View style={{ opacity: fadeAnim }}>
                  <FlatList
                    data={filteredItems}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.itemsList}
                    showsVerticalScrollIndicator={false}
                    removeClippedSubviews={true}
                    maxToRenderPerBatch={10}
                    windowSize={10}
                    initialNumToRender={8}
                    scrollEnabled={false}
                  />
                </Animated.View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Fullscreen Image Modal */}
      <ImageFullscreenModal />

      {/* Item Details Modal */}
      <ItemDetailsModal
        visible={itemDetailsVisible}
        onClose={() => {
          setItemDetailsVisible(false);
          setSelectedItem(null);
        }}
        item={selectedItem ? calculateDeliveryAvailability(selectedItem) : null}
        onAddToWishlist={onAddToWishlist}
        isInWishlist={selectedItem ? wishlistItems.some(wishlistItem => wishlistItem._id === selectedItem._id) : false}
        onAddToCart={onAddToCart}
        isInCart={selectedItem ? cartItems.some(cartItem => cartItem._id === selectedItem._id) : false}
      />

      {/* Cart Modal */}
      <ShopCartModal
        visible={showCart}
        onClose={() => setShowCart(false)}
        cartItems={cartItems}
        shopId={shop._id}
        shopName={shop.name}
        onBookNow={onBookItems || (() => {})}
        onRemoveFromCart={onRemoveFromCart || (() => {})}
        onUpdateQuantity={onUpdateQuantity}
        onIncreaseQuantity={onIncreaseQuantity}
        onDecreaseQuantity={onDecreaseQuantity}
        onViewOrders={onViewOrders}
        hasOrders={hasOrders}
        hasDelivery={shop.hasDelivery}
      />
    </>
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
  headerInfo: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
  },
  favouriteButtonHeader: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
  },
  cartButton: {
    padding: 8,
    position: 'relative',
    marginRight: 8,
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  
  // Shop Details Section
  shopDetailsSection: {
    backgroundColor: "#FFFFFF",
  },
  
  // Enhanced Full-Size Image Gallery Styles
  imageGalleryFullSize: {
    position: "relative",
    width: "100%",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  imageScrollViewFullSize: {
    height: screenHeight * 0.45, // Increased to 45% for better original size display
    minHeight: 350, // Increased minimum height
    maxHeight: 600, // Increased maximum height for larger screens
    width: "100%",
  },
  imageContainerFullSize: {
    width: screenWidth,
    height: screenHeight * 0.45,
    minHeight: 350,
    maxHeight: 600,
    position: "relative",
  },
  shopImageWrapperFullSize: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F8FAFC",
    position: "relative",
  },
  fullSizeShopImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlayGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  expandHint: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  expandHintText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
  },
  imageIndicatorsFullSize: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  indicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  imageCounterFullSize: {
    position: "absolute",
    bottom: 24,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backdropFilter: "blur(10px)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  imageCounterTextFullSize: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  
  // Legacy image gallery styles
  imageGallery: {
    position: "relative",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  imageScrollView: {
    height: screenHeight * 0.35, // Use 35% of screen height for more immersive experience
    minHeight: 280, // Minimum height for smaller screens
    maxHeight: 400, // Maximum height for larger screens
  },
  imageContainer: {
    width: screenWidth,
    height: screenHeight * 0.35,
    minHeight: 280,
    maxHeight: 400,
  },
  shopImageWrapper: {
    width: "100%",
    height: "100%",
    borderRadius: 0,
    overflow: "hidden",
    backgroundColor: "#F3F4F6", // Fallback background color
  },
  imageCounter: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backdropFilter: "blur(10px)",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  imageCounterText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  shopInfoContainer: {
    padding: 20,
  },
  shopHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  shopIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  shopMainInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
  },
  shopCategory: {
    fontSize: 14,
    color: "#6B7280",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
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
    fontSize: 12,
    fontWeight: "600",
  },
  statusTextOpen: {
    color: "#16A34A",
  },
  statusTextClosed: {
    color: "#DC2626",
  },
  emergencySection: {
    marginBottom: 16,
  },
  estimatedTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  estimatedTime: {
    fontSize: 14,
    color: "#2563EB",
    fontWeight: "500",
  },
  estimatedTimeUrgentOpening: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  estimatedTimeUrgentClosing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  estimatedTimeTextUrgentOpening: {
    fontSize: 14,
    color: "#16A34A",
    fontWeight: "600",
  },
  estimatedTimeTextUrgentClosing: {
    fontSize: 14,
    color: "#DC2626",
    fontWeight: "600",
  },
  distanceActionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  distanceContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
  },
  distanceText: {
    fontSize: 14,
    color: "#16A34A",
    fontWeight: "600",
  },
  tapForDirections: {
    fontSize: 11,
    color: "#16A34A",
    fontStyle: "italic",
  },
  directionsButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    gap: 6,
  },
  directionsButtonText: {
    fontSize: 14,
    color: "#2563EB",
    fontWeight: "500",
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginBottom: 12,
  },
  addressText: {
    fontSize: 13,
    color: "#6B7280",
    flex: 1,
    lineHeight: 18,
  },
  contactContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  contactText: {
    fontSize: 13,
    color: "#2563EB",
    fontWeight: "500",
    flex: 1,
  },

  // Items Section
  itemsSection: {
    backgroundColor: "#FFFFFF",
    flex: 1,
  },
  itemsSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
  },
  categoriesContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  categoriesList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryButtonSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  categoryButtonText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  categoryButtonTextSelected: {
    color: "#FFFFFF",
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  resultsCount: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  emptyState: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
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
    paddingBottom: 20,
    gap: 12,
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 2,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  itemImageContainer: {
    width: 50,
    height: 50,
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
  itemOffer: {
    fontSize: 13,
    color: '#B45309',
    fontWeight: '600',
    backgroundColor: '#FEF9C3',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 2,
    alignSelf: 'flex-start',
  },
  itemCategory: {
    fontSize: 12,
    color: "#9CA3AF",
    textTransform: "capitalize",
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
    fontSize: 12,
    fontWeight: "600",
  },
  stockTextInStock: {
    color: "#16A34A",
  },
  stockTextOutOfStock: {
    color: "#DC2626",
  },
  tapIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 4,
  },
  tapIndicatorText: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
  },
  wishlistButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  wishlistButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#F59E0B",
  },
  wishlistButtonAdded: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#DCFCE7",
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  wishlistButtonAddedText: {
    fontSize: 12,
    fontWeight: "500",
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
  fullscreenImage: {
    width: screenWidth,
    height: screenHeight * 0.8,
    maxWidth: "100%",
    maxHeight: "100%",
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
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
    gap: 12,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: "#1F2937",
    fontWeight: "500",
  },
  deliveryStatus: {
    fontSize: 14,
    color: "#6B7280",
  },
  // Verification badge styles for modal
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  verifiedBadgeModal: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  verifiedTextModal: {
    fontSize: 13,
    color: "#10B981",
    fontWeight: "600",
  },
});