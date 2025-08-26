interface User {
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  photoUri?: string;
  role?: "shopkeeper" | "customer";
}
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  Linking,
  Platform,
  FlatList,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import EditProfileScreen from "../common/EditProfileScreen";
import { useQuery } from "convex/react";
import { Id } from "../../convex/_generated/dataModel";

interface WishlistItem {
  _id: Id<"items">;
  name: string;
  // category: string;
  price: number;
  shopName: string;
  shopId: Id<"shops">;
  addedAt: number;
}

interface FavouriteShop {
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
  shopImageIds?: Id<"_storage">[];
  estimatedTime?: {
    hours: number;
    minutes: number;
    action: "opening" | "closing";
  };
  distance?: number | null;
  addedAt: number;
}

interface CustomerSidebarProps {
  visible: boolean;
  onClose: () => void;
  user: User;
  onLogout: () => void;
  onSwitchToShopkeeper?: () => void;
  wishlistItems: WishlistItem[];
  onAddToWishlist: (item: WishlistItem) => void;
  onRemoveFromWishlist: (itemId: Id<"items">) => void;
  favouriteShops: FavouriteShop[];
  onAddToFavourites: (shop: FavouriteShop) => void;
  onRemoveFromFavourites: (shopId: Id<"shops">) => void;
  onViewShop: (shop: FavouriteShop) => void;
}

import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import FavouriteShopsModal from "./FavouriteShopsModal";

export default function CustomerSidebar({
  visible,
  onClose,
  user,
  onLogout,
  onSwitchToShopkeeper,
  wishlistItems,
  onAddToWishlist,
  onRemoveFromWishlist,
  favouriteShops,
  onAddToFavourites,
  onRemoveFromFavourites,
  onViewShop,
}: CustomerSidebarProps) {
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [wishlistModalVisible, setWishlistModalVisible] = useState(false);
  const [favouriteShopsModalVisible, setFavouriteShopsModalVisible] = useState(false);
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const updateUserProfile = useMutation(api.users.updateUserProfile);
  const [addItemModalVisible, setAddItemModalVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [profilePhotoModalVisible, setProfilePhotoModalVisible] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  
  // Form states for adding custom items
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemShopName, setShopName] = useState("");

  const handleSwitchRole = () => {
    Alert.alert(
      "Switch to Shopkeeper Mode",
      "You'll be switched to shopkeeper dashboard. Your customer data will be saved.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Switch", 
          onPress: () => {
            onClose();
            onSwitchToShopkeeper?.();
          }
        },
      ]
    );
  };

  const handleFeedbackSubmit = () => {
    if (!feedbackText.trim()) {
      Alert.alert("Error", "Please enter your feedback");
      return;
    }

    if (feedbackRating === 0) {
      Alert.alert("Error", "Please select a rating");
      return;
    }

    // Here you would typically send the feedback to your backend
    console.log("Feedback submitted:", {
      rating: feedbackRating,
      feedback: feedbackText,
      user: user.email,
      timestamp: new Date().toISOString(),
    });

    Alert.alert(
      "Thank You!",
      "Your feedback has been submitted successfully. We appreciate your input!",
      [
        {
          text: "OK",
          onPress: () => {
            setFeedbackText("");
            setFeedbackRating(0);
            setFeedbackModalVisible(false);
          },
        },
      ]
    );
  };

  const handleContactSupport = (method: "email" | "phone") => {
    if (method === "email") {
      const email = "piyushraj7308305@gmail.com";
      const subject = `Support Request from ${user.name}`;
      const body = `Hi Support Team,\n\nI need help with:\n\n[Please describe your issue here]\n\nUser Details:\nName: ${user.name}\nEmail: ${user.email}\nRole: ${user.role}\n\nThank you!`;
      
      const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      Linking.openURL(url).catch(() => {
        Alert.alert("Error", "Unable to open email app. Please email us at support@oldshopstatus.com");
      });
    } else if (method === "phone") {
      const phoneNumber = "6204183318"; // Replace with your actual support number
      const url = Platform.OS === "ios" ? `tel:${phoneNumber}` : `tel:${phoneNumber}`;
      
      Linking.openURL(url).catch(() => {
        Alert.alert("Error", "Unable to make phone call. Please call us at +1234567890");
      });
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive",
          onPress: () => {
            onClose();
            onLogout();
          }
        },
      ]
    );
  };

  const handleRemoveFromWishlist = (itemId: Id<"items">) => {
    Alert.alert(
      "Remove Item",
      "Remove this item from your wishlist?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            onRemoveFromWishlist(itemId);
          },
        },
      ]
    );
  };

  const handleAddCustomItem = () => {
    if (!itemName.trim()) {
      Alert.alert("Error", "Please enter item name");
      return;
    }

    if (!itemPrice.trim() || isNaN(Number(itemPrice))) {
      Alert.alert("Error", "Please enter a valid price");
      return;
    }

    const customItem: WishlistItem = {
      _id: `custom_${Date.now()}` as Id<"items">,
      name: itemName.trim(),
      // category: itemCategory.trim() || "Custom",
      price: Number(itemPrice),
      shopName: itemShopName.trim(),
      shopId: "custom" as Id<"shops">,
      addedAt: Date.now(),
    };

    onAddToWishlist(customItem);
    
    // Reset form
    setItemName("");
    setItemPrice("");
    setShopName("");
    setAddItemModalVisible(false);
    
    // Alert.alert("Success", `${customItem.name} has been added to your wishlist!`);
  };

  const formatWishlistDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => setFeedbackRating(i)}
          style={styles.starButton}
        >
          <Ionicons
            name={i <= feedbackRating ? "star" : "star-outline"}
            size={32}
            color={i <= feedbackRating ? "#F59E0B" : "#D1D5DB"}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  const renderWishlistItem = ({ item }: { item: WishlistItem }) => (
    <View style={styles.wishlistItem}>
      <View style={styles.wishlistItemInfo}>
        <Text style={styles.wishlistItemName}>{item.name}</Text>
        <Text style={styles.wishlistItemDetails}>
          • ₹{item.price} • {item.shopName}
        </Text>
        <Text style={styles.wishlistItemDate}>
          Added {formatWishlistDate(item.addedAt)}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => handleRemoveFromWishlist(item._id)}
        style={styles.removeButton}
      >
        <Ionicons name="trash-outline" size={20} color="#DC2626" />
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.overlayTouchable} onPress={onClose} />
          <View style={styles.sidebarContainer}>
            <View style={styles.sidebarHeader}>
              <TouchableOpacity onPress={() => setProfilePhotoModalVisible(true)} style={styles.userInfo} activeOpacity={0.7}>
                <View style={styles.avatarContainer}>
                  {user.photoUri ? (
                    <Image source={{ uri: user.photoUri }} style={styles.profilePhoto} />
                  ) : (
                    <Text style={styles.avatarText}>
                      {user.name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  <Text style={styles.userRole}>Customer Mode</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {/* Profile Photo Modal */}
            <Modal visible={profilePhotoModalVisible} transparent animationType="fade" onRequestClose={() => setProfilePhotoModalVisible(false)}>
              <View style={styles.profilePhotoModalOverlay}>
                <TouchableOpacity style={styles.profilePhotoModalClose} onPress={() => setProfilePhotoModalVisible(false)}>
                  <Ionicons name="close" size={36} color="#fff" />
                </TouchableOpacity>
                <View style={styles.profilePhotoModalImageContainer}>
                  {user.photoUri ? (
                    <Image source={{ uri: user.photoUri }} style={styles.profilePhotoModalImage} resizeMode="contain" />
                  ) : (
                    <View style={styles.profilePhotoLargePlaceholder}>
                      <Text style={styles.avatarTextLarge}>{user.name.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                </View>
              </View>
            </Modal>

            <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>
              {/* Switch to Shopkeeper (only if user has shopkeeper role) */}
              {onSwitchToShopkeeper && (
                <TouchableOpacity style={styles.menuItem} onPress={handleSwitchRole}>
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.menuIcon, { backgroundColor: "#EFF6FF" }]}>
                      <Ionicons name="storefront" size={20} color="#2563EB" />
                    </View>
                    <View style={styles.menuItemText}>
                      <Text style={styles.menuItemTitle}>Switch to Shopkeeper</Text>
                      <Text style={styles.menuItemSubtitle}>
                        Manage your shops and inventory
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}

              {/* Wishlist */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setWishlistModalVisible(true)}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIcon, { backgroundColor: "#FEF3C7" }]}>
                    <Ionicons name="heart" size={20} color="#F59E0B" />
                  </View>
                  <View style={styles.menuItemText}>
                    <Text style={styles.menuItemTitle}>My Wishlist</Text>
                    <Text style={styles.menuItemSubtitle}>
                      Items you want to buy ({wishlistItems.length})
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              {/* My Favourite Shops */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setFavouriteShopsModalVisible(true)}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIcon, { backgroundColor: "#FEE2E2" }]}>
                    <Ionicons name="heart" size={20} color="#DC2626" />
                  </View>
                  <View style={styles.menuItemText}>
                    <Text style={styles.menuItemTitle}>My Favourite</Text>
                    <Text style={styles.menuItemSubtitle}>
                      Your favourite shops ({favouriteShops.length})
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Help & Support */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setHelpModalVisible(true)}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIcon, { backgroundColor: "#F0FDF4" }]}>
                    <Ionicons name="help-circle" size={20} color="#16A34A" />
                  </View>
                  <View style={styles.menuItemText}>
                    <Text style={styles.menuItemTitle}>Help & Support</Text>
                    <Text style={styles.menuItemSubtitle}>
                      Get help and contact us
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>


              {/* Feedback */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setFeedbackModalVisible(true)}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIcon, { backgroundColor: "#F3E8FF" }]}> 
                    <Ionicons name="chatbubble-ellipses" size={20} color="#7C3AED" />
                  </View>
                  <View style={styles.menuItemText}>
                    <Text style={styles.menuItemTitle}>Feedback</Text>
                    <Text style={styles.menuItemSubtitle}>
                      Share your experience with us
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Edit Profile */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setEditProfileVisible(true)}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIcon, { backgroundColor: "#DBEAFE" }]}> 
                    <Ionicons name="person" size={20} color="#2563EB" />
                  </View>
                  <View style={styles.menuItemText}>
                    <Text style={styles.menuItemTitle}>Edit Your Profile</Text>
                    <Text style={styles.menuItemSubtitle}>
                      Update your name, email, phone
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
      {/* Edit Profile Modal */}
      <Modal
        visible={editProfileVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setEditProfileVisible(false)}
      >
        <EditProfileScreen
          user={{ name: user.name, email: user.email, phone: user.phone, photoUri: user.photoUri }}
          onSave={async (data) => {
            try {
              await updateUserProfile({
                userId: user._id as any,
                name: data.name,
                email: data.email,
                phone: data.phone,
                photoUri: data.photoUri,
                password: data.password,
              });
              setEditProfileVisible(false);
              Alert.alert("Profile Updated", "Your profile has been updated.");
            } catch (e: any) {
              Alert.alert("Error", e?.message || "Failed to update profile");
            }
          }}
          onCancel={() => setEditProfileVisible(false)}
        />
      </Modal>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Logout */}
              <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIcon, { backgroundColor: "#FEE2E2" }]}>
                    <Ionicons name="log-out" size={20} color="#DC2626" />
                  </View>
                  <View style={styles.menuItemText}>
                    <Text style={[styles.menuItemTitle, { color: "#DC2626" }]}>
                      Logout
                    </Text>
                    <Text style={styles.menuItemSubtitle}>
                      Sign out of your account
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Wishlist Modal */}
      <Modal
        visible={wishlistModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setWishlistModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>My Wishlist</Text>
              <View style={styles.wishlistHeaderActions}>
                <TouchableOpacity
                  onPress={() => setAddItemModalVisible(true)}
                  style={styles.addItemButton}
                >
                  <Ionicons name="add-circle" size={24} color="#2563EB" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setWishlistModalVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            {wishlistItems.length === 0 ? (
              <View style={styles.emptyWishlist}>
                <Ionicons name="heart-outline" size={64} color="#9CA3AF" />
                <Text style={styles.emptyWishlistTitle}>Your wishlist is empty</Text>
                <Text style={styles.emptyWishlistSubtitle}>
                  Start adding items you want to buy from shops
                </Text>
              </View>
            ) : (
              <FlatList
                data={wishlistItems}
                keyExtractor={(item) => item._id}
                renderItem={renderWishlistItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.wishlistContainer}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Feedback Modal */}
      <Modal
        visible={feedbackModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFeedbackModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share Your Feedback</Text>
              <TouchableOpacity
                onPress={() => setFeedbackModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.ratingLabel}>How would you rate our app?</Text>
            <View style={styles.starsContainer}>{renderStars()}</View>

            <Text style={styles.feedbackLabel}>Tell us more (optional):</Text>
            <TextInput
              style={styles.feedbackInput}
              multiline
              numberOfLines={4}
              placeholder="Share your thoughts, suggestions, or issues..."
              value={feedbackText}
              onChangeText={setFeedbackText}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setFeedbackModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleFeedbackSubmit}
              >
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Help & Support Modal */}
      <Modal
        visible={helpModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setHelpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Help & Support</Text>
              <TouchableOpacity
                onPress={() => setHelpModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.helpSection}>
                <Text style={styles.helpSectionTitle}>Contact Us</Text>
                
                <TouchableOpacity
                  style={styles.contactOption}
                  onPress={() => handleContactSupport("email")}
                >
                  <Ionicons name="mail" size={24} color="#2563EB" />
                  <View style={styles.contactOptionText}>
                    <Text style={styles.contactOptionTitle}>Email Support</Text>
                    <Text style={styles.contactOptionSubtitle}>
                      piyushraj7308305@gmail.com
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.contactOption}
                  onPress={() => handleContactSupport("phone")}
                >
                  <Ionicons name="call" size={24} color="#16A34A" />
                  <View style={styles.contactOptionText}>
                    <Text style={styles.contactOptionTitle}>Phone Support</Text>
                    <Text style={styles.contactOptionSubtitle}>
                      6204183318
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.helpSection}>
                <Text style={styles.helpSectionTitle}>About Old Shop Status</Text>
                <Text style={styles.aboutText}>
                  Old Shop Status helps you discover local businesses and find what 
                  you need. Check shop availability, browse inventories, and plan 
                  your shopping trips efficiently.
                </Text>
                
                <Text style={styles.aboutText}>
                  Version 1.0.0{"\n"}
                  Made with ❤️ for local communities
                </Text>
              </View>

              <View style={styles.helpSection}>
                <Text style={styles.helpSectionTitle}>Quick Tips</Text>
                <View style={styles.tipItem}>
                  <Ionicons name="bulb" size={16} color="#F59E0B" />
                  <Text style={styles.tipText}>
                    Use the wishlist to save items you want to buy
                  </Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="bulb" size={16} color="#F59E0B" />
                  <Text style={styles.tipText}>
                    Check estimated times to know when shops will open/close
                  </Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="bulb" size={16} color="#F59E0B" />
                  <Text style={styles.tipText}>
                    Use location services to find nearest shops
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Custom Item Modal */}
      <Modal
        visible={addItemModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddItemModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Custom Item</Text>
              <TouchableOpacity
                onPress={() => setAddItemModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Item Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., Organic Milk"
                  value={itemName}
                  onChangeText={setItemName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Price *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., 150"
                  value={itemPrice}
                  onChangeText={setItemPrice}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Shop Name (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., Dairy, Fruits, etc."
                  value={itemShopName}
                  onChangeText={setShopName}
                />
              </View>

              <Text style={styles.dateInfo}>
                Added on: {new Date().toLocaleDateString()}
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setAddItemModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleAddCustomItem}
              >
                <Text style={styles.submitButtonText}>Add to Wishlist</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Favourite Shops Modal */}
      <FavouriteShopsModal
        visible={favouriteShopsModalVisible}
        onClose={() => setFavouriteShopsModalVisible(false)}
        favouriteShops={favouriteShops}
        onRemoveFromFavourites={onRemoveFromFavourites}
        onViewShop={onViewShop}
      />
    </>
  );
}

const styles = StyleSheet.create({
  profilePhotoModalImage: {
    width: '100%',
    height: '100%',
    maxWidth: 400,
    maxHeight: 400,
    alignSelf: 'center',
    borderRadius: 16,
  },
  profilePhotoModalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  profilePhotoModalClose: {
    position: 'absolute',
    top: 40,
    right: 30,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 24,
    padding: 4,
  },
  profilePhotoLargePlaceholder: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  avatarTextLarge: {
    fontSize: 64,
    fontWeight: '700',
    color: '#fff',
  },
  profilePhotoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  overlayTouchable: {
    flex: 1,
  },
  sidebarContainer: {
    width: "80%",
    maxWidth: 320,
    backgroundColor: "#FFFFFF",
    height: "100%",
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  profilePhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  userEmail: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  userRole: {
    fontSize: 12,
    color: "#16A34A",
    fontWeight: "500",
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  sidebarContent: {
    flex: 1,
    paddingVertical: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 8,
    marginHorizontal: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
  },
  modalCloseButton: {
    padding: 4,
  },
  // Wishlist styles
  wishlistHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addItemButton: {
    padding: 4,
  },
  wishlistContainer: {
    paddingVertical: 8,
  },
  wishlistItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginBottom: 8,
  },
  wishlistItemInfo: {
    flex: 1,
  },
  wishlistItemName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 2,
  },
  wishlistItemDetails: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  wishlistItemDate: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  removeButton: {
    padding: 8,
  },
  emptyWishlist: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyWishlistTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
  },
  emptyWishlistSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
  },
  // Feedback styles
  ratingLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  feedbackLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 8,
  },
  feedbackInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 24,
    minHeight: 100,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    alignItems: "center",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  // Help & Support styles
  helpSection: {
    marginBottom: 24,
  },
  helpSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  contactOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginBottom: 12,
  },
  contactOptionText: {
    marginLeft: 12,
    flex: 1,
  },
  contactOptionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
  },
  contactOptionSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  aboutText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  // Add Custom Item Form styles
  formContainer: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dateInfo: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 8,
  },
});
