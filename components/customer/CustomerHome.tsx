// ...existing code...
// export default CustomerHome;
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Animated,
  Alert,
  AppState,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from 'expo-location';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import ShopCard from "./ShopCard";
import ItemDetailsModal from "./ItemDetailsModal";
import ItemImage from "../common/ItemImage";
import ShopMapModal from "./ShopMapModal";
import ShopInventoryModal from "./ShopInventoryModal";
import CustomerSidebar from "./CustomerSidebar";
import NotificationsModal from "./NotificationsModal";
import CustomerOrdersModal from "./CustomerOrdersModal";
import { User, CartItem } from "../../types/interfaces";

interface CustomerHomeProps {
  user: User;
  onLogout: () => void;
  onSwitchToShopkeeper?: () => void;
}

// Constants outside the component
const STATUS_FILTERS = [
  { key: "all", label: "All", value: undefined },
  { key: "open", label: "Open", value: true },
  { key: "closed", label: "Closed", value: false },
];

// Predefined categories (excluding 'other')
const PREDEFINED_CATEGORIES = ["all", "grocery", "electronics", "clothing", "pharmacy", "food"];

const SEARCH_MODES = [
  { key: "shops", label: "Shops", icon: "storefront-outline" },
  { key: "items", label: "Items", icon: "cube-outline" },
];

export default function CustomerHome({ user, onLogout, onSwitchToShopkeeper }: CustomerHomeProps) {
  // State variables
  const [searchMode, setSearchMode] = useState<"shops" | "items">("shops");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const locationWatcherRef = useRef<any>(null);
  const isRequestingPermissionRef = useRef(false);
  const [showLocationPopup, setShowLocationPopup] = useState(false);
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [favouriteShops, setFavouriteShops] = useState<any[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  
  // Animation for popup
  const popupAnim = useRef(new Animated.Value(0)).current;
  // Use a native-driven scroll value to power UI-thread animations
  const scrollY = useRef(new Animated.Value(0)).current;
  // Approx total header height (compact + search mode + search bar + filters + results)
  const TOTAL_HEADER_HEIGHT = 260;
  // Small extra gap between the bottom of the header (status/filters) and the first shop
  const HEADER_TO_SHOPS_GAP = 24;
  // Respect device safe area so header doesn't overlap status bar
  const insets = useSafeAreaInsets();

  // Load cart from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const storedCart = await AsyncStorage.getItem('customer_cart');
        if (storedCart) {
          setCartItems(JSON.parse(storedCart));
        }
      } catch {}
    })();
  }, []);

  // Save cart to AsyncStorage whenever it changes
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem('customer_cart', JSON.stringify(cartItems));
      } catch {}
    })();
  }, [cartItems]);

  const handleAddToCart = useCallback((item: Omit<CartItem, 'quantity'>) => {
    setCartItems(prev => {
      const exists = prev.some(cartItem => cartItem._id === item._id);
      if (exists) return prev;
      return [...prev, { ...item, quantity: 1 }];
    });
    Alert.alert('Success', `${item.name} has been added to your cart`);
  }, []);

  const handleRemoveFromCart = useCallback((itemId: Id<"items">) => {
    setCartItems(prev => prev.filter(item => item._id !== itemId));
  }, []);

  const handleUpdateQuantity = useCallback((itemId: Id<"items">, newQuantity: number) => {
    if (newQuantity <= 0) {
      // Remove item if quantity becomes 0
      handleRemoveFromCart(itemId);
      return;
    }
    
    setCartItems(prev => 
      prev.map(item => 
        item._id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  }, [handleRemoveFromCart]);

  const handleIncreaseQuantity = useCallback((itemId: Id<"items">) => {
    setCartItems(prev => 
      prev.map(item => 
        item._id === itemId ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  }, []);

  const handleDecreaseQuantity = useCallback((itemId: Id<"items">) => {
    setCartItems(prev => 
      prev.map(item => {
        if (item._id === itemId) {
          const newQuantity = item.quantity - 1;
          return newQuantity <= 0 ? item : { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  }, []);

  // Order creation mutation
  const createOrder = useMutation(api.orders.createOrder);

  const handleBookItems = useCallback(async (items: CartItem[]) => {
    if (!user) {
      Alert.alert('Error', 'Please log in to place an order');
      return;
    }

    if (!userLocation) {
      Alert.alert('Error', 'Location is required to place an order');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Error', 'No items to order');
      return;
    }

    Alert.alert(
      'Confirm Booking',
      `Do you want to book ${items.length} item(s)?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Book Now',
          onPress: async () => {
            try {
              const totalAmount = items.reduce((total, item) => {
                return total + (item.price || 0) * item.quantity;
              }, 0);

              const shopId = items[0].shopId;
              if (!shopId) {
                Alert.alert('Error', 'Invalid shop information');
                return;
              }

              await createOrder({
                shopId,
                customerId: user._id,
                customerName: user.name,
                customerMobile: user.phone || user.email, // Use phone if available, fallback to email
                customerLocation: {
                  lat: userLocation.latitude,
                  lng: userLocation.longitude,
                  address: "Current Location", // You might want to get actual address
                },
                items: items.map(item => ({
                  itemId: item._id,
                  itemName: item.name,
                  quantity: item.quantity,
                  price: item.price,
                })),
                totalAmount,
              });

              Alert.alert('Success', 'Your order has been placed successfully!');
              
              // Additional alert for order tracking
              setTimeout(() => {
                Alert.alert(
                  'Track Your Order', 
                  'Check your order status in Your Orders option',
                  [{ text: 'OK' }]
                );
              }, 1000);
              
              // Remove booked items from cart
              const itemIds = items.map(item => item._id);
              setCartItems(prev => prev.filter(item => !itemIds.includes(item._id)));
            } catch (error) {
              console.error('Order creation failed:', error);
              Alert.alert('Error', 'Failed to place order. Please try again.');
            }
          }
        }
      ]
    );
  }, [user, userLocation, createOrder]);

  const handleViewOrders = useCallback(() => {
    setOrdersVisible(true);
  }, []);

  // Load wishlist from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const storedWishlist = await AsyncStorage.getItem('customer_wishlist');
        if (storedWishlist) {
          setWishlistItems(JSON.parse(storedWishlist));
        }
      } catch {}
    })();
  }, []);

  // Load favourite shops from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const storedFavourites = await AsyncStorage.getItem('customer_favourites');
        if (storedFavourites) {
          setFavouriteShops(JSON.parse(storedFavourites));
        }
      } catch {}
    })();
  }, []);

  // Save wishlist to AsyncStorage whenever it changes
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem('customer_wishlist', JSON.stringify(wishlistItems));
      } catch {}
    })();
  }, [wishlistItems]);

  // Save favourite shops to AsyncStorage whenever it changes
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem('customer_favourites', JSON.stringify(favouriteShops));
      } catch {}
    })();
  }, [favouriteShops]);
  const filtersAnim = useRef(new Animated.Value(1)).current;
  const searchAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [filtersVisible, setFiltersVisible] = useState(true);
  const [headerTouchable, setHeaderTouchable] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [itemDetailsVisible, setItemDetailsVisible] = useState(false);
  const [selectedShopForInventory, setSelectedShopForInventory] = useState<any>(null);
  const [showMap, setShowMap] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [ordersVisible, setOrdersVisible] = useState(false);
  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Dummy isSearching for now
  //Here I have changes a little bit
  const isSearching = false;

  // Check existing location permission and get location automatically
  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      
      console.log('Initial permission check - Status:', status, 'Services enabled:', isLocationEnabled);
      
      // Map expo status to our simplified status
      const newStatus = (status === 'granted' && isLocationEnabled) ? 'granted' : 'denied';
      setLocationPermissionStatus(newStatus);
      
      if (status === 'granted' && isLocationEnabled) {
        console.log('Location permission granted and services enabled - getting current location');
        await getCurrentLocation();
        // Set up location watching for automatic updates
        startLocationWatching();
      } else {
        console.log('Location permission denied or services disabled');
        // Stop location watching if permission is denied
        if (locationWatcherRef.current) {
          locationWatcherRef.current.remove();
          locationWatcherRef.current = null;
        }
      }
    } catch (error) {
      console.error('Error checking location permission:', error);
      setLocationPermissionStatus('denied');
    }
  };

  // Request location permission and get location
  const requestLocationPermission = async () => {
    if (isRequestingPermissionRef.current) {
      return; // Prevent multiple simultaneous requests
    }
    
    try {
      isRequestingPermissionRef.current = true; // Set flag
      console.log('Requesting location permission...');
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      // Use setTimeout to defer state update and prevent React 19 useInsertionEffect issue
      setTimeout(() => {
        setLocationPermissionStatus(status);
      }, 0);
      
      if (status === 'granted') {
        await getCurrentLocation();
        startLocationWatching();
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setTimeout(() => {
        setLocationPermissionStatus('denied');
      }, 0);
      Alert.alert('Location Error', 'Unable to get location permission.');
    } finally {
      isRequestingPermissionRef.current = false; // Clear flag
    }
  };

  // Start watching location for automatic updates
  const startLocationWatching = async () => {
    try {
      // Clear any existing watcher
      if (locationWatcherRef.current) {
        locationWatcherRef.current.remove();
      }

      // Watch position for automatic location updates
      const watcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30000, // Update every 30 seconds
          distanceInterval: 100, // Update if moved 100 meters
        },
        (location) => {
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          console.log('Location updated automatically:', {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      );
      
      locationWatcherRef.current = watcher;
    } catch (error) {
      console.error('Error watching location:', error);
    }
  };

  // Check location permission on mount and set up continuous monitoring
  useEffect(() => {
    checkLocationPermission();
    
    // Set up interval to periodically check permission status
    // This will detect when user manually turns off location
    const permissionCheckInterval = setInterval(async () => {
      try {
        if (isRequestingPermissionRef.current) {
          // Skip check if actively requesting permission
          return;
        }
        
        // Check both permission and if location services are enabled
        const { status } = await Location.getForegroundPermissionsAsync();
        const isLocationEnabled = await Location.hasServicesEnabledAsync();
        
        console.log('Periodic permission check - Status:', status, 'Services enabled:', isLocationEnabled);
        
        // Consider location as denied if either permission is denied or services are disabled
        const newStatus = (status === 'granted' && isLocationEnabled) ? 'granted' : 'denied';
        
        // Use direct state update instead of functional update
        setLocationPermissionStatus(newStatus);
      } catch (error) {
        console.error('Error checking location permission:', error);
      }
    }, 3000); // Check every 3 seconds for responsive detection
    
    // Cleanup function to remove location watcher and interval
    return () => {
      if (locationWatcherRef.current) {
        locationWatcherRef.current.remove();
      }
      clearInterval(permissionCheckInterval);
    };
  }, []); // Remove locationPermissionStatus from dependency array

  // Monitor location permission changes and show permanent popup when denied
  useEffect(() => {
    console.log('Permission status changed to:', locationPermissionStatus);
    
    if (locationPermissionStatus === 'denied' || locationPermissionStatus === 'undetermined') {
      if (!showLocationPopup) {
        console.log('Location denied/undetermined - showing permanent popup');
        setShowLocationPopup(true);
        
        // Animate popup in
        Animated.spring(popupAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 8,
        }).start();
      }
    } else if (locationPermissionStatus === 'granted') {
      if (showLocationPopup) {
        console.log('Location granted - hiding popup permanently');
        hidePopup();
      }
    }
  }, [locationPermissionStatus, showLocationPopup]);

  // Listen for app state changes to check permission when app regains focus
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      console.log('App state changed to:', nextAppState);
      
      if (nextAppState === 'active') {
        // Re-check permission when app becomes active (user might have changed settings)
        try {
          const { status } = await Location.getForegroundPermissionsAsync();
          const isLocationEnabled = await Location.hasServicesEnabledAsync();
          
          console.log('App regained focus - Status:', status, 'Services enabled:', isLocationEnabled);
          
          const newStatus = (status === 'granted' && isLocationEnabled) ? 'granted' : 'denied';
          
          // Use direct state update instead of functional update
          setLocationPermissionStatus(newStatus);
        } catch (error) {
          console.error('Error checking location permission on app focus:', error);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, []);

  // Function to hide popup with animation
  const hidePopup = () => {
    if (!showLocationPopup) return; // Prevent updates if already hidden
    
    Animated.timing(popupAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowLocationPopup(false);
    });
  };

  const getCurrentLocation = async () => {
    setIsLocationLoading(true);
    try {
      // Check if location services are enabled
      const serviceEnabled = await Location.hasServicesEnabledAsync();
      if (!serviceEnabled) {
        // Alert.alert(
        //   "Location Services Disabled",
        //   "Please enable location services in your device settings to get nearby shops.",
        //   [{ text: "OK" }]
        // );
        setIsLocationLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      console.log('Location detected:', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy
      });

    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert(
        "Location Error",
        "Unable to get your current location. Please check your location settings and try again.",
        [
          { text: "Retry", onPress: getCurrentLocation },
          { text: "Cancel" }
        ]
      );
    } finally {
      setIsLocationLoading(false);
    }
  };

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

  const handleAddToWishlist = (item: any) => {
    // Check if item already exists in wishlist
    const exists = wishlistItems.some(wishlistItem => wishlistItem._id === item._id);
    
    if (exists) {
      Alert.alert("Already in Wishlist", "This item is already in your wishlist.");
      return;
    }

    const wishlistItem = {
      ...item,
      addedAt: Date.now(),
    };

    setWishlistItems(prev => [...prev, wishlistItem]);
    Alert.alert("Added to Wishlist", `${item.name} has been added to your wishlist.`);
  };

  const handleRemoveFromWishlist = (itemId: any) => {
    setWishlistItems(prev => prev.filter(item => item._id !== itemId));
  };

  const handleAddToFavourites = (shop: any) => {
    // Check if shop already exists in favourites
    const exists = favouriteShops.some(favouriteShop => favouriteShop._id === shop._id);
    
    if (exists) {
      Alert.alert("Already in Favourites", "This shop is already in your favourites.");
      return;
    }

    const favouriteShop = {
      ...shop,
      addedAt: Date.now(),
    };

    setFavouriteShops(prev => [...prev, favouriteShop]);
  };

  const handleRemoveFromFavourites = (shopId: Id<"shops">) => {
    setFavouriteShops(prev => prev.filter(shop => shop._id !== shopId));
  };

  const handleViewFavouriteShop = (shop: any) => {
    setSelectedShopForInventory(shop);
  };

  const isShopFavourite = (shopId: Id<"shops">) => {
    return favouriteShops.some(shop => shop._id === shopId);
  };


  const handleViewShop = (shopId: Id<"shops">) => {
    const shop = allShops?.find(s => s._id === shopId);
    if (shop) {
  setSelectedShopForInventory(shop as any);
    }
  };

// ...existing code...

  const statusFilter = STATUS_FILTERS.find(f => f.key === selectedStatus)?.value;
  
  // Prepare stable query parameters
  const searchQuery = debouncedSearchTerm.trim();
  const hasSearch = searchQuery.length > 0;
  
  // Always fetch all shops, but with stable parameters
  const allShops = useQuery(api.shops.searchShops, {
    searchTerm: searchMode === "shops" && hasSearch ? searchQuery : undefined,
    category: selectedCategory === "all" ? undefined : selectedCategory,
    isOpen: statusFilter,
  });

  // Always fetch all items with shop info, but with stable parameters
  const allItemsWithShopInfo = useQuery(api.items.getItemsWithShopInfo, {
    searchTerm: searchMode === "items" && hasSearch ? searchQuery : undefined,
    category: searchMode === "items" && selectedCategory !== "all" ? selectedCategory : undefined,
    // Show all items regardless of stock status
  });

  // Query to check if user has any orders (to show/hide "View Orders" button)
  const userOrders = useQuery(api.orders.getCustomerOrders, { 
    customerId: user._id 
  });

  // Check if user has any orders to determine if "View Orders" button should be shown
  const hasOrders = useMemo(() => {
    return userOrders && userOrders.length > 0;
  }, [userOrders]);

  // Memoize display data for FlatList
  const shopsDisplayData = useMemo(() => {
    if (searchMode === "shops") {
      let shops = allShops || [];
      // Add distance if available
      if (userLocation) {
        shops = shops.map(shop => {
          if (shop?.location) {
            const distance = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              shop.location.lat,
              shop.location.lng
            );
            return { ...(shop as any), distance };
          }
          return { ...(shop as any), distance: null };
        });
        shops.sort((a: any, b: any) => {
          if (a.distance === null && b.distance === null) return 0;
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        });
      }
      return shops;
    }
    return [];
  }, [searchMode, allShops, userLocation]);

  const itemsDisplayData = useMemo(() => {
    if (searchMode === "items") {
      let items = allItemsWithShopInfo || [];
      // Add shopName, shopId, and distance if available
      items = items.map(item => {
        let distance = null;
        if (userLocation && item?.shop?.location) {
          distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            item.shop.location.lat,
            item.shop.location.lng
          );
        }
        return {
          ...(item as any),
          shopName: item.shop?.name || '',
          shopId: item.shop?._id,
          distance,
        };
      });
      if (userLocation) {
        items.sort((a: any, b: any) => {
          if (a.distance === null && b.distance === null) return 0;
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        });
      }
      return items;
    }
    return [];
  }, [searchMode, allItemsWithShopInfo, userLocation]);

// ...existing code...

  // Only show initial loading, not during search
  const isInitialLoading = (searchMode === "shops" ? allShops : allItemsWithShopInfo) === undefined && !hasSearch;

  if (isInitialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Animation for hiding/showing filters on scroll
  // ...other state variables...j

  // Scroll handler for FlatList (keeps JS-side visibility logic and velocity detection)
  const handleScroll = (event: { nativeEvent: { contentOffset: { y: number } } }) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    // Velocity-aware, proportional hide on slow scroll + instant hide on fast scroll
  // Distance (px) over which the header fully collapses during slow scroll
  // Reduced so the header (including search bar) collapses faster on slow scroll
  const HIDE_DISTANCE = 140; // was 220
    // Fast scroll threshold (px per ms). If downward velocity exceeds this, hide immediately
    const FAST_VELOCITY_PX_PER_MS = 0.5; // ~500 px/s

    // Keep a ref to last offset/time and visibility to compute velocity & avoid repeated state toggles
    if (!(handleScroll as any).__meta) {
      (handleScroll as any).__meta = { lastOffset: 0, lastTime: Date.now(), visible: true, manualHidden: false };
    }
    const meta = (handleScroll as any).__meta as { lastOffset: number; lastTime: number; visible: boolean; manualHidden: boolean };

    const now = Date.now();
    const dt = Math.max(1, now - meta.lastTime); // ms
    const dy = offsetY - meta.lastOffset; // px
    const velocity = dy / dt; // px per ms (positive = scrolling down)

    // Fast downward fling -> hide immediately
    if (velocity > FAST_VELOCITY_PX_PER_MS) {
      if (meta.visible || !meta.manualHidden) {
        meta.visible = false;
        meta.manualHidden = true;
        Animated.timing(filtersAnim, { toValue: 0, duration: 100, useNativeDriver: false }).start();
        Animated.timing(searchAnim, { toValue: 0, duration: 100, useNativeDriver: false }).start();
        setFiltersVisible(false);
  // make header non-touchable so touches pass to list
  if (headerTouchable) setHeaderTouchable(false);
      }
    } else {
      // Not a fast fling: behave proportionally to scroll offset for a smooth gradual collapse
      meta.manualHidden = false;
      const progress = Math.min(Math.max(offsetY / HIDE_DISTANCE, 0), 1);
      const value = 1 - progress;
      // Update animated values directly for smooth response to slow scroll
      filtersAnim.setValue(value);
      searchAnim.setValue(value);

      // Only toggle the pointer-events state at the ends to avoid micro-updates
      if (value <= 0.03 && meta.visible) {
        meta.visible = false;
        setFiltersVisible(false);
  if (headerTouchable) setHeaderTouchable(false);
      } else if (value >= 0.97 && !meta.visible) {
        meta.visible = true;
        setFiltersVisible(true);
  if (!headerTouchable) setHeaderTouchable(true);
      }
    }

    meta.lastOffset = offsetY;
    meta.lastTime = now;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header wrapper (absolute) so list scrolls under it */}
  <View pointerEvents={headerTouchable ? 'auto' : 'box-none'} style={{ position: 'absolute', top: insets.top, left: 0, right: 0, zIndex: 20 }}>
          {/* Compact Modern Header */}
          <View style={styles.compactHeader}>
        <View style={styles.headerContent}>
          <View style={styles.userSection}>
            <Text style={styles.compactGreeting}>Hi, {user.name}! 👋</Text>
            {locationPermissionStatus === 'granted' && userLocation && (
              <View style={styles.locationStatusCompact}>
                <View style={styles.locationDotCompact} />
                <Text style={styles.locationStatusText}>Location Active</Text>
          </View>
            )}
        </View>
          
          <View style={styles.compactActions}>
            <TouchableOpacity 
              onPress={() => setShowMap(true)} 
              style={styles.compactButton}
              activeOpacity={0.7}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              delayPressIn={0}
              delayPressOut={0}
            >
              <Ionicons name="map-outline" size={20} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setNotificationsVisible(true)} 
              style={styles.compactButton}
              activeOpacity={0.7}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              delayPressIn={0}
              delayPressOut={0}
            >
              <Ionicons name="notifications-outline" size={20} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setSidebarVisible(true)} 
              style={styles.compactMenuButton}
              activeOpacity={0.7}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              delayPressIn={0}
              delayPressOut={0}
            >
              <Ionicons name="menu" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
      </View>
      </View>

      {/* Location Permission Popup */}
      {showLocationPopup && (
        <Animated.View 
          style={[
            styles.locationPopup,
            {
              transform: [
                {
                  translateY: popupAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-100, 0],
                  }),
                },
                {
                  scale: popupAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }),
                },
              ],
              opacity: popupAnim,
            },
          ]}
        >
          <View style={styles.popupContent}>
            <View style={styles.popupHeader}>
              <Ionicons name="location" size={24} color="#EF4444" />
              <View style={styles.popupTextContainer}>
                <Text style={styles.popupTitle}>Enable Location</Text>
                <Text style={styles.popupSubtitle}>Location access is required to find nearby shops and provide better service</Text>
              </View>
            </View>
            <View style={styles.popupActions}>
              <TouchableOpacity 
                onPress={requestLocationPermission}
                style={[styles.popupButtonPrimary, { width: '100%' }]}
              >
                <Text style={styles.popupButtonPrimaryText}>Enable Location</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Animated Search Mode Toggle (native-driven opacity + translateY) */}
      <Animated.View
        style={[
          styles.searchModeContainer,
          {
            opacity: scrollY.interpolate({ inputRange: [0, 120], outputRange: [1, 0], extrapolate: 'clamp' }),
            transform: [{ translateY: scrollY.interpolate({ inputRange: [0, 120], outputRange: [0, -18], extrapolate: 'clamp' }) }],
          },
        ]}
        pointerEvents={filtersVisible ? 'auto' : 'none'}
      >
        <View style={styles.searchModeButtons}>
          {SEARCH_MODES.map((mode) => (
            <TouchableOpacity
              key={mode.key}
              style={[
                styles.searchModeButton,
                searchMode === mode.key && styles.searchModeButtonSelected,
              ]}
              onPress={() => {
                setSearchMode(mode.key as "shops" | "items");
                setSearchTerm("");
                setSelectedCategory("all");
              }}
            >
              <Ionicons
                name={mode.icon as any}
                size={18}
                color={searchMode === mode.key ? "#FFFFFF" : "#6B7280"}
              />
              <Text style={[
                styles.searchModeButtonText,
                searchMode === mode.key && styles.searchModeButtonTextSelected,
              ]}>
                {mode.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Animated Search Bar (native-driven opacity + translateY) */}
      <Animated.View
        style={[
          styles.searchContainer,
      {
        opacity: scrollY.interpolate({ inputRange: [0, 110], outputRange: [1, 0], extrapolate: 'clamp' }),
        transform: [{ translateY: scrollY.interpolate({ inputRange: [0, 110], outputRange: [0, -36], extrapolate: 'clamp' }) }],
          },
        ]}
        pointerEvents={filtersVisible ? 'auto' : 'none'}
      >
        <View style={styles.searchInputContainer}>
          {isSearching ? (
            <Ionicons name="reload" size={20} color="#6B7280" />
          ) : (
            <Ionicons name="search" size={20} color="#6B7280" />
          )}
          <TextInput
            style={styles.searchInput}
            placeholder={searchMode === "shops" ? "Search shops" : "Search items"}
            placeholderTextColor="#9CA3AF"
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoCapitalize="none"
            autoCorrect={false}
            selectionColor="#3B82F6"
            multiline={false}
            textAlignVertical="center"
          />
          {searchTerm.length > 0 && !isSearching && (
            <TouchableOpacity onPress={() => setSearchTerm("")}>
              <Ionicons name="close-circle" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Filters row (native-driven opacity + translateY) - hide faster like search bar */}
      <Animated.View 
        style={[
          styles.filtersContainer,
          {
            opacity: scrollY.interpolate({ inputRange: [0, 110], outputRange: [1, 0], extrapolate: 'clamp' }),
            transform: [{ translateY: scrollY.interpolate({ inputRange: [0, 110], outputRange: [0, -36], extrapolate: 'clamp' }) }],
          }
        ]}
        pointerEvents={filtersVisible ? 'auto' : 'none'}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Category:</Text>
            {/* Dynamically merge backend categories with predefined, remove 'other' */}
            {(() => {
              // Get all unique categories from backend shops
              const backendCategories = Array.from(new Set((allShops || [])
                .map(shop => shop.category)
                .filter(cat => !!cat && cat !== 'other' && cat !== 'all')));
              // Merge with predefined, keep 'all' at front
              const mergedCategories = [
                'all',
                ...Array.from(new Set([
                  ...PREDEFINED_CATEGORIES.filter(c => c !== 'all'),
                  ...backendCategories
                ]))
              ];
              return mergedCategories.map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.filterButton,
                    selectedCategory === category && styles.filterButtonSelected,
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    selectedCategory === category && styles.filterButtonTextSelected,
                  ]}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                </TouchableOpacity>
              ));
            })()}
          </View>
        </ScrollView>

        {searchMode === "shops" && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Status:</Text>
              {STATUS_FILTERS.map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.filterButton,
                    selectedStatus === filter.key && styles.filterButtonSelected,
                  ]}
                  onPress={() => setSelectedStatus(filter.key)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    selectedStatus === filter.key && styles.filterButtonTextSelected,
                  ]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}
      </Animated.View>

  </View>

      {(searchMode === "shops" ? shopsDisplayData.length === 0 : itemsDisplayData.length === 0) ? (
        <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}> 
          <Ionicons 
            name={searchMode === "shops" ? "storefront-outline" : "cube-outline"} 
            size={64} 
            color="#9CA3AF" 
          />
          <Text style={styles.emptyTitle}>
            {isSearching ? "Searching..." : `No ${searchMode} found`}
          </Text>
          <Text style={styles.emptySubtitle}>
            {isSearching ? "Please wait..." : "Try adjusting your search or filters"}
          </Text>
        </Animated.View>
      ) : (
  <Animated.View style={{ flex: 1 }}>
          {searchMode === "shops" ? (
            <Animated.FlatList
              data={shopsDisplayData}
              keyExtractor={(item) => item?._id || ""}
              renderItem={({ item }) => item ? (
                <ShopCard 
                  shop={item} 
                  onViewInventory={() => setSelectedShopForInventory(item as any)}
                  showInventoryButton={true}
                />
              ) : null}
              contentContainerStyle={[styles.itemsList, { paddingTop: TOTAL_HEADER_HEIGHT + insets.top + HEADER_TO_SHOPS_GAP }]}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={true}
              maxToRenderPerBatch={8}
              windowSize={8}
              initialNumToRender={6}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: true, listener: handleScroll }
              )}
              scrollEventThrottle={16}
            />
          ) : (
            <Animated.FlatList
              data={itemsDisplayData}
              keyExtractor={(item) => item?._id || ""}
              renderItem={({ item }) => item ? (
                <TouchableOpacity
                  style={styles.itemCard}
                  onPress={() => {
                    setSelectedItem(item);
                    setItemDetailsVisible(true);
                  }}
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
                        <Text style={styles.itemDescription} numberOfLines={2}>{item.description}</Text>
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
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <View style={styles.tapIndicator}>
                      <Ionicons name="chevron-forward" size={16} color="#6B7280" />
                      <Text style={styles.tapIndicatorText}>Tap for details</Text>
                    </View>
                    {typeof (item as any).distance === 'number' && (
                      <Text style={styles.itemDistance}>
                        {(item as any).distance === 0 ? 'At your location' : `${(item as any).distance} km away`}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ) : null}
              contentContainerStyle={[styles.shopsList, { paddingTop: TOTAL_HEADER_HEIGHT + insets.top + HEADER_TO_SHOPS_GAP }]}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              windowSize={10}
              initialNumToRender={8}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: true, listener: handleScroll }
              )}
              scrollEventThrottle={16}
            />
          )}
        </Animated.View>
      )}

      {/* Item Details Modal for items */}
      {selectedItem && (
        <ItemDetailsModal
          visible={itemDetailsVisible}
          onClose={() => setItemDetailsVisible(false)}
          item={selectedItem}
          onShopPress={(shopId) => {
            // First try to find shop from processed shopsDisplayData (includes distance)
            let shop = shopsDisplayData?.find((s) => s._id === shopId);
            
            // If not found in shopsDisplayData, process the shop from allShops with distance
            if (!shop) {
              const rawShop = allShops?.find((s) => s._id === shopId);
              if (rawShop && userLocation && rawShop.location) {
                const distance = calculateDistance(
                  userLocation.latitude,
                  userLocation.longitude,
                  rawShop.location.lat,
                  rawShop.location.lng
                );
                shop = { ...(rawShop as any), distance };
              } else if (rawShop) {
                shop = { ...(rawShop as any), distance: null };
              }
            }
            
            if (shop) {
              setSelectedShopForInventory(shop);
              setItemDetailsVisible(false);
            }
          }}
          onAddToWishlist={handleAddToWishlist}
          isInWishlist={wishlistItems.some(wishlistItem => wishlistItem._id === selectedItem._id)}
          onAddToCart={handleAddToCart}
          isInCart={cartItems.some(cartItem => cartItem._id === selectedItem._id)}
        />
      )}

  <ShopMapModal
        visible={showMap}
        onClose={() => setShowMap(false)}
        shops={allShops || []}
      />

      {selectedShopForInventory && (
        <ShopInventoryModal
          visible={!!selectedShopForInventory}
          onClose={() => setSelectedShopForInventory(null)}
          shop={selectedShopForInventory}
          userLocation={userLocation}
          onAddToWishlist={handleAddToWishlist}
          wishlistItems={wishlistItems}
          onAddToFavourites={handleAddToFavourites}
          onRemoveFromFavourites={handleRemoveFromFavourites}
          isFavourite={isShopFavourite(selectedShopForInventory._id)}
          cartItems={cartItems}
          onAddToCart={handleAddToCart}
          onRemoveFromCart={handleRemoveFromCart}
          onUpdateQuantity={handleUpdateQuantity}
          onIncreaseQuantity={handleIncreaseQuantity}
          onDecreaseQuantity={handleDecreaseQuantity}
          onBookItems={handleBookItems}
          onViewOrders={handleViewOrders}
          hasOrders={hasOrders}
        />
      )}

      <NotificationsModal
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
        userId={user._id}
        onViewShop={handleViewShop}
      />

      <CustomerOrdersModal
        visible={ordersVisible}
        onClose={() => setOrdersVisible(false)}
        userId={user._id}
      />

      <CustomerSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        user={user}
        onLogout={onLogout}
        onSwitchToShopkeeper={onSwitchToShopkeeper}
        wishlistItems={wishlistItems}
        onAddToWishlist={handleAddToWishlist}
        onRemoveFromWishlist={handleRemoveFromWishlist}
        favouriteShops={favouriteShops}
        onAddToFavourites={handleAddToFavourites}
        onRemoveFromFavourites={handleRemoveFromFavourites}
        onViewShop={handleViewFavouriteShop}
      />
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
  headerContainer: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  welcomeSection: {
    flex: 1,
    marginRight: 16,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1F2937",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
    letterSpacing: -0.2,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionButton: {
    shadowColor: "#3B82F6",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonContent: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  menuButton: {
    shadowColor: "#3B82F6",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  menuButtonContent: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
  },
  locationBar: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  locationStatus: {
    alignItems: "center",
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F59E0B",
  },
  retryButton: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
  },
  retryText: {
    fontSize: 12,
    color: "#D97706",
    fontWeight: "600",
  },
  enableLocationBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 12,
  },
  enableLocationText: {
    flex: 1,
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "500",
  },
  locationTextUndetermined: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  // Compact Header Styles
  compactHeader: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 10,
    position: 'relative',
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    zIndex: 10,
    position: 'relative',
  },
  userSection: {
    flex: 1,
  },
  compactGreeting: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    letterSpacing: -0.3,
  },
  locationStatusCompact: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  locationDotCompact: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  locationStatusText: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "600",
  },
  compactActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 10,
    position: 'relative',
  },
  compactButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    zIndex: 10,
    position: 'relative',
  },
  compactMenuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3B82F6",
    shadowOffset: {
      width: 0,
      height: 2,
  },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
    position: 'relative',
  },
  // Location Popup Styles
  locationPopup: {
    backgroundColor: "#FEF3C7",
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    shadowColor: "#F59E0B",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 5,
    position: 'relative',
  },
  popupContent: {
    padding: 16,
  },
  popupHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  popupTextContainer: {
    flex: 1,
  },
  popupTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#92400E",
    marginBottom: 4,
  },
  popupSubtitle: {
    fontSize: 14,
    color: "#A16207",
    lineHeight: 20,
  },
  popupCloseButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(107, 114, 128, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  popupActions: {
    flexDirection: "row",
    gap: 12,
  },
  popupButtonSecondary: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    alignItems: "center",
  },
  popupButtonSecondaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400E",
  },
  popupButtonPrimary: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#D97706",
    alignItems: "center",
    shadowColor: "#D97706",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  popupButtonPrimaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  searchModeContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    zIndex: 1,
    position: 'relative',
  },
  searchModeButtons: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
  },
  searchModeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  searchModeButtonSelected: {
    backgroundColor: "#2563EB",
  },
  searchModeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  searchModeButtonTextSelected: {
    color: "#FFFFFF",
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    zIndex: 1,
    position: 'relative',
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    height:50
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
    paddingVertical: 0,
    paddingHorizontal: 0,
    backgroundColor: "transparent",
  },
  filtersContainer: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 8,
    zIndex: 1,
    position: 'relative',
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginRight: 4,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterButtonSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  filterButtonText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  filterButtonTextSelected: {
    color: "#FFFFFF",
  },
  headerLeft: {
    flex: 1,
  },
  subtitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  locationIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  locationText: {
    fontSize: 14,
    color: "#10B981",
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  locationTextLoading: {
    fontSize: 14,
    color: "#F59E0B",
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  locationTextDisabled: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  resultsInfo: {
    gap: 4,
  },
  resultsCount: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  sortingIndicator: {
    // Deprecated, replaced by itemDistance
  },
  itemDistance: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "500",
    fontStyle: "italic",
    textAlign: 'right',
    marginLeft: 8,
    minWidth: 80,
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
  shopsList: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  itemsList: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'column',
    gap: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'column',
    gap: 2,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  itemDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  itemPrice: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
  },
  itemOffer: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '500',
  },
  itemCategory: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  stockInStock: {
    backgroundColor: '#D1FAE5',
  },
  stockOutOfStock: {
    backgroundColor: '#FEE2E2',
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stockTextInStock: {
    color: '#059669',
  },
  stockTextOutOfStock: {
    color: '#DC2626',
  },
  tapIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  tapIndicatorText: {
    fontSize: 12,
    color: '#6B7280',
  },
  // Location blocking overlay styles
  locationBlockingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  locationBlockingContent: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    maxWidth: 350,
  },
  locationBlockingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 20,
    marginBottom: 15,
    textAlign: 'center',
  },
  locationBlockingMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  locationBlockingButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 200,
    justifyContent: 'center',
    elevation: 5, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  locationBlockingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});