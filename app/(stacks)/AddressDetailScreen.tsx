import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import React, { useState, useEffect } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import tokenService from '@/services/tokenService'
import userService from '@/services/userService'
import Ionicons from '@expo/vector-icons/Ionicons'

interface AddressFormData {
  street: string
  streetLine1: string
  streetLine2: string
  wardOrSubDistrict: string
  district: string
  city: string
}

export default function AddressDetailScreen() {
  const router = useRouter()
  const { addressId } = useLocalSearchParams()
  const { user, refreshUser } = useAuth()

  const isEditMode = !!addressId

  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(isEditMode)
  const [formData, setFormData] = useState<AddressFormData>({
    street: '',
    streetLine1: '',
    streetLine2: '',
    wardOrSubDistrict: '',
    district: '',
    city: '',
  })
  const [errors, setErrors] = useState<Partial<AddressFormData>>({})

  useEffect(() => {
    if (isEditMode && addressId) {
      loadAddressDetails()
    }
  }, [addressId])

  const loadAddressDetails = async () => {
    try {
      setInitialLoading(true)
      const token = await tokenService.getToken()
      if (!token) return

      const address = await userService.getAddress(addressId as string, token)
      
      setFormData({
        street: address.street,
        streetLine1: address.streetLine1,
        streetLine2: address.streetLine2 || '',
        wardOrSubDistrict: address.wardOrSubDistrict,
        district: address.district,
        city: address.city,
      })
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load address details')
      router.back()
    } finally {
      setInitialLoading(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<AddressFormData> = {}

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

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const token = await tokenService.getToken()
      if (!token) {
        Alert.alert('Error', 'Please login again')
        return
      }

      if (isEditMode && addressId) {
        // Update existing address
        await userService.updateAddress(token, addressId as string, formData)
        Alert.alert('Success', 'Address updated successfully', [
          {
            text: 'OK',
            onPress: async () => {
              router.back()
            }
          }
        ])
      } else {
        // Create new address
        if (!user?.userId) {
          Alert.alert('Error', 'User information not found')
          return
        }

        await userService.createAddress(token, {
          userId: user.userId,
          ...formData,
        })
        Alert.alert('Success', 'Address added successfully', [
          {
            text: 'OK',
            onPress: async () => {
              await refreshUser()
              router.back()
            }
          }
        ])
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || `Failed to ${isEditMode ? 'update' : 'create'} address`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true)
              const token = await tokenService.getToken()
              if (!token || !addressId) return

              await userService.deleteAddress(token, addressId as string)
              Alert.alert('Success', 'Address deleted successfully', [
                {
                  text: 'OK',
                  onPress: async () => {
                    await refreshUser()
                    router.back()
                  }
                }
              ])
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete address')
            } finally {
              setLoading(false)
            }
          }
        }
      ]
    )
  }

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading address details...</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditMode ? 'Edit Address' : 'Add Address'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>
          {/* Street */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Street <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.street && styles.inputError]}
              placeholder="e.g., DHT 13"
              placeholderTextColor="#999"
              value={formData.street}
              onChangeText={(text) => {
                setFormData({ ...formData, street: text })
                if (errors.street) setErrors({ ...errors, street: '' })
              }}
            />
            {errors.street && <Text style={styles.errorText}>{errors.street}</Text>}
          </View>

          {/* Street Line 1 */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Street Line 1 <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.streetLine1 && styles.inputError]}
              placeholder="e.g., 41/12/16"
              placeholderTextColor="#999"
              value={formData.streetLine1}
              onChangeText={(text) => {
                setFormData({ ...formData, streetLine1: text })
                if (errors.streetLine1) setErrors({ ...errors, streetLine1: '' })
              }}
            />
            {errors.streetLine1 && (
              <Text style={styles.errorText}>{errors.streetLine1}</Text>
            )}
          </View>

          {/* Street Line 2 */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Street Line 2 (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Apartment 502"
              placeholderTextColor="#999"
              value={formData.streetLine2}
              onChangeText={(text) => setFormData({ ...formData, streetLine2: text })}
            />
          </View>

          {/* Ward/Sub-district */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Ward/Sub-district <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.wardOrSubDistrict && styles.inputError]}
              placeholder="e.g., Ben Nghe Ward"
              placeholderTextColor="#999"
              value={formData.wardOrSubDistrict}
              onChangeText={(text) => {
                setFormData({ ...formData, wardOrSubDistrict: text })
                if (errors.wardOrSubDistrict)
                  setErrors({ ...errors, wardOrSubDistrict: '' })
              }}
            />
            {errors.wardOrSubDistrict && (
              <Text style={styles.errorText}>{errors.wardOrSubDistrict}</Text>
            )}
          </View>

          {/* District */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              District <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.district && styles.inputError]}
              placeholder="e.g., District 1"
              placeholderTextColor="#999"
              value={formData.district}
              onChangeText={(text) => {
                setFormData({ ...formData, district: text })
                if (errors.district) setErrors({ ...errors, district: '' })
              }}
            />
            {errors.district && <Text style={styles.errorText}>{errors.district}</Text>}
          </View>

          {/* City */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              City <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.city && styles.inputError]}
              placeholder="e.g., Ho Chi Minh City"
              placeholderTextColor="#999"
              value={formData.city}
              onChangeText={(text) => {
                setFormData({ ...formData, city: text })
                if (errors.city) setErrors({ ...errors, city: '' })
              }}
            />
            {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
          </View>

          {/* Info Text */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
            <Text style={styles.infoText}>
              Fields marked with <Text style={styles.required}>*</Text> are required
            </Text>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>
                  {isEditMode ? 'Update Address' : 'Add Address'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Delete Button (only in edit mode) */}
          {isEditMode && (
            <TouchableOpacity
              style={[styles.deleteButton, loading && styles.buttonDisabled]}
              onPress={handleDelete}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              <Text style={styles.deleteButtonText}>Delete Address</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  form: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#007AFF',
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 12,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  deleteButton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
})