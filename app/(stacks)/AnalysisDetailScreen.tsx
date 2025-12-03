import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  Dimensions, 
  StatusBar, 
  Animated,
  ActivityIndicator
} from 'react-native';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SkinAnalysisResult } from '@/services/skinAnalysisService';
import { useThemeColor } from '@/contexts/ThemeColorContext';
import { useTranslation } from 'react-i18next';
import Carousel, { ProductItem } from '@/components/Carousel';
import { productService, Product } from '@/services/productService';

const { width } = Dimensions.get('window');

export default function AnalysisDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { primaryColor } = useThemeColor();
  const { t } = useTranslation();
  const [showMask, setShowMask] = useState(false);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Animations
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
  }, []);

  // --- DATA PARSING ---
  const result: SkinAnalysisResult = params.result
    ? JSON.parse(params.result as string)
    : null;

  // Create a stable string representation of the product IDs
  const productIdsKey = useMemo(() => {
    if (!result?.aiRecommendedProducts || result.aiRecommendedProducts.length === 0) {
      return '';
    }
    return result.aiRecommendedProducts.join(',');
  }, [result?.aiRecommendedProducts?.length, result?.aiRecommendedProducts?.[0]]);

  // Fetch recommended products
  useEffect(() => {
    // Early return if no product IDs
    if (!productIdsKey) {
      setRecommendedProducts([]);
      return;
    }

    const fetchRecommendedProducts = async () => {
      try {
        setLoadingProducts(true);
        const productIds = productIdsKey.split(',');
        const products: Product[] = [];
        
        // Fetch products in parallel for better performance
        const productPromises = productIds.map(async (productId) => {
          try {
            return await productService.getProductById(productId);
          } catch (error) {
            console.error(`Failed to fetch product ${productId}:`, error);
            return null;
          }
        });

        const fetchedProducts = await Promise.all(productPromises);
        
        // Filter out null values (failed fetches)
        const validProducts = fetchedProducts.filter((p): p is Product => p !== null);
        
        setRecommendedProducts(validProducts);
      } catch (error) {
        console.error('Error fetching recommended products:', error);
        setRecommendedProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchRecommendedProducts();
  }, [productIdsKey]); // Only depend on the stable string key

  if (!result) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('analysis.noData')}</Text>
          <TouchableOpacity onPress={() => router.back()} style={[styles.errorButton, { backgroundColor: primaryColor }]}>
             <Text style={styles.errorButtonText}>{t('analysis.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- LOGIC & CALCULATIONS ---
  const isManual = result.source === 'MANUAL';
  const isConditionDetection = result.aiDetectedCondition !== null;
  const isDiseaseDetection = result.aiDetectedDisease !== null;
  
  // 1. Determine Image
  const imageUrl = result.imageUrls && result.imageUrls.length > 0 
    ? result.imageUrls[0] 
    : null;

  // 2. Determine Mask (Only for AI Disease)
  let maskUrl: string | null = null;
  if (!isManual && result.mask) {
    if (Array.isArray(result.mask) && result.mask.length > 0) {
      maskUrl = result.mask[0];
    } else if (typeof result.mask === 'string') {
      maskUrl = result.mask;
    }
  }

  // 3. Parse all predictions if available
  const allPredictions = result.allPredictions 
    ? Object.entries(result.allPredictions)
        .sort(([, a], [, b]) => (b as number) - (a as number))
    : [];

  const confidence = result.confidence;

  // 4. Determine Colors & Icons & Texts
  let displayTitle = '';
  let displayType = '';
  let displayDescription = '';
  let themeColor = primaryColor;
  let iconName: any = 'scan';

  if (isManual) {
    // MANUAL ENTRY LOOK
    displayTitle = result.chiefComplaint || t('analysis.manualRecord');
    displayType = t('analysis.manual');
    themeColor = '#6D28D9'; // Purple
    iconName = 'create';
    
    const symptoms = result.patientSymptoms ? `${t('analysis.symptoms')}: ${result.patientSymptoms}` : '';
    const notes = result.notes ? `${t('analysis.notes')}: ${result.notes}` : '';
    displayDescription = [symptoms, notes].filter(Boolean).join('\n\n') || t('analysis.noDetails');

  } else if (isConditionDetection) {
    // AI CONDITION LOOK
    displayTitle = t('analysis.' + result.aiDetectedCondition);
    displayType = t('analysis.skinCondition');
    themeColor = primaryColor;
    iconName = 'water';
    displayDescription = t('analysis.' + result.aiDetectedCondition + '_desc');

  } else {
    // AI DISEASE LOOK
    displayTitle = t('analysis.' + result.aiDetectedDisease);
    displayType = t('analysis.diseaseDetection');
    themeColor = '#E91E63'; // Pink/Red
    iconName = 'medical';
    displayDescription = t('analysis.' + result.aiDetectedDisease + '_desc');
  }

  const handleAskAI = () => {
    const analysisText = `I need advice on this skin analysis:
    Type: ${displayType}
    Main Issue: ${displayTitle}
    Details: ${displayDescription}
    Source: ${result.source}
    
    Please analyze this and recommend a routine.`;

    const navParams: any = {
      prefillText: analysisText
    };
    
    if (imageUrl) {
      navParams.prefillImage = imageUrl;
    }

    router.push({
      pathname: '/(tabs)/ChatbotScreen',
      params: navParams
    });
  }

  // Helper function to get confidence color
  const getConfidenceColor = (value: number) => {
    if (value >= 0.7) return '#34C759'; // Green
    if (value >= 0.4) return '#FF9500'; // Orange
    return '#FF3B30'; // Red
  };

  // Prepare product carousel items - memoize to prevent recreation
  const productCarouselItems: ProductItem[] = useMemo(() => {
    return recommendedProducts.map((product) => ({
      type: 'product' as const,
      id: product.productId,
      product: product,
      onPress: () => {
        router.push({
          pathname: '/(stacks)/ProductDetailScreen',
          params: { productId: product.productId },
        });
      },
    }));
  }, [recommendedProducts, router]);

  // --- RENDER ---
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* 1. HEADER IMAGE SECTION */}
        <View style={styles.imageSection}>
          <View style={styles.imageContainer}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.placeholderImage, { backgroundColor: `${themeColor}10` }]}>
                <Ionicons name="image-outline" size={64} color={themeColor} />
                <Text style={{ color: themeColor, marginTop: 10, fontWeight: '600' }}>No Image Attached</Text>
              </View>
            )}

            {/* Mask Overlay (AI Only) */}
            {maskUrl && showMask && (
              <View style={styles.maskContainer}>
                <Image
                  source={{ uri: maskUrl }}
                  style={styles.maskImage}
                  resizeMode="cover"
                />
                <View style={styles.redTintOverlay} />
              </View>
            )}

            {/* Gradient */}
            <View style={styles.gradientOverlay} />
          </View>

          {/* Navigation Header */}
          <View style={styles.headerOverlay}>
            <TouchableOpacity
              style={styles.overlayButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <View style={styles.headerBadgeContainer}>
              <View style={[styles.headerBadge, { backgroundColor: themeColor }]}>
                <Ionicons name={iconName} size={14} color="#FFFFFF" />
              </View>
              <Text style={styles.headerTitle}>{displayType}</Text>
            </View>
            
            <View style={styles.overlayButton} />
          </View>

          {/* Mask Toggle */}
          {maskUrl && result.aiDetectedDisease?.toLowerCase() !== "normal" && (
            <View style={styles.maskControls}>
              <TouchableOpacity
                style={[
                  styles.maskToggle,
                  showMask && [styles.maskToggleActive, { backgroundColor: themeColor }]
                ]}
                onPress={() => setShowMask(!showMask)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={showMask ? 'eye-off' : 'eye'}
                  size={18}
                  color={showMask ? '#FFFFFF' : themeColor}
                />
                <Text style={[
                  styles.maskToggleText,
                  showMask && { color: '#FFFFFF' }
                ]}>
                  {showMask ? t('analysis.hideMask') : t('analysis.showMask')} 
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 2. CONTENT BODY */}
        <View style={styles.contentSection}>
          
          {/* MAIN DIAGNOSIS CARD */}
          <Animated.View
            style={[
              styles.resultCard,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View style={styles.resultHeader}>
              <View style={[styles.resultIconWrapper, { backgroundColor: `${themeColor}15` }]}>
                <View style={[styles.resultIcon, { backgroundColor: themeColor }]}>
                  <Ionicons name={iconName} size={32} color="#FFFFFF" />
                </View>
              </View>
              
              <View style={styles.resultTitleContainer}>
                <Text style={styles.resultLabel}>{t('analysis.resultLabel')}</Text>
                <Text style={[styles.resultValue, { color: themeColor }]}>
                  {displayTitle}
                </Text>
                {!isManual && confidence !== undefined && (
                  <View style={styles.confidenceContainer}>
                    <Text style={styles.confidenceLabel}>Confidence: </Text>
                    <Text style={[styles.confidenceValue, { color: getConfidenceColor(confidence) }]}>
                      {(confidence * 100).toFixed(1)}%
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.resultDivider} />

            <View style={styles.descriptionContainer}>
              <View style={styles.descriptionHeaderRow}>
                <Ionicons name="information-circle" size={18} color="#666" />
                <Text style={styles.descriptionLabel}>
                   {isManual ? t('analysis.symptomsNotes') : t('analysis.aboutCondition')}
                </Text>
              </View>
              <Text style={styles.resultDescription}>
                {displayDescription}
              </Text>
            </View>
          </Animated.View>

          {/* METADATA GRID */}
          <Animated.View
            style={[
              styles.detailsSection,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <Text style={styles.sectionTitle}>{t('analysis.analysisDetails')}</Text> 

            <View style={styles.detailsGrid}>
              <View style={styles.detailCard}>
                <View style={[styles.detailIconWrapper, { backgroundColor: '#F0F9FF' }]}>
                  <Ionicons name="calendar" size={20} color="#2196F3" />
                </View>
                <Text style={styles.detailLabel}>{t('analysis.date')}</Text> 
                <Text style={styles.detailValue}>
                  {new Date(result.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>

              <View style={styles.detailCard}>
                <View style={[styles.detailIconWrapper, { backgroundColor: '#FFF4E6' }]}>
                  <Ionicons name="time" size={20} color="#FF9800" />
                </View>
                <Text style={styles.detailLabel}>{t('analysis.time')}</Text> 
                <Text style={styles.detailValue}>
                  {new Date(result.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>

              <View style={styles.detailCard}>
                <View style={[styles.detailIconWrapper, { backgroundColor: '#F0FDF4' }]}>
                  <Ionicons name={isManual ? 'create' : 'sparkles'} size={20} color="#34C759" />
                </View>
                <Text style={styles.detailLabel}>{t('analysis.source')}</Text> 
                <Text style={styles.detailValue}>
                  {isManual ? t('analysis.manual') : t('analysis.aiScan')} 
                </Text>
              </View>

              <View style={styles.detailCard}>
                <View style={[styles.detailIconWrapper, { backgroundColor: '#F3E8FF' }]}>
                  <Ionicons name="layers" size={20} color="#A855F7" />
                </View>
                <Text style={styles.detailLabel}>{t('analysis.type')}</Text> 
                <Text style={styles.detailValue}>
                  {isManual ? t('analysis.manual') : (isConditionDetection ? t('analysis.condition') : t('analysis.disease'))} 
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* DISCLAIMER */}
          <Animated.View
            style={[
              styles.disclaimer,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View style={styles.disclaimerHeader}>
              <Ionicons name="shield-checkmark" size={20} color="#D97706" />
              <Text style={styles.disclaimerTitle}>{t('analysis.medicalDisclaimer')}</Text> 
            </View>
            <Text style={styles.disclaimerText}>
              {t('analysis.disclaimerText')} 
            </Text>
          </Animated.View>

          {/* RECOMMENDED PRODUCTS CAROUSEL */}
          {!isManual && productIdsKey && (
            <Animated.View
              style={[
                styles.recommendedSection,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
              ]}
            >
              <View style={styles.recommendedHeader}>
                <View style={styles.recommendedTitleContainer}>
                  <View style={[styles.recommendedIcon, { backgroundColor: `${primaryColor}15` }]}>
                    <Ionicons name="sparkles" size={20} color={primaryColor} />
                  </View>
                  <Text style={styles.recommendedTitle}>AI Suggestions</Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/HomeScreen')}
                  style={styles.viewAllButton}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.viewAllText, { color: primaryColor }]}>View All</Text>
                  <Ionicons name="arrow-forward" size={16} color={primaryColor} />
                </TouchableOpacity>
              </View>

              {loadingProducts ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={primaryColor} />
                  <Text style={styles.loadingText}>Loading recommendations...</Text>
                </View>
              ) : recommendedProducts.length > 0 ? (
                <Carousel
                  items={productCarouselItems}
                  autoPlay={false}
                  showPagination={true}
                  itemWidth={width * 0.45}
                  itemSpacing={16}
                />
              ) : (
                <View style={styles.noProductsContainer}>
                  <Ionicons name="cube-outline" size={48} color="#999" />
                  <Text style={styles.noProductsText}>No products available</Text>
                </View>
              )}
            </Animated.View>
          )}

          {/* ACTIONS */}
          <Animated.View
            style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
          >
            <TouchableOpacity
              style={[styles.askAIButton, { backgroundColor: '#F8F9FA', borderColor: themeColor }]}
              onPress={handleAskAI}
              activeOpacity={0.8}
            >
              <View style={[styles.askAIIcon, { backgroundColor: `${themeColor}15` }]}>
                <Ionicons name="chatbubbles" size={20} color={themeColor} />
              </View>
              <Text style={[styles.askAIText, { color: themeColor }]}>{t('analysis.askAI')}</Text> 
              <Ionicons name="arrow-forward" size={18} color={themeColor} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.consultButton, { backgroundColor: '#FFFFFF', borderColor: '#2196F3' }]}
              onPress={() => router.push('/(stacks)/DermatologistListScreen')}
              activeOpacity={0.8}
            >
              <View style={[styles.consultIcon, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="medical" size={20} color="#2196F3" />
              </View>
              <Text style={[styles.consultText, { color: '#2196F3' }]}>Consult with Experts</Text>
              <Ionicons name="arrow-forward" size={18} color="#2196F3" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: primaryColor }]}
              onPress={() => router.push('/(tabs)/AnalyzeScreen')}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>{t('analysis.startNew')}</Text> 
            </TouchableOpacity>
          </Animated.View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // ...existing styles...
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0, left: 0, right: 0, height: 400, overflow: 'hidden',
  },
  circle1: {
    position: 'absolute', width: 350, height: 350, borderRadius: 175, top: -150, right: -80,
  },
  circle2: {
    position: 'absolute', width: 250, height: 250, borderRadius: 125, top: -80, left: -60,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  imageSection: {
    position: 'relative',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#000',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  imageContainer: {
    width: width,
    height: width * 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  maskContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  maskImage: {
    width: '100%',
    height: '100%',
    opacity: 0.65,
  },
  redTintOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 0, 50, 0.1)',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, height: 150,
    backgroundColor: 'transparent',
    backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  overlayButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerBadgeContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
  },
  headerBadge: {
    width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16, fontWeight: '700', color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  maskControls: {
    position: 'absolute', bottom: 24, left: 0, right: 0,
    alignItems: 'center',
  },
  maskToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFFFF', paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  maskToggleActive: {},
  maskToggleText: {
    fontSize: 14, fontWeight: '700', color: '#1A1A1A',
  },
  maskToggleTextActive: {
    color: '#FFFFFF',
  },
  contentSection: {
    padding: 24,
    marginTop: -20,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  resultHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    marginBottom: 20,
  },
  resultIconWrapper: {
    width: 64, height: 64, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  resultIcon: {
    width: 48, height: 48, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
  },
  resultTitleContainer: {
    flex: 1,
  },
  resultLabel: {
    fontSize: 12, fontWeight: '700', color: '#999',
    marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1,
  },
  resultValue: {
    fontSize: 24, fontWeight: '800', lineHeight: 30,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  confidenceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  confidenceValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  resultDivider: {
    height: 1, backgroundColor: '#F0F0F0', marginBottom: 20,
  },
  descriptionContainer: {
    backgroundColor: '#FAFAFA', borderRadius: 16, padding: 16,
  },
  descriptionHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8,
  },
  descriptionLabel: {
    fontSize: 12, fontWeight: '700', color: '#666',
    textTransform: 'uppercase',
  },
  resultDescription: {
    fontSize: 15, fontWeight: '400', color: '#333', lineHeight: 24,
  },
  detailsSection: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 16,
    letterSpacing: -0.3,
  },
  detailsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  detailCard: {
    width: (width - 60) / 2, backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  detailIconWrapper: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  detailLabel: {
    fontSize: 11, fontWeight: '700', color: '#999', marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 13, fontWeight: '700', color: '#1A1A1A', textAlign: 'center',
  },
  disclaimer: {
    backgroundColor: '#FFF8E1', borderRadius: 16, padding: 16, marginBottom: 24,
    borderLeftWidth: 4, borderLeftColor: '#F59E0B',
  },
  disclaimerHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6,
  },
  disclaimerTitle: {
    fontSize: 14, fontWeight: '800', color: '#B45309',
  },
  disclaimerText: {
    fontSize: 12, color: '#78350F', lineHeight: 18, fontWeight: '500',
  },
  recommendedSection: {
    marginBottom: 24,
  },
  recommendedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recommendedTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recommendedIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommendedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  noProductsContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  noProductsText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  askAIButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 16, borderRadius: 18, borderWidth: 1.5,
    marginBottom: 16, backgroundColor: '#FFFFFF',
  },
  askAIIcon: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  askAIText: {
    fontSize: 16, fontWeight: '700',
  },
  consultButton: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 10,
    paddingVertical: 16, 
    borderRadius: 18, 
    borderWidth: 1.5,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  consultIcon: {
    width: 32, 
    height: 32, 
    borderRadius: 10,
    justifyContent: 'center', 
    alignItems: 'center',
  },
  consultText: {
    fontSize: 16, 
    fontWeight: '700',
  },
  actionButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 18, borderRadius: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 8,
  },
  actionButtonText: {
    fontSize: 17, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3,
  },
  errorContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40,
  },
  errorIcon: {
    width: 100, height: 100, borderRadius: 50,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  errorTitle: {
    fontSize: 22, fontWeight: '800', color: '#1A1A1A', marginBottom: 8,
  },
  errorText: {
    fontSize: 15, color: '#666', marginBottom: 28, textAlign: 'center',
  },
  errorButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 14, paddingHorizontal: 28, borderRadius: 16,
  },
  errorButtonText: {
    fontSize: 16, fontWeight: '700', color: '#FFFFFF',
  },
});