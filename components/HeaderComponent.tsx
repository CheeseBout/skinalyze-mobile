import { View, Text, TextInput, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native'
import React, { useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth'
import { Alert } from 'react-native';

export default function HeaderComponent() {
  const [searchText, setSearchText] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const router = useRouter();
  const { logout } = useAuth();

  const menuItems = [
    { name: 'Profile', icon: 'person', url: 'ProfileScreen' },
    { name: 'Settings', icon: 'settings', url: 'SettingsScreen' },
    { name: 'About us', icon: 'information-circle', url: 'AboutScreen' },
    { name: 'Logout', icon: 'log-out', url: 'WelcomeScreen' },
  ]

  const handleClearSearch = () => {
    setSearchText('');
  };

  const handleSearchFocus = () => {
    // Navigate to dedicated search screen
    router.push('/(stacks)/SearchScreen');
  };

  const handleMenuPress = () => {
    setMenuVisible(!menuVisible)
  }

  const handleNavigate = async (path: string) => {
    setMenuVisible(false);
    
    if (path === 'WelcomeScreen') {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: async () => {
              await logout();
              router.replace('/WelcomeScreen');
            }
          }
        ]
      );
    } else {
      router.push(path as any);
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.searchContainer}
        activeOpacity={0.7}
        onPress={handleSearchFocus}
      >
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <Text style={styles.searchPlaceholder}>Search skincare products...</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.profileButton} onPress={handleMenuPress}>
        <Ionicons name="person-circle-outline" size={32} color="#007AFF" />
      </TouchableOpacity>

      {/* Dropdown Menu */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.dropdownMenu}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.menuItem,
                  index < menuItems.length - 1 && styles.menuItemBorder
                ]}
                onPress={() => handleNavigate(item.url)}
              >
                <Ionicons name={item.icon as any} size={22} color="#333" style={styles.menuIcon} />
                <Text style={styles.menuText}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingTop: 20, 
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 12,
    marginRight: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: '#999',
  },
  profileButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});