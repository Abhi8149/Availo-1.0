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
  onUpdateQuantity?: (itemId: Id<"items">, newQuantity: number) => void;
  onIncreaseQuantity?: (itemId: Id<"items">) => void;
  onDecreaseQuantity?: (itemId: Id<"items">) => void;
  hasDelivery?: boolean;
}

export default function ShopCartModal({
  visible,
  onClose,
  cartItems,
  shopId,
  shopName,
  onBookNow,
  onRemoveFromCart,
  onUpdateQuantity,
  onIncreaseQuantity,
  onDecreaseQuantity,
  hasDelivery = true,
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
                    <Text style={styles.itemTotal}>
                      Subtotal: {formatPrice((item.price || 0) * item.quantity)}
                    </Text>
                  </View>

                  {/* Quantity Controls */}
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={[styles.quantityButton, item.quantity === 1 && styles.quantityButtonDisabled]}
                      onPress={() => {
                        if (item.quantity === 1) {
                          onRemoveFromCart(item._id);
                        } else {
                          onDecreaseQuantity?.(item._id);
                        }
                      }}
                    >
                      <Ionicons 
                        name={item.quantity === 1 ? "trash-outline" : "remove-outline"} 
                        size={16} 
                        color={item.quantity === 1 ? "#DC2626" : "#374151"} 
                      />
                    </TouchableOpacity>
                    
                    <Text style={styles.quantityText}>{item.quantity}</Text>
                    
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => onIncreaseQuantity?.(item._id)}
                    >
                      <Ionicons name="add-outline" size={16} color="#374151" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* Total Section */}
              <View style={styles.totalSection}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalAmount}>{formatPrice(calculateTotal())}</Text>
              </View>

              {/* Book Now Button */}
              <TouchableOpacity 
                style={[
                  styles.bookButton,
                  !hasDelivery && styles.bookButtonDisabled
                ]} 
                onPress={hasDelivery ? handleBookNow : undefined}
                disabled={!hasDelivery}
              >
                <Ionicons 
                  name="bicycle" 
                  size={20} 
                  color={hasDelivery ? "#FFFFFF" : "#9CA3AF"} 
                />
                <Text style={[
                  styles.bookButtonText,
                  !hasDelivery && styles.bookButtonTextDisabled
                ]}>
                  {hasDelivery ? "Book Now" : "Delivery Not Available"}
                </Text>
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
  itemTotal: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quantityButtonDisabled: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
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
  bookButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  bookButtonTextDisabled: {
    color: '#9CA3AF',
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
