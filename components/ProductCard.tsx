import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "@/contexts/ThemeColorContext";
import { productService, Product } from "@/services/productService"; // Import Product interface

interface ProductCardProps {
  product: Product; // Use the actual Product type from your service
  onPress: () => void;
}

const ProductCard = React.memo<ProductCardProps>(({ product, onPress }) => {
  const { primaryColor } = useThemeColor();

  // 1. Get Pricing in USD
  const originalPriceUSD = product.sellingPrice || 0;
  const finalPriceUSD = productService.calculateDiscountedPrice(product);

  // 2. Convert to VND
  // const originalPriceVND = productService.convertToVND(originalPriceUSD);
  // const finalPriceVND = productService.convertToVND(finalPriceUSD);

  // 3. Determine Discount Status
  // We use the API's salePercentage string to determine if a discount exists
  const salePercentVal = parseFloat(product.salePercentage);
  const hasDiscount = salePercentVal > 0;

  // 4. Handle Image (API returns an array 'productImages')
  const displayImage =
    product.productImages && product.productImages.length > 0
      ? product.productImages[0]
      : "https://img.freepik.com/free-vector/illustration-gallery-icon_53876-27002.jpg?semt=ais_hybrid&w=740&q=80";

  // 5. Handle Rating
  const averageRating = productService.calculateAverageRating(product);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: displayImage }}
          style={styles.productImage}
          resizeMode="cover"
        />
        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>
              {Math.round(salePercentVal)}% OFF
            </Text>
          </View>
        )}
      </View>
      <View style={styles.content}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.productName || "Unknown Product"}
        </Text>
        <View style={styles.priceContainer}>
          {hasDiscount ? (
            <>
              <Text style={styles.discountedPrice}>
                {productService.formatPrice(finalPriceUSD)}
              </Text>
              <Text style={styles.originalPrice}>
                {productService.formatPrice(originalPriceUSD)}
              </Text>
            </>
          ) : (
            <Text style={styles.price}>
              {productService.formatPrice(originalPriceUSD)}
            </Text>
          )}
        </View>

        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={14} color="#FFD700" />
          <Text style={styles.ratingText}>
            {averageRating > 0 ? averageRating.toFixed(1) : "New"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

ProductCard.displayName = "ProductCard";

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
    overflow: "hidden",
  },
  imageContainer: {
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: 150,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: "#f0f0f0",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FF3B30",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  discountText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  content: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 6,
    lineHeight: 18,
    height: 36,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    height: 22,
    flexWrap: "wrap", // Added to prevent overflow if prices are long
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  discountedPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF3B30",
    marginRight: 6,
  },
  originalPrice: {
    fontSize: 12, // Slightly smaller for better fit
    color: "#999",
    textDecorationLine: "line-through",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
});

export default ProductCard;
