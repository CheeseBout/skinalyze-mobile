import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar
} from 'react-native'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { useAuth } from '@/hooks/useAuth'
import tokenService from '@/services/tokenService'
import userService from '@/services/userService'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useThemeColor } from '@/contexts/ThemeColorContext';

export default function ProfileScreen() {
  const router = useRouter()
  const { user, refreshUser, logout } = useAuth()
  const { primaryColor } = useThemeColor()
  
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    dob: user?.dob || '',
  })

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName,
        phone: user.phone,
        dob: user.dob,
      })
    }
  }, [user])

  const handleSave = async () => {
    setLoading(true)
    try {
      const token = await tokenService.getToken()
      if (!token) {
        Alert.alert('Error', 'Please login again')
        return
      }

      await userService.updateProfile(token, formData)
      await refreshUser()
      
      setIsEditing(false)
      Alert.alert('Success', 'Profile updated successfully')
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (user) {
      setFormData({
        fullName: user.fullName,
        phone: user.phone,
        dob: user.dob,
      })
    }
    setIsEditing(false)
  }

  const handleDeleteAddress = async (addressId: string) => {
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
              const token = await tokenService.getToken()
              if (!token) return

              await userService.deleteAddress(token, addressId)
              await refreshUser()
              Alert.alert('Success', 'Address deleted successfully')
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete address')
            }
          }
        }
      ]
    )
  }

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout()
            router.replace('/WelcomeScreen')
          }
        }
      ]
    )
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity 
          onPress={() => isEditing ? handleCancel() : setIsEditing(true)}
          style={styles.editButton}
        >
          <Text style={[styles.editButtonText, { color: primaryColor }]}>
            {isEditing ? 'Cancel' : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Picture */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {user.photoUrl ? (
              <Image source={{ uri: user.photoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: primaryColor }]}>
                <Text style={styles.avatarText}>
                  {user.fullName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.userName}>{user.fullName}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          
          {/* Status Badges */}
          <View style={styles.badgeContainer}>
            <View style={[styles.badge, user.isVerified ? styles.badgeVerified : styles.badgeUnverified]}>
              <Ionicons 
                name={user.isVerified ? "checkmark-circle" : "close-circle"} 
                size={16} 
                color={user.isVerified ? "#34C759" : "#FF3B30"} 
              />
              <Text style={[styles.badgeText, user.isVerified ? styles.badgeTextVerified : styles.badgeTextUnverified]}>
                {user.isVerified ? 'Verified' : 'Not Verified'}
              </Text>
            </View>
            <View style={[styles.badge, styles.badgeRole, { backgroundColor: `${primaryColor}15` }]}>
              <Text style={[styles.badgeTextRole, { color: primaryColor }]}>{user.role}</Text>
            </View>
          </View>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Full Name</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.input}
                    value={formData.fullName}
                    onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                    placeholder="Enter full name"
                  />
                ) : (
                  <Text style={styles.infoValue}>{user.fullName}</Text>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.input}
                    value={formData.phone}
                    onChangeText={(text) => setFormData({ ...formData, phone: text })}
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                  />
                ) : (
                  <Text style={styles.infoValue}>{user.phone}</Text>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Date of Birth</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.input}
                    value={formData.dob}
                    onChangeText={(text) => setFormData({ ...formData, dob: text })}
                    placeholder="YYYY-MM-DD"
                  />
                ) : (
                  <Text style={styles.infoValue}>{user.dob}</Text>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Ionicons name="wallet-outline" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Balance</Text>
                <Text style={styles.infoValue}>${user.balance}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Skin Analysis History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skin Analysis History</Text>
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => router.push('/(stacks)/AnalysisListScreen')}
          >
            <View style={styles.menuCardContent}>
              <View style={[styles.menuIconContainer, { backgroundColor: `${primaryColor}15` }]}>
                <Ionicons name="analytics" size={24} color={primaryColor} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>View Analysis History</Text>
                <Text style={styles.menuSubtitle}>See all your skin analysis results</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Order History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order History</Text>
          <TouchableOpacity
            style={styles.menuCard}
            onPress={() => router.push('/(stacks)/OrderListScreen')}
          >
            <View style={styles.menuCardContent}>
              <View style={[styles.menuIconContainer, { backgroundColor: `${primaryColor}15` }]}>
                <Ionicons name="receipt" size={24} color={primaryColor} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>View Order History</Text>
                <Text style={styles.menuSubtitle}>See all your past orders</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Address Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Address</Text>
            <TouchableOpacity 
              onPress={() => router.push('/(stacks)/AddressDetailScreen')}
              style={styles.addButton}
            >
              <Ionicons name="add-circle-outline" size={24} color={primaryColor} />
            </TouchableOpacity>
          </View>
          
          {user.addresses && user.addresses.length > 0 ? (
            user.addresses.map((address) => (
              <View key={address.addressId} style={styles.addressCard}>
                <View style={styles.addressContent}>
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={20} color="#666" />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoValue}>
                        {address.streetLine1}{address.streetLine2 ? `, ${address.streetLine2}` : ''}, {address.street}
                      </Text>
                      <Text style={styles.infoLabel}>
                        {address.wardOrSubDistrict}, {address.district}
                      </Text>
                      <Text style={styles.infoLabel}>{address.city}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.addressActions}>
                  <TouchableOpacity 
                    style={styles.iconButton}
                    onPress={() => router.push({
                      pathname: '/(stacks)/AddressDetailScreen',
                      params: { addressId: address.addressId }
                    })}
                  >
                    <Ionicons name="create-outline" size={20} color={primaryColor} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.iconButton}
                    onPress={() => handleDeleteAddress(address.addressId)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.infoCard}>
              <Text style={styles.noDataText}>No address available</Text>
              <TouchableOpacity 
                style={styles.addAddressButton}
                onPress={() => router.push('/(stacks)/AddressDetailScreen')}
              >
                <Text style={styles.addAddressButtonText}>Add Address</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Account Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Member Since</Text>
                <Text style={styles.infoValue}>
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.section}>
          {isEditing ? (
            <TouchableOpacity 
              style={[styles.saveButton, { backgroundColor: primaryColor }, loading && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push('/(stacks)/OrderListScreen' as any)}
              >
                <Ionicons name="receipt-outline" size={20} color={primaryColor} />
                <Text style={styles.actionButtonText}>My Orders</Text>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push('/(stacks)/ChangePasswordScreen')}
              >
                <Ionicons name="lock-closed-outline" size={20} color={primaryColor} />
                <Text style={styles.actionButtonText}>Change Password</Text>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, styles.logoutButton]}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
                <Text style={[styles.actionButtonText, styles.logoutButtonText]}>Logout</Text>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </View>
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
  editButton: {
    padding: 8,
  },
  editButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  badgeVerified: {
    backgroundColor: '#E8F9F0',
  },
  badgeUnverified: {
    backgroundColor: '#FFE8E8',
  },
  badgeRole: {
    backgroundColor: '#E3F2FF',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextVerified: {
    color: '#34C759',
  },
  badgeTextUnverified: {
    color: '#FF3B30',
  },
  badgeTextRole: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    textTransform: 'capitalize',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  addButton: {
    padding: 4,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  addressContent: {
    marginBottom: 12,
  },
  addressActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  iconButton: {
    padding: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  input: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500',
    borderBottomWidth: 1,
    borderBottomColor: '#007AFF',
    paddingVertical: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  noDataText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    marginBottom: 12,
  },
  addAddressButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addAddressButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  logoutButton: {
    marginBottom: 32,
  },
  logoutButtonText: {
    color: '#FF3B30',
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#666',
  },
})