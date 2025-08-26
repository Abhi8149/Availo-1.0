import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Id } from '../../convex/_generated/dataModel';

interface ShopStatusScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  currentStatus: boolean; // true = open, false = closed
  shopId: Id<"shops">;
  shopName: string;
  onSchedule: (minutes: number) => void;
}

export default function ShopStatusScheduleModal({
  visible,
  onClose,
  currentStatus,
  shopId,
  shopName,
  onSchedule,
}: ShopStatusScheduleModalProps) {
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);

  // Generate time options in 5-minute intervals up to 30 minutes
  const timeOptions = [5, 10, 15, 20, 25, 30];

  const handleTimeSelect = (minutes: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedMinutes(minutes);
  };

  const handleConfirm = () => {
    if (selectedMinutes !== null) {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      onSchedule(selectedMinutes);
      setSelectedMinutes(null);
      onClose();
    }
  };

  const handleCancel = () => {
    setSelectedMinutes(null);
    onClose();
  };

  const getActionText = () => {
    if (currentStatus) {
      return {
        action: "closing",
        verb: "Close",
        color: "#DC2626",
        backgroundColor: "#FEE2E2",
        icon: "close-circle" as const,
      };
    } else {
      return {
        action: "opening",
        verb: "Open", 
        color: "#16A34A",
        backgroundColor: "#DCFCE7",
        icon: "checkmark-circle" as const,
      };
    }
  };

  const actionInfo = getActionText();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.title}>Schedule Status</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.shopInfo}>
            <View style={[styles.statusIndicator, { backgroundColor: actionInfo.backgroundColor }]}>
              <Ionicons name={actionInfo.icon} size={20} color={actionInfo.color} />
            </View>
            <Text style={styles.shopName}>{shopName}</Text>
            <Text style={styles.currentStatus}>
              Currently {currentStatus ? "Open" : "Closed"}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              When do you want to {actionInfo.verb.toLowerCase()} your shop?
            </Text>
            <Text style={styles.sectionSubtitle}>
              Your shop will automatically {actionInfo.action} after the selected time
            </Text>
          </View>

          <View style={styles.timeOptions}>
            {timeOptions.map((minutes) => (
              <TouchableOpacity
                key={minutes}
                style={[
                  styles.timeOption,
                  selectedMinutes === minutes && styles.timeOptionSelected,
                  selectedMinutes === minutes && { backgroundColor: actionInfo.backgroundColor }
                ]}
                onPress={() => handleTimeSelect(minutes)}
              >
                <View style={styles.timeOptionContent}>
                  <Text style={[
                    styles.timeOptionText,
                    selectedMinutes === minutes && styles.timeOptionTextSelected,
                    selectedMinutes === minutes && { color: actionInfo.color }
                  ]}>
                    {minutes} minutes
                  </Text>
                  <Text style={[
                    styles.timeOptionSubtext,
                    selectedMinutes === minutes && styles.timeOptionSubtextSelected,
                    selectedMinutes === minutes && { color: actionInfo.color }
                  ]}>
                    {actionInfo.verb} in {minutes} min
                  </Text>
                </View>
                {selectedMinutes === minutes && (
                  <Ionicons name="checkmark-circle" size={20} color={actionInfo.color} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.immediateSection}>
            <Text style={styles.sectionTitle}>Or {actionInfo.verb.toLowerCase()} immediately</Text>
            <TouchableOpacity
              style={[
                styles.timeOption,
                selectedMinutes === 0 && styles.timeOptionSelected,
                selectedMinutes === 0 && { backgroundColor: actionInfo.backgroundColor }
              ]}
              onPress={() => handleTimeSelect(0)}
            >
              <View style={styles.timeOptionContent}>
                <Text style={[
                  styles.timeOptionText,
                  selectedMinutes === 0 && styles.timeOptionTextSelected,
                  selectedMinutes === 0 && { color: actionInfo.color }
                ]}>
                  {actionInfo.verb} Now
                </Text>
                <Text style={[
                  styles.timeOptionSubtext,
                  selectedMinutes === 0 && styles.timeOptionSubtextSelected,
                  selectedMinutes === 0 && { color: actionInfo.color }
                ]}>
                  Change status immediately
                </Text>
              </View>
              {selectedMinutes === 0 && (
                <Ionicons name="checkmark-circle" size={20} color={actionInfo.color} />
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.confirmButton,
              selectedMinutes !== null && { backgroundColor: actionInfo.color },
              selectedMinutes === null && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={selectedMinutes === null}
          >
            <Ionicons name={actionInfo.icon} size={16} color="#FFFFFF" />
            <Text style={styles.confirmButtonText}>
              {selectedMinutes === 0 ? `${actionInfo.verb} Now` : 
               selectedMinutes ? `Schedule ${actionInfo.verb}` : 
               `Select Time`}
            </Text>
          </TouchableOpacity>
        </View>
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  shopInfo: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  statusIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  shopName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  currentStatus: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  timeOptions: {
    paddingHorizontal: 20,
    gap: 12,
  },
  immediateSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    marginBottom: 20,
  },
  timeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  timeOptionSelected: {
    borderColor: '#2563EB',
  },
  timeOptionContent: {
    flex: 1,
  },
  timeOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  timeOptionTextSelected: {
    color: '#2563EB',
  },
  timeOptionSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  timeOptionSubtextSelected: {
    color: '#2563EB',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    gap: 8,
  },
  confirmButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
