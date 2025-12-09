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
  ActivityIndicator,
  Animated,
  Modal
} from 'react-native'
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'expo-router'
import { register, RegisterPayload } from '@/services/authService'
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/hooks/useAuth'
import { useThemeColor } from '@/contexts/ThemeColorContext'
import { Picker } from '@react-native-picker/picker'; 
import { AddressKitPicker } from '@/components/AddressKitPicker';
import { Province, District, Commune } from '@/services/userService';

// Static definition ensures no calculation errors
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

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
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterPayload | 'confirmPassword', string>>>({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  
  // Date Picker States
  const [showCalendar, setShowCalendar] = useState(false)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(1); // 1-12
  const [selectedDay, setSelectedDay] = useState(1);
  
  // AddressKit States - ĐỔI TÊN
  const [selectedProvinceCode, setSelectedProvinceCode] = useState('');
  const [selectedDistrictCode, setSelectedDistrictCode] = useState('');
  const [selectedCommuneCode, setSelectedCommuneCode] = useState('');
  
  const [phoneDigits, setPhoneDigits] = useState('')
  const { primaryColor } = useThemeColor();
  const { login: authLogin } = useAuth()

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof RegisterPayload | 'confirmPassword', string>> = {}

    if (!formData.email.trim()) newErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid'

    if (!formData.password) newErrors.password = 'Password is required'
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters'

    if (!confirmPassword) newErrors.confirmPassword = 'Please confirm your password'
    else if (confirmPassword !== formData.password) newErrors.confirmPassword = 'Passwords do not match'

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required'

    if (!formData.phone.trim()) newErrors.phone = 'Phone is required'
    else if (!/^\+84\d{9}$/.test(formData.phone)) newErrors.phone = 'Phone number must be 9 digits'

    if (!formData.dob.trim()) newErrors.dob = 'Date of birth is required'

    if (!formData.street.trim()) newErrors.street = 'Street is required'
    if (!formData.streetLine1.trim()) newErrors.streetLine1 = 'Street line 1 is required'
    if (!formData.wardOrSubDistrict.trim()) newErrors.wardOrSubDistrict = 'Ward/Sub-district is required'
    if (!formData.district.trim()) newErrors.district = 'District is required'
    if (!formData.city.trim()) newErrors.city = 'City is required'

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
      
      Alert.alert('Success', 'Registration successful! Welcome to Skinalyze!', [
        {
          text: 'OK',
          onPress: () => router.replace('/(tabs)/HomeScreen')
        }
      ])
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message || 'Unable to register. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '')
    const limited = cleaned.slice(0, 9)
    setPhoneDigits(limited)
    setFormData({ ...formData, phone: limited ? `+84${limited}` : '' })
    if (errors.phone) setErrors({ ...errors, phone: '' })
  }

  // REFACTORED: String-based formatting prevents timezone shifts
  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parts[2];
    
    const monthName = MONTH_NAMES[monthIndex] ? MONTH_NAMES[monthIndex].slice(0, 3) : '';
    
    return `${day} ${monthName} ${year}` // "23 Feb 2004"
  }

  // AddressKit Handlers - CẬP NHẬT
  const handleProvinceSelect = (province: Province) => {
    setSelectedProvinceCode(province.code);
    setFormData({
      ...formData,
      city: province.name_with_type, // Thay đổi từ province.name
    });
    if (errors.city) setErrors({ ...errors, city: '' });
    
    // Reset dependent selections
    setSelectedDistrictCode('');
    setSelectedCommuneCode('');
    setFormData(prev => ({
      ...prev,
      district: '',
      wardOrSubDistrict: '',
    }));
  };

  const handleDistrictSelect = (district: District) => {
    setSelectedDistrictCode(district.code);
    setFormData({
      ...formData,
      district: district.name_with_type, // Thay đổi từ district.name
    });
    if (errors.district) setErrors({ ...errors, district: '' });
    
    // Reset commune selection
    setSelectedCommuneCode('');
    setFormData(prev => ({
      ...prev,
      wardOrSubDistrict: '',
    }));
  };

  const handleCommuneSelect = (commune: Commune) => {
    setSelectedCommuneCode(commune.code);
    setFormData({
      ...formData,
      wardOrSubDistrict: commune.name_with_type, // Thay đổi từ commune.name
    });
    if (errors.wardOrSubDistrict) setErrors({ ...errors, wardOrSubDistrict: '' });
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={styles.stepItem}>
          <View style={[
            styles.stepCircle,
            currentStep >= step && { backgroundColor: primaryColor },
            currentStep < step && styles.stepCircleInactive
          ]}>
            {currentStep > step ? (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            ) : (
              <Text style={[
                styles.stepNumber,
                currentStep >= step && styles.stepNumberActive
              ]}>{step}</Text>
            )}
          </View>
          {step < 3 && (
            <View style={[
              styles.stepLine,
              currentStep > step && { backgroundColor: primaryColor }
            ]} />
          )}
        </View>
      ))}
    </View>
  )

  // --- Date Logic ---

  // Helper to get days in month (accounts for leap years correctly)
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  // Memoized arrays to prevent re-renders
  const years = useMemo(() => 
    Array.from({ length: new Date().getFullYear() - 1900 + 1 }, (_, i) => 1900 + i).reverse(), 
  []);
  
  const days = useMemo(() => 
    Array.from({ length: getDaysInMonth(selectedYear, selectedMonth) }, (_, i) => i + 1),
  [selectedYear, selectedMonth]);

  // Update DOB string construction
  const handleDateConfirm = () => {
    const formattedDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    setFormData({ ...formData, dob: formattedDate });
    if (errors.dob) setErrors({ ...errors, dob: '' });
    setShowCalendar(false);
  };

  // Initialize picker with current selection or defaults
  const handleOpenCalendar = () => {
    if (formData.dob) {
        const [y, m, d] = formData.dob.split('-').map(Number);
        setSelectedYear(y);
        setSelectedMonth(m);
        setSelectedDay(d);
    } else {
        const now = new Date();
        setSelectedYear(now.getFullYear());
        setSelectedMonth(now.getMonth() + 1);
        setSelectedDay(now.getDate());
    }
    setShowCalendar(true);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      
      <View style={styles.backgroundPattern}>
        <View style={[styles.circle1, { backgroundColor: `${primaryColor}08` }]} />
        <View style={[styles.circle2, { backgroundColor: `${primaryColor}05` }]} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => currentStep === 1 ? router.back() : setCurrentStep(currentStep - 1)}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          
          <View style={[styles.iconContainer, { backgroundColor: `${primaryColor}15` }]}>
            <View style={[styles.iconCircle, { backgroundColor: primaryColor }]}>
              <Ionicons name="person-add" size={28} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join us and start your journey</Text>

          {renderStepIndicator()}
        </Animated.View>

        {/* Form Card */}
        <Animated.View 
          style={[
            styles.formCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Step 1: Personal Info */}
          {currentStep === 1 && (
            <>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              
              <InputField
                label="Full Name"
                placeholder="Enter your full name"
                icon="person-outline"
                value={formData.fullName}
                onChangeText={(text) => {
                  setFormData({ ...formData, fullName: text })
                  if (errors.fullName) setErrors({ ...errors, fullName: '' })
                }}
                error={errors.fullName}
                primaryColor={primaryColor}
              />

              <InputField
                label="Email Address"
                placeholder="Enter your email"
                icon="mail-outline"
                value={formData.email}
                onChangeText={(text) => {
                  setFormData({ ...formData, email: text })
                  if (errors.email) setErrors({ ...errors, email: '' })
                }}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                primaryColor={primaryColor}
              />

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={[styles.inputWrapper, errors.phone && styles.inputWrapperError]}>
                  <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
                  <View style={styles.phonePrefix}>
                    <Text style={styles.phonePrefixText}>+84</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInput}
                    placeholder="123456789"
                    placeholderTextColor="#999"
                    value={phoneDigits}
                    onChangeText={handlePhoneChange}
                    keyboardType="phone-pad"
                    maxLength={9}
                  />
                  {phoneDigits && !errors.phone && (
                    <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                  )}
                </View>
                {errors.phone && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={14} color="#FF3B30" />
                    <Text style={styles.errorText}>{errors.phone}</Text>
                  </View>
                )}
                <Text style={styles.helperText}>9 digits after country code</Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Date of Birth</Text>
                <TouchableOpacity
                  style={[styles.inputWrapper, errors.dob && styles.inputWrapperError]}
                  onPress={handleOpenCalendar}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar-outline" size={20} color="#666" style={styles.inputIcon} />
                  <Text style={[styles.dateText, !formData.dob && styles.placeholderText]}>
                    {formData.dob ? formatDate(formData.dob) : 'Select your date of birth'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
                {errors.dob && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={14} color="#FF3B30" />
                    <Text style={styles.errorText}>{errors.dob}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.nextButton, { backgroundColor: primaryColor }]}
                onPress={() => setCurrentStep(2)}
                activeOpacity={0.8}
              >
                <Text style={styles.nextButtonText}>Next</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          )}

          {/* Step 2: Security */}
          {currentStep === 2 && (
            <>
              <Text style={styles.sectionTitle}>Security</Text>

              <PasswordField
                label="Password"
                placeholder="Enter your password"
                value={formData.password}
                onChangeText={(text: any) => {
                  setFormData({ ...formData, password: text })
                  if (errors.password) setErrors({ ...errors, password: '' })
                }}
                error={errors.password}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                primaryColor={primaryColor}
              />

              <PasswordField
                label="Confirm Password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChangeText={(text: any) => {
                  setConfirmPassword(text)
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' })
                }}
                error={errors.confirmPassword}
                showPassword={showConfirmPassword}
                setShowPassword={setShowConfirmPassword}
                primaryColor={primaryColor}
              />

              {confirmPassword && formData.password && (
                <View style={styles.matchIndicator}>
                  <Ionicons 
                    name={confirmPassword === formData.password ? "checkmark-circle" : "close-circle"} 
                    size={20} 
                    color={confirmPassword === formData.password ? "#34C759" : "#FF3B30"} 
                  />
                  <Text style={[
                    styles.matchText,
                    { color: confirmPassword === formData.password ? "#34C759" : "#FF3B30" }
                  ]}>
                    {confirmPassword === formData.password ? "Passwords match" : "Passwords don't match"}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.nextButton, { backgroundColor: primaryColor }]}
                onPress={() => setCurrentStep(3)}
                activeOpacity={0.8}
              >
                <Text style={styles.nextButtonText}>Next</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          )}

          {/* Step 3: Address */}
          {currentStep === 3 && (
            <>
              <Text style={styles.sectionTitle}>Address Information</Text>

              <InputField
                label="Street"
                placeholder="e.g., 123"
                icon="home-outline"
                value={formData.street}
                onChangeText={(text) => {
                  setFormData({ ...formData, street: text })
                  if (errors.street) setErrors({ ...errors, street: '' })
                }}
                error={errors.street}
                primaryColor={primaryColor}
              />

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <InputField
                    label="Street Line 1"
                    placeholder="Building/House No."
                    icon="location-outline"
                    value={formData.streetLine1}
                    onChangeText={(text) => {
                      setFormData({ ...formData, streetLine1: text })
                      if (errors.streetLine1) setErrors({ ...errors, streetLine1: '' })
                    }}
                    error={errors.streetLine1}
                    primaryColor={primaryColor}
                  />
                </View>
                <View style={styles.halfInput}>
                  <InputField
                    label="Street Line 2"
                    placeholder="Apt/Unit"
                    icon="location-outline"
                    value={formData.streetLine2}
                    onChangeText={(text) => {
                      setFormData({ ...formData, streetLine2: text })
                    }}
                    primaryColor={primaryColor}
                  />
                </View>
              </View>

              {/* AddressKit Picker */}
              <AddressKitPicker
                selectedProvinceCode={selectedProvinceCode}
                selectedDistrictCode={selectedDistrictCode}
                selectedCommuneCode={selectedCommuneCode}
                onProvinceSelect={handleProvinceSelect}
                onDistrictSelect={handleDistrictSelect}
                onCommuneSelect={handleCommuneSelect}
                primaryColor={primaryColor}
                error={{
                  city: errors.city,
                  district: errors.district,
                  wardOrSubDistrict: errors.wardOrSubDistrict,
                }}
              />

              <TouchableOpacity
                style={[
                  styles.registerButton,
                  { backgroundColor: primaryColor },
                  loading && styles.buttonDisabled
                ]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.registerButtonText}>Create Account</Text>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(stacks)/SignInScreen')} activeOpacity={0.7}>
              <Text style={[styles.footerLink, { color: primaryColor }]}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCalendar(false)}
        >
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Select Date of Birth</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Ionicons name="close" size={24} color="#1A1A1A" />
              </TouchableOpacity>
            </View>
            <View style={styles.pickerRow}>
              <View style={styles.pickerWrapper}>
                <Text style={styles.pickerLabel}>Day</Text>
                <Picker
                  selectedValue={selectedDay}
                  onValueChange={(val) => setSelectedDay(val)}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {days.map((d) => (
                    <Picker.Item key={d} label={String(d)} value={d} />
                  ))}
                </Picker>
              </View>
              <View style={styles.pickerWrapper}>
                <Text style={styles.pickerLabel}>Month</Text>
                <Picker
                  selectedValue={selectedMonth}
                  onValueChange={(val) => setSelectedMonth(val)}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {MONTH_NAMES.map((m, i) => (
                    <Picker.Item key={i} label={m} value={i + 1} />
                  ))}
                </Picker>
              </View>
              <View style={styles.pickerWrapper}>
                <Text style={styles.pickerLabel}>Year</Text>
                <Picker
                  selectedValue={selectedYear}
                  onValueChange={(val) => setSelectedYear(val)}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {years.map((y) => (
                    <Picker.Item key={y} label={String(y)} value={y} />
                  ))}
                </Picker>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: primaryColor }]}
              onPress={handleDateConfirm}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  )
}

// Reusable Input Components
interface InputFieldProps {
  label: string
  placeholder: string
  icon: any
  value: string
  onChangeText: (text: string) => void
  error?: string
  keyboardType?: any
  autoCapitalize?: any
  primaryColor: string
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  placeholder,
  icon,
  value,
  onChangeText,
  error,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}) => (
  <View style={styles.inputContainer}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
      <Ionicons name={icon} size={20} color="#666" style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#999"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
      {value && !error && (
        <Ionicons name="checkmark-circle" size={20} color="#34C759" />
      )}
    </View>
    {error && (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={14} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    )}
  </View>
)

const PasswordField: React.FC<any> = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  showPassword,
  setShowPassword,
}) => (
  <View style={styles.inputContainer}>
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
      <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#999"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
      />
      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
        <Ionicons 
          name={showPassword ? "eye-outline" : "eye-off-outline"} 
          size={20} 
          color="#666" 
        />
      </TouchableOpacity>
    </View>
    {error && (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={14} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    )}
  </View>
)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    top: -200,
    right: -100,
  },
  circle2: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -100,
    left: -100,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666666',
    fontWeight: '500',
    marginBottom: 24,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  stepCircleInactive: {
    backgroundColor: '#E5E5E5',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#999',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLine: {
    width: 32,
    height: 2,
    backgroundColor: '#E5E5E5',
    marginHorizontal: 4,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  inputWrapperError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1A1A1A',
  },
  phonePrefix: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#E5E5E5',
    borderRadius: 8,
    marginRight: 8,
  },
  phonePrefixText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1A1A1A',
  },
  dateText: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1A1A1A',
  },
  placeholderText: {
    color: '#999',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  matchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: -8,
    marginBottom: 16,
  },
  matchText: {
    fontSize: 14,
    fontWeight: '600',
  },
  nextButton: {
    flexDirection: 'row',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  registerButton: {
    flexDirection: 'row',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#666666',
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  datePickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  datePickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  pickerWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  picker: {
    width: 100,
    height: 150,
  },
  pickerItem: {
     fontSize: 16, 
     height: 150 
  },
  confirmButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
})