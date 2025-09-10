import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ToastAndroid,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useMutation, useQuery, useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import BarcodeScanner from "../common/BarcodeScanner";
import { ProductApiService, ProductData } from "../../services/productApiService";
import { FlexibleImagePicker } from "../common/FlexibleImagePicker";

interface AddItemModalProps {
  visible: boolean;
  onClose: () => void;
  shopId: Id<"shops">;
  editingItem?: any;
}

interface ItemWithPriceDescription {
  priceDescription?: string;
  [key: string]: any;
}

const ITEM_CATEGORIES = [
  "food",
  "beverages",
  "snacks",
  "dairy",
  "fruits",
  "vegetables",
  "meat",
  "bakery",
  "household",
  "personal care",
  "electronics",
  "clothing",
  "books",
  "toys",
  "other",
];

export default function AddItemModal({ visible, onClose, shopId, editingItem }: AddItemModalProps) {
  const [priceDescription, setPriceDescription] = useState("");
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [inStock, setInStock] = useState(true);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageId, setImageId] = useState<Id<"_storage"> | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSelectingSuggestion, setIsSelectingSuggestion] = useState(false);
  const [offer, setOffer] = useState("");
  
  // Barcode-related state
  const [barcode, setBarcode] = useState("");
  const [brand, setBrand] = useState("");
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [productDataLoading, setProductDataLoading] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [scannedProductSource, setScannedProductSource] = useState<string>('');

  const createItem = useMutation(api.items.createItem);
  const updateItem = useMutation(api.items.updateItem);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveImageId = useMutation(api.files.saveImageId);
  const convex = useConvex();

  // Always call the hook, but only use the result if imageId exists
  const existingImageUrl = useQuery(
    api.items.getItemImage, 
    editingItem?.imageId ? { imageId: editingItem.imageId } : "skip"
  );

  const itemSuggestions = useQuery(api.items.searchItems, { searchTerm: itemName.length > 0 ? itemName : undefined }) || [];

  useEffect(() => {
    if (editingItem) {
      setItemName(editingItem.name || "");
      setDescription(editingItem.description || "");
      setPrice(editingItem.price?.toString() || "");
      setCategory(editingItem.category || "");
      setCustomCategory("");
      setInStock(editingItem.inStock ?? true);
      setOffer(editingItem.offer || "");
      setImageId(editingItem.imageId || null);
      setImageUri(null);
      setPriceDescription((editingItem as ItemWithPriceDescription).priceDescription || "");
      setBarcode(editingItem.barcode || "");
      setBrand(editingItem.brand || "");
      setIsManualEntry(false);
      setScannedProductSource('');
    } else {
      resetForm();
    }
  }, [editingItem, existingImageUrl]);

  const resetForm = () => {
    setItemName("");
    setDescription("");
    setPrice("");
    setCategory("");
    setCustomCategory("");
    setInStock(true);
    setOffer("");
    setImageUri(null);
    setImageId(null);
    setPriceDescription("");
    setBarcode("");
    setBrand("");
    setProductDataLoading(false);
    setIsManualEntry(false);
    setScannedProductSource('');
  };

  const handleBarcodeScanned = (scannedBarcode: string, productData?: ProductData) => {
    setBarcode(scannedBarcode);
    setScannedProductSource(productData?.source || '');
    
    if (productData && productData.found) {
      // Auto-fill form with found product data
      setItemName(productData.name);
      setBrand(productData.brand || '');
      if (productData.category && !category) {
        setCategory(productData.category);
      }
      if (productData.description && !description) {
        setDescription(productData.description);
      }
      if (productData.price && !price) {
        setPrice(productData.price.toString());
      }
      setIsManualEntry(false);
      
      // Show success toast
      if (Platform.OS === 'android') {
        ToastAndroid.show(
          `Product found via ${productData.source === 'local' ? 'your database' : productData.source}`, 
          ToastAndroid.SHORT
        );
      }
    } else {
      // Product not found - prepare for manual entry
      setItemName('');
      setBrand('');
      setIsManualEntry(true);
      
      // Show manual entry dialog
      Alert.alert(
        'Product Not Found',
        'This product was not found in any database. Please enter the details manually and we\'ll save it for future scans.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              setBarcode('');
              setIsManualEntry(false);
            }
          },
          {
            text: 'Enter Manually',
            onPress: () => {
              // Form is already cleared, user can now enter details
            }
          }
        ]
      );
    }
    
    setShowBarcodeScanner(false);
  };

  const openBarcodeScanner = () => {
    setShowBarcodeScanner(true);
  };

  const showImagePicker = async () => {
    try {
      const image = await FlexibleImagePicker.pickItemPhoto({
        quality: 0.8,
      });

      if (image) {
        setImageUri(image.uri);
        setImageId(null);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert("Error", "Failed to select image");
    }
  };

  const uploadImage = async (uri: string): Promise<Id<"_storage"> | null> => {
    try {
      const uploadUrl = await generateUploadUrl();
      
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await uploadResponse.json();
      return storageId;
    } catch (error) {
      console.error("Image upload error:", error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!itemName.trim()) {
      Alert.alert("Error", "Please enter item name");
      return;
    }

    setLoading(true);
    try {
      let finalImageId = imageId;

      // Upload new image if selected
      if (imageUri) {
        finalImageId = await uploadImage(imageUri);
        if (!finalImageId) {
          Alert.alert("Error", "Failed to upload image");
          setLoading(false);
          return;
        }
      }

      const finalCategory = category === "other" ? customCategory.trim() : category;
      const itemData: any = {
        name: itemName.trim(),
        description: description.trim() || undefined,
        price: price ? parseFloat(price) : undefined,
        priceDescription: priceDescription.trim() || undefined,
        category: finalCategory || undefined,
        offer: offer.trim() || undefined,
        barcode: barcode.trim() || undefined,
        brand: brand.trim() || undefined,
        inStock,
      };
      if (finalImageId) {
        itemData.imageId = finalImageId;
      }

      if (editingItem) {
        await updateItem({
          itemId: editingItem._id,
          ...itemData,
        });
        Alert.alert("Success", "Item updated successfully!");
      } else {
        await createItem({
          shopId,
          ...itemData,
        });
        
        // Special success message for manual barcode entries
        if (isManualEntry && barcode) {
          Alert.alert(
            "Success", 
            `Item added successfully!\n\nThis product has been saved with barcode ${barcode}. Next time you scan this barcode, the details will be auto-filled.`,
            [{ text: "Great!", onPress: () => {} }]
          );
          
          // Show toast on Android
          if (Platform.OS === 'android') {
            ToastAndroid.show('Product saved for future barcode scans!', ToastAndroid.LONG);
          }
        } else {
          Alert.alert("Success", "Item added successfully!");
        }
      }

      resetForm();
      onClose();
    } catch (error) {
      Alert.alert("Error", "Failed to save item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  const displayImage = imageUri || existingImageUrl;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} disabled={loading}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {editingItem ? "Edit Item" : "Add New Item"}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            {/* Image Section */}
            <View style={styles.imageSection}>
              <Text style={styles.label}>Item Photo</Text>
              <TouchableOpacity style={styles.imageContainer} onPress={showImagePicker}>
                {displayImage ? (
                  <Image
                    source={{ uri: displayImage }}
                    style={styles.itemImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera" size={32} color="#9CA3AF" />
                    <Text style={styles.imagePlaceholderText}>Add Photo</Text>
                  </View>
                )}
                <View style={styles.imageOverlay}>
                  <Ionicons name="camera" size={20} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Item Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Item Name *</Text>
              <TextInput
                style={styles.input}
                value={itemName}
                onChangeText={text => {
                  setItemName(text);
                  setShowSuggestions(text.length > 0);
                }}
                placeholder="Enter item name"
                autoCapitalize="words"
                onFocus={() => setShowSuggestions(itemName.length > 0)}
                onBlur={() => {
                  setTimeout(() => {
                    if (!isSelectingSuggestion) setShowSuggestions(false);
                  }, 100);
                }}
                placeholderTextColor="#888"
              />
              {showSuggestions && itemSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {itemSuggestions.map((item, idx) => (
                    <TouchableOpacity
                      key={item._id || idx}
                      style={styles.suggestionItem}
                      onPress={() => {
                        setItemName(item.name);
                        setShowSuggestions(false);
                      }}
                      onPressIn={() => setIsSelectingSuggestion(true)}
                      onPressOut={() => setTimeout(() => setIsSelectingSuggestion(false), 100)}
                    >
                      <Text style={styles.suggestionText}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Barcode Section */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Barcode</Text>
              <View style={styles.barcodeInputContainer}>
                <TextInput
                  style={[styles.input, styles.barcodeInput]}
                  value={barcode}
                  onChangeText={setBarcode}
                  placeholder="Scan or enter barcode"
                  placeholderTextColor="#888"
                />
                <TouchableOpacity
                  style={styles.scanButton}
                  onPress={openBarcodeScanner}
                >
                  <Ionicons name="scan" size={20} color="#007AFF" />
                  <Text style={styles.scanButtonText}>Scan</Text>
                </TouchableOpacity>
              </View>
              {/* Product Source Indicator */}
              {scannedProductSource && (
                <View style={styles.sourceIndicator}>
                  <Ionicons 
                    name={scannedProductSource === 'local' ? "checkmark-circle" : "cloud-download"} 
                    size={16} 
                    color={scannedProductSource === 'local' ? "#16A34A" : "#2563EB"} 
                  />
                  <Text style={styles.sourceText}>
                    {scannedProductSource === 'local' 
                      ? 'Found in your database' 
                      : `Loaded from ${scannedProductSource}`}
                  </Text>
                </View>
              )}
              {isManualEntry && barcode && (
                <View style={styles.sourceIndicator}>
                  <Ionicons name="create" size={16} color="#F59E0B" />
                  <Text style={[styles.sourceText, { color: '#F59E0B' }]}>
                    Manual entry - will be saved for future scans
                  </Text>
                </View>
              )}
            </View>

            {/* Brand */}
            {brand ? (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Brand</Text>
                <TextInput
                  style={styles.input}
                  value={brand}
                  onChangeText={setBrand}
                  placeholder="Brand name"
                  placeholderTextColor="#888"
                />
              </View>
            ) : null}

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>About</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Enter item description (optional)"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                placeholderTextColor="#888"
              />
            </View>


            {/* Price */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Price (₹)</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                placeholder="Enter price (optional)"
                keyboardType="numeric"
                placeholderTextColor="#888"
              />
            </View>
            {/* Price Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Price Description (optional)</Text>
              <TextInput
                style={styles.input}
                value={priceDescription}
                onChangeText={setPriceDescription}
                placeholder="e.g. 10 per kg, 5 per piece, etc."
                placeholderTextColor="#888"
              />
            </View>

            {/* Category */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoryContainer}>
                  {ITEM_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryButton,
                        category === cat && styles.categoryButtonSelected,
                      ]}
                      onPress={() => {
                        setCategory(cat);
                        if (cat !== "other") setCustomCategory("");
                      }}
                    >
                      <Text style={[
                        styles.categoryButtonText,
                        category === cat && styles.categoryButtonTextSelected,
                      ]}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
            {/* Custom Category Input */}
            {category === "other" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Custom Category *</Text>
                <TextInput
                  style={styles.input}
                  value={customCategory}
                  onChangeText={setCustomCategory}
                  placeholder="Enter your item category"
                  autoCapitalize="words"
                  placeholderTextColor="#888"
                />
              </View>
            )}

            {/* Stock Status */}
            <View style={styles.stockContainer}>
              <Text style={styles.label}>Stock Status</Text>
              <View style={styles.stockButtons}>
                <TouchableOpacity
                  style={[
                    styles.stockButton,
                    inStock && styles.stockButtonInStock,
                  ]}
                  onPress={() => setInStock(true)}
                >
                  <Ionicons 
                    name="checkmark-circle" 
                    size={20} 
                    color={inStock ? "#FFFFFF" : "#16A34A"} 
                  />
                  <Text style={[
                    styles.stockButtonText,
                    inStock && styles.stockButtonTextSelected,
                  ]}>
                    In Stock
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.stockButton,
                    !inStock && styles.stockButtonOutOfStock,
                  ]}
                  onPress={() => setInStock(false)}
                >
                  <Ionicons 
                    name="close-circle" 
                    size={20} 
                    color={!inStock ? "#FFFFFF" : "#DC2626"} 
                  />
                  <Text style={[
                    styles.stockButtonText,
                    !inStock && styles.stockButtonTextSelected,
                  ]}>
                    Out of Stock
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Offer/Discount */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Discount / Offer</Text>
              <TextInput
                style={styles.input}
                value={offer}
                onChangeText={setOffer}
                placeholder="e.g. 10% off, Buy 1 Get 1 Free, etc. (optional)"
                autoCapitalize="sentences"
                placeholderTextColor="#888"
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? "Saving..." : editingItem ? "Update Item" : "Add Item"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      
      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        visible={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onBarcodeScanned={handleBarcodeScanned}
        convex={convex}
      />
    </Modal>
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
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  form: {
    paddingVertical: 20,
    gap: 20,
  },
  imageSection: {
    alignItems: "center",
    gap: 12,
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  itemImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 8,
  },
  imageOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 16,
    padding: 6,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    color: "#1F2937",
  },
  textArea: {
    minHeight: 80,
  },
  categoryContainer: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
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
  stockContainer: {
    gap: 8,
  },
  stockButtons: {
    flexDirection: "row",
    gap: 12,
  },
  stockButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  stockButtonInStock: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },
  stockButtonOutOfStock: {
    backgroundColor: "#DC2626",
    borderColor: "#DC2626",
  },
  stockButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  stockButtonTextSelected: {
    color: "#FFFFFF",
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  submitButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    zIndex: 10,
    maxHeight: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionText: {
    fontSize: 15,
    color: '#374151',
  },
  // Barcode styles
  barcodeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barcodeInput: {
    flex: 1,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    gap: 4,
  },
  scanButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  // Source indicator styles
  sourceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  sourceText: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '500',
  },
});