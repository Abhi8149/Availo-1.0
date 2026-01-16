import React, { useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

interface RoleSelectionModalProps {
  visible: boolean;
  onSelectRole: (role: "customer" | "shopkeeper") => void;
}

export default function RoleSelectionModal({
  visible,
  onSelectRole,
}: RoleSelectionModalProps) {
  useEffect(() => {
    console.log('🎭 [MODAL] RoleSelectionModal visible:', visible);
  }, [visible]);

  const handleRoleSelect = (role: "customer" | "shopkeeper") => {
    console.log('🎯 [MODAL] Role selected:', role);
    onSelectRole(role);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        // Prevent dismissing modal - user must select a role
        console.log('⚠️ [MODAL] Cannot dismiss - role selection required');
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Ionicons name="person-circle" size={60} color="#007AFF" />
            <Text style={styles.title}>Welcome to GoShop!</Text>
            <Text style={styles.subtitle}>How would you like to continue?</Text>
          </View>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.optionCard}
              activeOpacity={0.7}
              onPress={() => handleRoleSelect("customer")}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="cart" size={48} color="#007AFF" />
              </View>
              <Text style={styles.roleTitle}>Customer</Text>
              <Text style={styles.roleDescription}>
                Browse shops, order items, and track deliveries
              </Text>
              <View style={styles.selectButton}>
                <Text style={styles.selectButtonText}>Continue as Customer</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionCard}
              activeOpacity={0.7}
              onPress={() => handleRoleSelect("shopkeeper")}
            >
              <View style={styles.iconContainer}>
                <Ionicons name="storefront" size={48} color="#34C759" />
              </View>
              <Text style={styles.roleTitle}>Shopkeeper</Text>
              <Text style={styles.roleDescription}>
                Manage your shop, items, and customer orders
              </Text>
              <View style={[styles.selectButton, styles.shopkeeperButton]}>
                <Text style={styles.selectButtonText}>Continue as Shopkeeper</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.note}>
            You can change your role later in settings
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    width: width - 40,
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1C1C1E",
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: "#F9F9F9",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E5EA",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1C1C1E",
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  shopkeeperButton: {
    backgroundColor: "#34C759",
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
  note: {
    fontSize: 12,
    color: "#8E8E93",
    textAlign: "center",
    marginTop: 20,
    fontStyle: "italic",
  },
});
