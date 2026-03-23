import { ScrollView, Text, View, TouchableOpacity, Dimensions } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { formatPrice } from "@/lib/validation";
import { useAppStore } from "@/lib/store";
import { useEffect } from "react";
import { FONT_FAMILY } from "@/lib/fonts";

const LOGO_IMAGE = require("@/assets/images/haylan-logo.png");
const PRODUCT_IMAGE = require("@/assets/images/product-carton.png");

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { addToCart } = useAppStore();
  const { data: products, isLoading } = trpc.products.list.useQuery();
  const seedMutation = trpc.seed.products.useMutation();

  useEffect(() => {
    seedMutation.mutate();
  }, []);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        {/* Logo Header */}
        <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 8, backgroundColor: colors.background }}>
          <Image source={LOGO_IMAGE} style={{ width: 160, height: 100 }} contentFit="contain" />
        </View>

        {/* Hero Banner with product image */}
        <View style={{ marginHorizontal: 16, borderRadius: 20, overflow: "hidden", height: 200 }}>
          <View style={{ flex: 1, backgroundColor: "#E8F4FD" }}>
            <Image
              source={PRODUCT_IMAGE}
              style={{ width: "100%", height: "100%" }}
              contentFit="contain"
            />
          </View>
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              paddingHorizontal: 20,
              paddingVertical: 14,
              backgroundColor: "rgba(11, 111, 191, 0.8)",
            }}
          >
            <Text style={{ fontFamily: FONT_FAMILY.bold, color: "#fff", fontSize: 18, textAlign: "right" }}>
              نقاء الطبيعة في كل قطرة
            </Text>
            <Text style={{ fontFamily: FONT_FAMILY.regular, color: "rgba(255,255,255,0.9)", fontSize: 12, textAlign: "right", marginTop: 2 }}>
              مياه هيلان - اختيارك الأمثل للصحة والعافية
            </Text>
          </View>
        </View>

        {/* CTA Button */}
        <View style={{ marginHorizontal: 16, marginTop: 16 }}>
          <TouchableOpacity
            style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: "center" }}
            onPress={() => router.push("/(tabs)/products" as any)}
            activeOpacity={0.8}
          >
            <Text style={{ fontFamily: FONT_FAMILY.bold, color: "#fff", fontSize: 18 }}>
              اطلب الآن
            </Text>
          </TouchableOpacity>
        </View>

        {/* Products Section */}
        <View style={{ marginTop: 24, paddingHorizontal: 16 }}>
          <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 20, color: colors.foreground, textAlign: "right", marginBottom: 12 }}>
            منتجاتنا
          </Text>

          {isLoading ? (
            <View style={{ alignItems: "center", paddingVertical: 32 }}>
              <Text style={{ fontFamily: FONT_FAMILY.regular, color: colors.muted }}>جاري التحميل...</Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {products?.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={{
                    width: (SCREEN_WIDTH - 44) / 2,
                    backgroundColor: colors.surface,
                    borderRadius: 16,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/product/${product.id}` as any)}
                >
                  <View style={{ backgroundColor: "#F0F8FF", padding: 8 }}>
                    <Image
                      source={PRODUCT_IMAGE}
                      style={{ width: "100%", height: 120 }}
                      contentFit="contain"
                    />
                  </View>
                  <View style={{ padding: 12 }}>
                    <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 14, color: colors.foreground, textAlign: "right" }}>
                      {product.nameAr}
                    </Text>
                    <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 12, color: colors.muted, textAlign: "right", marginTop: 2 }}>
                      {product.size}
                    </Text>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                      <TouchableOpacity
                        style={{
                          backgroundColor: colors.primary,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8,
                        }}
                        onPress={() => {
                          addToCart({
                            productId: product.id,
                            productName: product.nameAr,
                            productSize: product.size,
                            imageUrl: product.imageUrl || "",
                            quantity: 1,
                            unitPrice: parseFloat(product.price),
                          });
                          router.push("/order" as any);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={{ fontFamily: FONT_FAMILY.semiBold, color: "#fff", fontSize: 12 }}>
                          اطلب
                        </Text>
                      </TouchableOpacity>
                      <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 14, color: colors.primary }}>
                        {formatPrice(product.price)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* About Section */}
        <View style={{ marginTop: 24, marginHorizontal: 16, padding: 16, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 16, color: colors.foreground, textAlign: "right", marginBottom: 8 }}>
            لماذا مياه هيلان؟
          </Text>
          <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 13, color: colors.muted, textAlign: "right", lineHeight: 22 }}>
            مياه هيلان هي مياه طبيعية نقية مستخرجة من أعماق الجبال اليمنية، تمر بأحدث عمليات التنقية والتعبئة لضمان أعلى معايير الجودة والنقاء.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
