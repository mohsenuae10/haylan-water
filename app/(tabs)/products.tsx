import { Text, View, TouchableOpacity, Dimensions, ActivityIndicator, FlatList, ScrollView } from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getProducts, getCategories } from "@/lib/supabase";
import { formatPrice } from "@/lib/validation";
import { useAppStore } from "@/lib/store";
import { FONT_FAMILY } from "@/lib/fonts";
import { useEffect, useState } from "react";
import type { Product, Category, ProductCategory } from "@/lib/supabase-types";

const PRODUCT_IMAGE = require("@/assets/images/product-carton.png");
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const CATEGORY_ICONS: Record<string, string> = { water: "💧", tissues: "🧻" };

export default function ProductsScreen() {
  const router = useRouter();
  const { category: paramCategory } = useLocalSearchParams<{ category?: string }>();
  const colors = useColors();
  const { addToCart } = useAppStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  // Set initial category from navigation params
  useEffect(() => {
    if (paramCategory) {
      setActiveCategory(paramCategory);
    }
  }, [paramCategory]);

  // Load categories once
  useEffect(() => {
    getCategories().then(setCategories).catch(console.error);
  }, []);

  // Load products when category changes
  useEffect(() => {
    setIsLoading(true);
    const cat = activeCategory === "all" ? undefined : (activeCategory as ProductCategory);
    getProducts(true, cat)
      .then(setProducts)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [activeCategory]);

  const renderProduct = ({ item: product }: { item: Product }) => {
    const isWater = product.category === "water" || !product.category;
    return (
      <TouchableOpacity
        style={{
          width: (SCREEN_WIDTH - 44) / 2,
          backgroundColor: colors.surface,
          borderRadius: 16,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 12,
        }}
        activeOpacity={0.7}
        onPress={() => router.push(`/product/${product.id}` as any)}
      >
        {/* Category Badge */}
        <View style={{
          position: "absolute", top: 8, right: 8, zIndex: 1,
          backgroundColor: isWater ? "#E3F2FD" : "#F3E5F5",
          borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
        }}>
          <Text style={{ fontSize: 10, fontFamily: FONT_FAMILY.semiBold }}>
            {isWater ? "💧" : "🧻"}
          </Text>
        </View>

        <View style={{ backgroundColor: isWater ? "#F0F8FF" : "#FDF2FF", padding: 8 }}>
          {product.image_url ? (
            <Image source={{ uri: product.image_url }} style={{ width: "100%", height: 130 }} contentFit="contain" />
          ) : (
            <Image source={PRODUCT_IMAGE} style={{ width: "100%", height: 130 }} contentFit="contain" />
          )}
        </View>
        <View style={{ padding: 12 }}>
          <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 15, color: colors.foreground, textAlign: "right" }}>
            {product.name_ar}
          </Text>
          <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 12, color: colors.muted, textAlign: "right", marginTop: 2 }}>
            {product.size}
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 10,
              }}
              onPress={() => {
                addToCart({
                  productId: product.id,
                  productName: product.name_ar,
                  productSize: product.size,
                  imageUrl: product.image_url || "",
                  quantity: 1,
                  unitPrice: Number(product.price),
                });
                router.push("/order" as any);
              }}
              activeOpacity={0.7}
            >
              <Text style={{ fontFamily: FONT_FAMILY.semiBold, color: "#fff", fontSize: 13 }}>
                اطلب الآن
              </Text>
            </TouchableOpacity>
            <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 15, color: colors.primary }}>
              {formatPrice(product.price)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer className="px-4">
      <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 24, color: colors.foreground, textAlign: "right", paddingTop: 16, paddingBottom: 8 }}>
        منتجاتنا
      </Text>

      {/* Category Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, maxHeight: 44 }} contentContainerStyle={{ flexDirection: "row-reverse", gap: 8 }}>
        <TouchableOpacity
          onPress={() => setActiveCategory("all")}
          style={{
            flexDirection: "row-reverse",
            alignItems: "center",
            backgroundColor: activeCategory === "all" ? colors.primary : colors.surface,
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderWidth: 1,
            borderColor: activeCategory === "all" ? colors.primary : colors.border,
          }}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 14, marginLeft: 4 }}>📦</Text>
          <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 13, color: activeCategory === "all" ? "#fff" : colors.foreground }}>
            الكل
          </Text>
        </TouchableOpacity>

        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            onPress={() => setActiveCategory(cat.id)}
            style={{
              flexDirection: "row-reverse",
              alignItems: "center",
              backgroundColor: activeCategory === cat.id ? colors.primary : colors.surface,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: activeCategory === cat.id ? colors.primary : colors.border,
            }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 14, marginLeft: 4 }}>{CATEGORY_ICONS[cat.id] || "📦"}</Text>
            <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 13, color: activeCategory === cat.id ? "#fff" : colors.foreground }}>
              {cat.name_ar}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : products.length === 0 ? (
        <View style={{ alignItems: "center", paddingTop: 60 }}>
          <Text style={{ fontSize: 48 }}>📭</Text>
          <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 16, color: colors.muted, marginTop: 12 }}>
            لا توجد منتجات في هذا القسم
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </ScreenContainer>
  );
}
