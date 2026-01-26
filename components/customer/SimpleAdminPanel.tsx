import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface SimpleAdminPanelProps {
  visible: boolean;
  onClose: () => void;
}

export default function SimpleAdminPanel({ visible, onClose }: SimpleAdminPanelProps) {
  // Queries and mutations
  const shopsResult = useQuery(api.admin.getAllShopsForVerification, {});
  const stats = useQuery(api.admin.getVerificationStats);
  const verifyShop = useMutation(api.admin.verifyShop);
  const unverifyShop = useMutation(api.admin.unverifyShop);

  // Extract shops array from pagination result or use as-is if it's already an array
  const shops = React.useMemo(() => {
    if (!shopsResult) return [];
    // Check if it's a pagination result with 'page' property
    if (typeof shopsResult === 'object' && 'page' in shopsResult) {
      return (shopsResult as { page: any[] }).page;
    }
    // Otherwise, assume it's already an array
    return Array.isArray(shopsResult) ? shopsResult : [];
  }, [shopsResult]);

  const handleVerificationAction = async (shop: any, action: 'verify' | 'unverify') => {
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
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderShopItem = ({ item }: { item: any }) => (
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
  );

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
          </View>
        )}

        {/* Shops List */}
        <FlatList
          data={shops || []}
          keyExtractor={(item) => item._id}
          renderItem={renderShopItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
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
});
