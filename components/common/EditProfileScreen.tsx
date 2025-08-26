import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, Image } from "react-native";
import { pickProfileImage } from "../../services/profileImagePicker";

interface EditProfileProps {
  user: {
    name: string;
    email: string;
    phone?: string;
    photoUri?: string;
    password?: string;
  };
  onSave: (data: { name: string; email: string; phone?: string; photoUri?: string; password?: string }) => void;
  onCancel: () => void;
}

export default function EditProfileScreen({ user, onSave, onCancel }: EditProfileProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || "");
  const [photoUri, setPhotoUri] = useState(user.photoUri || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSave = () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert("Error", "Name and Email are required.");
      return;
    }
    if (phone && (!/^\d{10}$/.test(phone))) {
      Alert.alert("Error", "Phone number must be exactly 10 digits.");
      return;
    }
    if (password && password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }
    onSave({ name, email, phone, photoUri, password: password || undefined });
  };

  const handlePickImage = async () => {
    const uri = await pickProfileImage();
    if (uri) setPhotoUri(uri);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Profile</Text>
      <View style={styles.photoSection}>
        <TouchableOpacity onPress={handlePickImage} style={styles.photoButton}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.profilePhoto} />
          ) : (
            <View style={styles.profilePhotoPlaceholder}>
              <Text style={styles.addPhotoText}>Add Image</Text>
            </View>
          )}
        </TouchableOpacity>
          {photoUri ? (
            <TouchableOpacity onPress={() => setPhotoUri("")} style={styles.deletePhotoButton}>
              <Text style={styles.deletePhotoText}>Delete Photo</Text>
            </TouchableOpacity>
          ) : null}
        <Text style={styles.photoHint}>Tap to add or change your profile photo</Text>
      </View>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Name"
        placeholderTextColor="#888"
      />
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        keyboardType="email-address"
        placeholderTextColor="#888"
      />
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={text => setPhone(text.replace(/[^0-9]/g, '').slice(0, 10))}
        placeholder="Phone Number"
        keyboardType="phone-pad"
        maxLength={10}
        placeholderTextColor="#888"
      />
      <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
        <Text style={{ color: '#007AFF', marginBottom: 4, textAlign: 'right' }}>
          {showPassword ? 'Hide Password' : 'Change Password'}
        </Text>
      </TouchableOpacity>
      {showPassword && (
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="New Password"
          secureTextEntry
          placeholderTextColor="#888"
        />
      )}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.buttonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  photoButton: {
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: 8,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  profilePhotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ccc',
  },
  addPhotoText: {
    color: '#888',
    fontSize: 16,
  },
  deletePhotoButton: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F87171',
    borderRadius: 16,
  },
  deletePhotoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  photoHint: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    color: '#222',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: '#eee',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
