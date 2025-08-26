import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PasswordInputProps extends TextInputProps {
  containerStyle?: any;
  inputStyle?: any;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  containerStyle,
  inputStyle,
  ...textInputProps
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.lockIcon} />
      <TextInput
        {...textInputProps}
        style={[styles.input, inputStyle]}
        secureTextEntry={!isPasswordVisible}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity
        style={styles.eyeButton}
        onPress={togglePasswordVisibility}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
          size={20}
          color="#6B7280"
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  lockIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  eyeButton: {
    padding: 4,
    marginLeft: 8,
  },
});
