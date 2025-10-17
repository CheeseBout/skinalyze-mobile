import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native'
import React, { useState } from 'react'
import { useRouter } from 'expo-router'
import { register, RegisterPayload } from '@/services/authService'
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/hooks/useAuth';

export default function SignUpScreen() {
  const router = useRouter()
  const [formData, setFormData] = useState<RegisterPayload>({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    dob: '',
    street: '',
    streetLine1: '',
    streetLine2: '',
    wardOrSubDistrict: '',
    district: '',
    city: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterPayload, string>>>({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const { login: authLogin } = useAuth()

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof RegisterPayload, string>> = {}

    // Required field validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required'
    } else if (!/^\+?[\d\s-]+$/.test(formData.phone)) {
      newErrors.phone = 'Phone number is invalid'
    }

    if (!formData.dob.trim()) {
      newErrors.dob = 'Date of birth is required'
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.dob)) {
      newErrors.dob = 'Date format should be YYYY-MM-DD'
    }

    if (!formData.street.trim()) {
      newErrors.street = 'Street is required'
    }

    if (!formData.streetLine1.trim()) {
      newErrors.streetLine1 = 'Street line 1 is required'
    }

    if (!formData.wardOrSubDistrict.trim()) {
      newErrors.wardOrSubDistrict = 'Ward/Sub-district is required'
    }

    if (!formData.district.trim()) {
      newErrors.district = 'District is required'
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleRegister = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly.')
      return
    }

    setLoading(true)
    try {
      const response = await register(formData)

      await authLogin(response.data.access_token, response.data.user)
      
      Alert.alert('Success', 'Registration successful!', [
        {
          text: 'OK',
          onPress: () => router.replace('/SignInScreen')
        }
      ])
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Unable to register. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Personal Information */}
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <InputField
            label="Full Name"
            placeholder="Enter your full name"
            value={formData.fullName}
            onChangeText={(text) => setFormData({ ...formData, fullName: text })}
            error={errors.fullName}
          />

          <InputField
            label="Email"
            placeholder="Enter your email"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <InputField
            label="Phone"
            placeholder="+84932133157"
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            error={errors.phone}
            keyboardType="phone-pad"
          />

          <InputField
            label="Date of Birth"
            placeholder="YYYY-MM-DD (e.g., 2004-02-23)"
            value={formData.dob}
            onChangeText={(text) => setFormData({ ...formData, dob: text })}
            error={errors.dob}
          />

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
                placeholder="Enter your password"
                placeholderTextColor="#999"
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeIconText}>{showPassword ? <Ionicons name="eye" size={24} color="black" /> : <Ionicons name="eye-off" size={24} color="black" />}</Text>
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Address Information */}
          <Text style={styles.sectionTitle}>Address Information</Text>

          <InputField
            label="Street"
            placeholder="e.g., DHT 13"
            value={formData.street}
            onChangeText={(text) => setFormData({ ...formData, street: text })}
            error={errors.street}
          />

          <InputField
            label="Street Line 1"
            placeholder="e.g., 41/12/16"
            value={formData.streetLine1}
            onChangeText={(text) => setFormData({ ...formData, streetLine1: text })}
            error={errors.streetLine1}
          />

          <InputField
            label="Street Line 2 (Optional)"
            placeholder="e.g., 75"
            value={formData?.streetLine2 || ''}
            onChangeText={(text) => setFormData({ ...formData, streetLine2: text })}
          />

          <InputField
            label="Ward/Sub-district"
            placeholder="e.g., DHT"
            value={formData.wardOrSubDistrict}
            onChangeText={(text) => setFormData({ ...formData, wardOrSubDistrict: text })}
            error={errors.wardOrSubDistrict}
          />

          <InputField
            label="District"
            placeholder="e.g., District 12"
            value={formData.district}
            onChangeText={(text) => setFormData({ ...formData, district: text })}
            error={errors.district}
          />

          <InputField
            label="City"
            placeholder="e.g., Ho Chi Minh City"
            value={formData.city}
            onChangeText={(text) => setFormData({ ...formData, city: text })}
            error={errors.city}
          />

          {/* Register Button */}
          <TouchableOpacity 
            style={[styles.registerButton, loading && styles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.registerButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Sign In Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/SignInScreen')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// Reusable Input Field Component
interface InputFieldProps {
  label: string
  placeholder: string
  value: string
  onChangeText: (text: string) => void
  error?: string
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric'
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}) => (
  <View style={styles.inputContainer}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, error && styles.inputError]}
      placeholder={placeholder}
      placeholderTextColor="#999"
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
    />
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 28,
    color: '#1A1A1A',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
  form: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
    marginTop: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  eyeIconText: {
    fontSize: 20,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
  },
  registerButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
    marginBottom: 20,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#666666',
  },
  footerLink: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
})