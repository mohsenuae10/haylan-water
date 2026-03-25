import { ScrollView, Text, View, TouchableOpacity, Dimensions, ActivityIndicator, FlatList } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getCategories, getFeaturedProducts, getBanners } from "@/lib/supabase";
import { formatPrice } from "@/lib/validation";
import { useAppStore } from "@/lib/store";
import { useEffect, useState, useRef, useCallback } from "react";
import { FONT_FAMILY } from "@/lib/fonts";
import type { Product, Category, Banner } from "@/lib/supabase-types";

const LOGO_IMAGE = require("@/assets/images/haylan-logo.png");
const PRODUCT_IMAGE = require("@/assets/images/product-carton.png");

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BANNER_WIDTH = SCREEN_WIDTH - 32;
const BANNER_HEIGHT = 200;
const BANNER_INTERVAL = 4000; // Auto-slide every 4 seconds

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
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const bannerListRef = useRef<FlatList>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Promise.all([getCategories(), getFeaturedProducts(6), getBanners()])
      .then(([cats, products, bannersData]) => {
        setCategories(cats);
        setFeaturedProducts(products);
        setBanners(bannersData);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  // Auto-slide banners
  useEffect(() => {
    if (banners.length <= 1) return;

    bannerTimerRef.current = setInterval(() => {
      setActiveBannerIndex((prev) => {
        const next = (prev + 1) % banners.length;
        bannerListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, BANNER_INTERVAL);

    return () => {
      if (bannerTimerRef.current) clearInterval(bannerTimerRef.current);
    };
  }, [banners.length]);

  const onBannerScroll = useCallback((event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / BANNER_WIDTH);
    setActiveBannerIndex(index);
  }, []);

  const handleBannerPress = (banner: Banner) => {
    if (banner.link_type === "category" && banner.link_value) {
      router.push({ pathname: "/(tabs)/products", params: { category: banner.link_value } } as any);
    } else if (banner.link_type === "product" && banner.link_value) {
      router.push(`/product/${banner.link_value}` as any);
    }
  };

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

        {/* Banner Carousel */}
        {banners.length > 0 ? (
          <View style={{ marginHorizontal: 16, marginTop: 12 }}>
            <FlatList
              ref={bannerListRef}
              data={banners}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onBannerScroll}
              keyExtractor={(item) => item.id.toString()}
              snapToInterval={BANNER_WIDTH}
              decelerationRate="fast"
              getItemLayout={(_, index) => ({
                length: BANNER_WIDTH,
                offset: BANNER_WIDTH * index,
                index,
              })}
              renderItem={({ item: banner }) => (
                <TouchableOpacity
                  activeOpacity={banner.link_type !== "none" ? 0.85 : 1}
                  onPress={() => handleBannerPress(banner)}
                  style={{ width: BANNER_WIDTH, height: BANNER_HEIGHT, borderRadius: 16, overflow: "hidden" }}
                >
                  <Image
                    source={{ uri: banner.image_url }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    transition={300}
                  />
                  {/* Banner overlay text */}
                  {(banner.title_ar || banner.description_ar) && (
                    <View style={{
                      position: "absolute", bottom: 0, left: 0, right: 0,
                      backgroundColor: "rgba(0,0,0,0.45)",
                      paddingHorizontal: 14, paddingVertical: 10,
                    }}>
                      {banner.title_ar && (
                        <Text style={{ fontFamily: FONT_FAMILY.bold, color: "#fff", fontSize: 16, textAlign: "right" }}>
                          {banner.title_ar}
                        </Text>
                      )}
                      {banner.description_ar && (
                        <Text style={{ fontFamily: FONT_FAMILY.regular, color: "rgba(255,255,255,0.9)", fontSize: 12, textAlign: "right", marginTop: 2 }} numberOfLines={1}>
                          {banner.description_ar}
                        </Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              )}
            />
            {/* Dot Indicators */}
            {banners.length > 1 && (
              <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 8, gap: 6 }}>
                {banners.map((_, i) => (
                  <View
                    key={i}
                    style={{
                      width: activeBannerIndex === i ? 20 : 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: activeBannerIndex === i ? colors.primary : colors.border,
                    }}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          /* Fallback static promo when no banners exist */
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
        )}

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
                      borderRadius: 16,
                      overflow: "hidden",
                      borderWidth: 1.5,
                      borderColor: style.border,
                      height: 160,
                    }}
                    activeOpacity={0.7}
                  >
                    {cat.image_url ? (
                      <Image source={{ uri: cat.image_url }} style={{ width: "100%", height: "100%", position: "absolute" }} contentFit="cover" />
                    ) : (
                      <View style={{ width: "100%", height: "100%", position: "absolute", backgroundColor: style.bg, justifyContent: "center", alignItems: "center" }}>
                        <Text style={{ fontSize: 48 }}>{cat.icon}</Text>
                      </View>
                    )}
                    {/* Overlay gradient */}
                    <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.45)", paddingVertical: 10, paddingHorizontal: 12 }}>
                      <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 16, color: "#fff", textAlign: "center" }}>
                        {cat.name_ar}
                      </Text>
                      {cat.description_ar ? (
                        <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 11, color: "rgba(255,255,255,0.85)", textAlign: "center", marginTop: 2 }} numberOfLines={1}>
                          {cat.description_ar}
                        </Text>
                      ) : null}
                    </View>
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
