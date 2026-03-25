import { ScrollView, Text, View, TouchableOpacity, Dimensions, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getCategories, getFeaturedProducts } from "@/lib/supabase";
import { formatPrice } from "@/lib/validation";
import { useAppStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { FONT_FAMILY } from "@/lib/fonts";
import type { Product, Category } from "@/lib/supabase-types";

const LOGO_IMAGE = require("@/assets/images/haylan-logo.png");
const PRODUCT_IMAGE = require("@/assets/images/product-carton.png");

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const CATEGORY_STYLES: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  water: { bg: "#E3F2FD", border: "#1976D2", text: "#1565C0", iconBg: "#BBDEFB" },
  tissues: { bg: "#F3E5F5", border: "#7B1FA2", text: "#6A1B9A", iconBg: "#E1BEE7" },
};

const DEFAULT_STYLE = { bg: "#E8F5E9", border: "#388E3C", text: "#2E7D32", iconBg: "#C8E6C9" };

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { addToCart } = useAppStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getCategories(), getFeaturedProducts(6)])
      .then(([cats, products]) => {
        setCategories(cats);
        setFeaturedProducts(products);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const getCatStyle = (id: string) => CATEGORY_STYLES[id] || DEFAULT_STYLE;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        {/* Logo Header */}
        <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4, backgroundColor: colors.background }}>
          <Image source={LOGO_IMAGE} style={{ width: 160, height: 100 }} contentFit="contain" />
          <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 22, color: colors.primary, marginTop: 2 }}>
            مجموعة هيلان
          </Text>
          <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 12, color: colors.muted, marginTop: 2 }}>
            مياه نقية • مناديل فاخرة • توصيل لباب بيتك
          </Text>
        </View>

        {/* Promo Banner */}
        <View style={{ marginHorizontal: 16, marginTop: 12, borderRadius: 16, overflow: "hidden", backgroundColor: colors.primary, padding: 18 }}>
          <Text style={{ fontFamily: FONT_FAMILY.bold, color: "#fff", fontSize: 18, textAlign: "right" }}>
            🎉 جديد! مناديل هيلان
          </Text>
          <Text style={{ fontFamily: FONT_FAMILY.regular, color: "rgba(255,255,255,0.85)", fontSize: 13, textAlign: "right", marginTop: 4 }}>
            الآن يمكنك طلب مناديل هيلان الناعمة مع طلب المياه في نفس التطبيق
          </Text>
          <TouchableOpacity
            onPress={() => router.push({ pathname: "/(tabs)/products", params: { category: "tissues" } } as any)}
            style={{ backgroundColor: "#fff", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16, alignSelf: "flex-start", marginTop: 12 }}
            activeOpacity={0.8}
          >
            <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 13, color: colors.primary }}>
              تسوق المناديل ←
            </Text>
          </TouchableOpacity>
        </View>

        {/* Categories Section */}
        <View style={{ marginTop: 20, paddingHorizontal: 16 }}>
          <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 20, color: colors.foreground, textAlign: "right", marginBottom: 12 }}>
            أقسامنا
          </Text>

          {isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ paddingVertical: 20 }} />
          ) : (
            <View style={{ flexDirection: "row", gap: 12 }}>
              {categories.map((cat) => {
                const style = getCatStyle(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => router.push({ pathname: "/(tabs)/products", params: { category: cat.id } } as any)}
                    style={{
                      flex: 1,
                      backgroundColor: style.bg,
                      borderRadius: 16,
                      padding: 16,
                      borderWidth: 1.5,
                      borderColor: style.border,
                      alignItems: "center",
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: style.iconBg, justifyContent: "center", alignItems: "center", marginBottom: 8 }}>
                      <Text style={{ fontSize: 28 }}>{cat.icon}</Text>
                    </View>
                    <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 16, color: style.text }}>
                      {cat.name_ar}
                    </Text>
                    <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 11, color: "#666", textAlign: "center", marginTop: 4 }}>
                      {cat.description_ar}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* CTA Button */}
        <View style={{ marginHorizontal: 16, marginTop: 16 }}>
          <TouchableOpacity
            style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center" }}
            onPress={() => router.push("/(tabs)/products" as any)}
            activeOpacity={0.8}
          >
            <Text style={{ fontFamily: FONT_FAMILY.bold, color: "#fff", fontSize: 18 }}>
              تسوق جميع المنتجات
            </Text>
          </TouchableOpacity>
        </View>

        {/* Featured Products */}
        <View style={{ marginTop: 24, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <TouchableOpacity onPress={() => router.push("/(tabs)/products" as any)} activeOpacity={0.7}>
              <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 13, color: colors.primary }}>عرض الكل</Text>
            </TouchableOpacity>
            <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 20, color: colors.foreground }}>
              منتجات مميزة
            </Text>
          </View>

          {isLoading ? (
            <View style={{ alignItems: "center", paddingVertical: 32 }}>
              <Text style={{ fontFamily: FONT_FAMILY.regular, color: colors.muted }}>جاري التحميل...</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 4 }}>
              {featuredProducts.map((product) => {
                const isWater = product.category === "water" || !product.category;
                return (
                  <TouchableOpacity
                    key={product.id}
                    style={{
                      width: 160,
                      backgroundColor: colors.surface,
                      borderRadius: 14,
                      overflow: "hidden",
                      marginLeft: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
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
                        {isWater ? "💧 مياه" : "🧻 مناديل"}
                      </Text>
                    </View>

                    <View style={{ backgroundColor: isWater ? "#F0F8FF" : "#FDF2FF", padding: 8 }}>
                      {product.image_url ? (
                        <Image source={{ uri: product.image_url }} style={{ width: "100%", height: 100 }} contentFit="contain" />
                      ) : (
                        <View style={{ width: "100%", height: 100, justifyContent: "center", alignItems: "center" }}>
                          <Text style={{ fontSize: 48 }}>{isWater ? "💧" : "🧻"}</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ padding: 10 }}>
                      <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 13, color: colors.foreground, textAlign: "right" }} numberOfLines={2}>
                        {product.name_ar}
                      </Text>
                      <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 11, color: colors.muted, textAlign: "right", marginTop: 2 }}>
                        {product.size}
                      </Text>
                      <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 14, color: colors.primary, textAlign: "right", marginTop: 4 }}>
                        {formatPrice(product.price)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* About Section */}
        <View style={{ marginTop: 24, marginHorizontal: 16, padding: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 16, color: colors.foreground, textAlign: "center", marginBottom: 12 }}>
            لماذا مجموعة هيلان؟
          </Text>
          {[
            { icon: "💧", title: "مياه نقية", desc: "من أنقى المصادر الطبيعية في جبال اليمن" },
            { icon: "🧻", title: "مناديل فاخرة", desc: "ناعمة ومتينة بجودة عالية" },
            { icon: "🚚", title: "توصيل سريع", desc: "نوصل لباب بيتك بأسرع وقت" },
            { icon: "💰", title: "أسعار منافسة", desc: "أفضل الأسعار في السوق" },
          ].map((item, index) => (
            <View key={index} style={{ flexDirection: "row", alignItems: "center", marginBottom: index < 3 ? 10 : 0, justifyContent: "flex-end" }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 14, color: colors.foreground, textAlign: "right" }}>
                  {item.title}
                </Text>
                <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 11, color: colors.muted, textAlign: "right" }}>
                  {item.desc}
                </Text>
              </View>
              <Text style={{ fontSize: 26 }}>{item.icon}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
