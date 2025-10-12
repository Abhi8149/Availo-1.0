import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

/**
 * SIMPLE ADMIN PANEL WITH PAGINATION AND PERFORMANCE OPTIMIZATION
 * 
 * Performance optimizations:
 * - Active pagination (loads 20 shops at a time)
 * - Infinite scroll with "Load More" functionality
 * - FlatList with performance props (removeClippedSubviews, maxToRenderPerBatch, etc.)
 * - useCallback for stable function references
 * - useMemo for expensive calculations
 * - Proper keyExtractor for efficient list rendering
 */

interface SimpleAdminPanelProps {
  visible: boolean;
  onClose: () => void;
}

export default function SimpleAdminPanel({ visible, onClose }: SimpleAdminPanelProps) {
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [actionType, setActionType] = useState<'verify' | 'unverify'>('verify');
  
  // Pagination state
  const [allShops, setAllShops] = useState<any[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Queries and mutations - WITH PAGINATION ACTIVE
  const shopsData = useQuery(api.admin.getAllShopsForVerification, {
    paginationOpts: {
      numItems: 20,
      cursor: currentCursor,
    },
  });
  const stats = useQuery(api.admin.getVerificationStats);
  const verifyShop = useMutation(api.admin.verifyShop);
  const unverifyShop = useMutation(api.admin.unverifyShop);

  // Extract shops from paginated response and accumulate
  const shops = useMemo(() => {
    if (!shopsData) return allShops;
    
    // Check if it's a paginated result
    if (shopsData && typeof shopsData === 'object' && 'page' in shopsData) {
      // Paginated response
      const newShops = shopsData.page || [];
      
      // If this is the first page (no cursor), replace all shops
      if (currentCursor === null) {
        setAllShops(newShops);
        return newShops;
      }
      
      // If loading more, append to existing shops
      if (isLoadingMore) {
        const combined = [...allShops, ...newShops];
        setAllShops(combined);
        setIsLoadingMore(false);
        return combined;
      }
      
      return allShops.length > 0 ? allShops : newShops;
    }
    
    // Fallback for non-paginated response (shouldn't happen now)
    const shopArray = Array.isArray(shopsData) ? shopsData : [];
    setAllShops(shopArray);
    return shopArray;
  }, [shopsData, currentCursor, isLoadingMore, allShops]);

  // Check if more data is available
  const hasMore = useMemo(() => {
    if (!shopsData) return false;
    return shopsData && typeof shopsData === 'object' && 'isDone' in shopsData 
      ? !shopsData.isDone 
      : false;
  }, [shopsData]);

  // Load more function
  const handleLoadMore = useCallback(() => {
    if (!shopsData || isLoadingMore || !hasMore) return;
    
    if (shopsData && typeof shopsData === 'object' && 'continueCursor' in shopsData) {
      const nextCursor = shopsData.continueCursor;
      if (nextCursor) {
        console.log('📄 Loading more shops... Current count:', allShops.length);
        setIsLoadingMore(true);
        setCurrentCursor(nextCursor);
      }
    }
  }, [shopsData, isLoadingMore, hasMore, allShops.length]);

  // Memoize handleVerificationAction with useCallback
  const handleVerificationAction = useCallback(async (shop: any, action: 'verify' | 'unverify') => {
    try {
      if (action === 'verify') {
        await verifyShop({
          shopId: shop._id,
          notes: `Verified by admin on ${new Date().toLocaleDateString()}`,
        });
        Alert.alert('Success', `${shop.name} has been verified!`);
      } else {
        await unverifyShop({
          shopId: shop._id,
          notes: `Unverified by admin on ${new Date().toLocaleDateString()}`,
        });
        Alert.alert('Success', `Verification removed from ${shop.name}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update verification status');
    }
  }, [verifyShop, unverifyShop]);

  // Memoize formatDate function
  const formatDate = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  // Memoize renderShopItem with useCallback
  const renderShopItem = useCallback(({ item }: { item: any }) => (
    <View style={styles.shopCard}>
      <View style={styles.shopHeader}>
        <View style={styles.shopInfo}>
          <View style={styles.shopNameRow}>
            <Text style={styles.shopName}>{item.name}</Text>
            {item.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>
          <Text style={styles.shopOwner}>Owner: {item.ownerName}</Text>
          <Text style={styles.shopCategory}>{item.category || 'No category'}</Text>
          <Text style={styles.shopDate}>Created: {formatDate(item.createdAt)}</Text>
          {item.isVerified && item.verifiedAt && (
            <Text style={styles.verifiedDate}>
              Verified: {formatDate(item.verifiedAt)}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.actionButtons}>
        {item.isVerified ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.unverifyButton]}
            onPress={() => handleVerificationAction(item, 'unverify')}
          >
            <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
            <Text style={styles.unverifyButtonText}>Remove Verification</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.verifyButton]}
            onPress={() => handleVerificationAction(item, 'verify')}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
            <Text style={styles.verifyButtonText}>Verify Shop</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  ), [handleVerificationAction, formatDate]);

  // Memoize keyExtractor
  const keyExtractor = useCallback((item: any) => item._id, []);

  // Memoize getItemLayout for better performance
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 200, // Approximate height of shop card
    offset: 200 * index,
    index,
  }), []);

  // Render loading footer
  const renderFooter = useCallback(() => {
    if (!hasMore && shops.length > 0) {
      return (
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>✓ All shops loaded ({shops.length} total)</Text>
        </View>
      );
    }
    
    if (isLoadingMore || (hasMore && shops.length > 0)) {
      return (
        <View style={styles.footerContainer}>
          <ActivityIndicator size="small" color="#2563EB" />
          <Text style={styles.footerLoadingText}>Loading more shops...</Text>
        </View>
      );
    }
    
    return null;
  }, [hasMore, shops.length, isLoadingMore]);

  // Render empty state
  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="storefront-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No Shops Found</Text>
      <Text style={styles.emptySubtitle}>There are no shops to verify at the moment</Text>
    </View>
  ), []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Shop Verification Admin</Text>
            <Text style={styles.subtitle}>Manage shop verifications</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Stats Header */}
        {stats && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>Verification Overview</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.total}</Text>
                <Text style={styles.statLabel}>Total Shops</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: '#10B981' }]}>{stats.verified}</Text>
                <Text style={styles.statLabel}>Verified</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{stats.pending}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: '#3B82F6' }]}>{stats.verificationRate}%</Text>
                <Text style={styles.statLabel}>Rate</Text>
              </View>
            </View>
            {/* Pagination indicator */}
            <View style={styles.paginationInfo}>
              <Ionicons name="layers-outline" size={14} color="#6B7280" />
              <Text style={styles.paginationText}>
                Showing {shops.length} of {stats.total} shops {hasMore && '• Scroll for more'}
              </Text>
            </View>
          </View>
        )}

        {/* Shops List with Pagination */}
        <FlatList
          data={shops || []}
          keyExtractor={keyExtractor}
          renderItem={renderShopItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          // Performance optimizations
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={10}
          getItemLayout={getItemLayout}
          // Pagination - Load more on scroll
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
        />
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
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingTop: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
  },
  statsContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
  },
  shopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  shopHeader: {
    marginBottom: 12,
  },
  shopInfo: {
    flex: 1,
  },
  shopNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  shopName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  shopOwner: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  shopCategory: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  shopDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  verifiedDate: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  verifyButton: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  verifyButtonText: {
    color: '#10B981',
    fontWeight: '600',
    fontSize: 14,
  },
  unverifyButton: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  unverifyButtonText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 14,
  },
  paginationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 6,
  },
  paginationText: {
    fontSize: 12,
    color: '#6B7280',
  },
  footerContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  footerLoadingText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
});
