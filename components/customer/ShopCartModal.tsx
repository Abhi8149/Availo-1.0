import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Id } from '../../convex/_generated/dataModel';
import ItemImage from '../common/ItemImage';

import { CartItem } from "../../types/interfaces";

interface ShopCartModalProps {
  visible: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  shopId: Id<"shops">;
  shopName: string;
  onBookNow: (items: CartItem[]) => void;
  onRemoveFromCart: (itemId: Id<"items">) => void;
}

export default function ShopCartModal({
  visible,
  onClose,
  cartItems,
  shopId,
  shopName,
  onBookNow,
  onRemoveFromCart,
}: ShopCartModalProps) {
  // Filter items for this shop only
  const shopCartItems = cartItems.filter(item => item.shopId === shopId);

  const calculateTotal = () => {
    return shopCartItems.reduce((total, item) => {
      return total + (item.price || 0) * item.quantity;
    }, 0);
  };

  const handleBookNow = () => {
    if (shopCartItems.length === 0) {
      Alert.alert('Cart Empty', 'Add items to cart before booking');
      return;
    }
    onBookNow(shopCartItems);
  };

  const formatPrice = (price?: number) => {
    if (!price) return "Price not specified";
    return `₹${price}`;
  };

  return (
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
          <Text style={styles.headerTitle}>Your Cart</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.shopName}>{shopName}</Text>
          
          {shopCartItems.length > 0 ? (
            <>
              {/* Cart Items */}
              {shopCartItems.map((item) => (
                <View key={item._id} style={styles.cartItem}>
                  {/* Item Image */}
                  <View style={styles.imageContainer}>
                    {item.imageId ? (
                      <ItemImage
                        imageId={item.imageId}
                        style={styles.itemImage}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.itemImage, styles.noImage]}>
                        <Ionicons name="image-outline" size={24} color="#9CA3AF" />
                      </View>
                    )}
                  </View>

                  {/* Item Details */}
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>
                    <Text style={styles.quantity}>Quantity: {item.quantity}</Text>
                  </View>

                  {/* Remove Button */}
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => onRemoveFromCart(item._id)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Total Section */}
              <View style={styles.totalSection}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalAmount}>{formatPrice(calculateTotal())}</Text>
              </View>

              {/* Book Now Button */}
              <TouchableOpacity style={styles.bookButton} onPress={handleBookNow}>
                <Ionicons name="bicycle" size={20} color="#FFFFFF" />
                <Text style={styles.bookButtonText}>Book Now</Text>
              </TouchableOpacity>
            </>
          ) : (
            // Empty Cart Message
            <View style={styles.emptyCartContainer}>
              <Ionicons name="cart-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyCartText}>Your cart is empty</Text>
              <Text style={styles.emptyCartSubtext}>
                Add items from the shop to place an order
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
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  shopName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginBottom: 1,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  quantity: {
    fontSize: 14,
    color: '#6B7280',
  },
  removeButton: {
    padding: 8,
  },
  totalSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#059669',
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyCartContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyCartText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 16,
  },
  emptyCartSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
});
