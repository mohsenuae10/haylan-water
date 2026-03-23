import { ScrollView, Text, View, TouchableOpacity, Dimensions } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { formatPrice } from "@/lib/validation";
import { useAppStore } from "@/lib/store";
import { useEffect } from "react";

const HERO_IMAGE = "https://d2xsxph8kpxj0f.cloudfront.net/100988061/e5nvExn8ER8JEKraLFKZX9/hero-banner-hhKVj8ng9xtMrci3YtDdDi.webp";
const LOGO_IMAGE = require("@/assets/images/haylan-logo.jpeg");

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
        <View className="items-center pt-4 pb-2 bg-background">
          <Image source={LOGO_IMAGE} style={{ width: 140, height: 80 }} contentFit="contain" />
        </View>

        {/* Hero Banner */}
        <View className="mx-4 rounded-2xl overflow-hidden" style={{ height: 180 }}>
          <Image
            source={{ uri: HERO_IMAGE }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              paddingHorizontal: 20,
              paddingVertical: 16,
              backgroundColor: "rgba(11, 111, 191, 0.75)",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800", textAlign: "right" }}>
              {"\u0646\u0642\u0627\u0621 \u0627\u0644\u0637\u0628\u064a\u0639\u0629 \u0641\u064a \u0643\u0644 \u0642\u0637\u0631\u0629"}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 13, textAlign: "right", marginTop: 2 }}>
              {"\u0645\u064a\u0627\u0647 \u0647\u064a\u0644\u0627\u0646 - \u0627\u062e\u062a\u064a\u0627\u0631\u0643 \u0627\u0644\u0623\u0645\u062b\u0644 \u0644\u0644\u0635\u062d\u0629 \u0648\u0627\u0644\u0639\u0627\u0641\u064a\u0629"}
            </Text>
          </View>
        </View>

        {/* CTA Button */}
        <View className="mx-4 mt-4">
          <TouchableOpacity
            className="rounded-xl py-4 items-center"
            style={{ backgroundColor: colors.primary }}
            onPress={() => router.push("/(tabs)/products" as any)}
            activeOpacity={0.8}
          >
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
              {"\u0627\u0637\u0644\u0628 \u0627\u0644\u0622\u0646"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Products Section */}
        <View className="mt-6 px-4">
          <Text className="text-xl font-bold text-foreground text-right mb-3">
            {"\u0645\u0646\u062a\u062c\u0627\u062a\u0646\u0627"}
          </Text>

          {isLoading ? (
            <View className="items-center py-8">
              <Text className="text-muted">{"\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644..."}</Text>
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
                  <Image
                    source={{ uri: product.imageUrl || "" }}
                    style={{ width: "100%", height: 140 }}
                    contentFit="contain"
                  />
                  <View style={{ padding: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground, textAlign: "right" }}>
                      {product.nameAr}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.muted, textAlign: "right", marginTop: 2 }}>
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
                        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
                          {"\u0627\u0637\u0644\u0628"}
                        </Text>
                      </TouchableOpacity>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary }}>
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
        <View className="mt-6 mx-4 p-4 rounded-xl" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, textAlign: "right", marginBottom: 8 }}>
            {"\u0644\u0645\u0627\u0630\u0627 \u0645\u064a\u0627\u0647 \u0647\u064a\u0644\u0627\u0646\u061f"}
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted, textAlign: "right", lineHeight: 22 }}>
            {"\u0645\u064a\u0627\u0647 \u0647\u064a\u0644\u0627\u0646 \u0647\u064a \u0645\u064a\u0627\u0647 \u0637\u0628\u064a\u0639\u064a\u0629 \u0646\u0642\u064a\u0629 \u0645\u0633\u062a\u062e\u0631\u062c\u0629 \u0645\u0646 \u0623\u0639\u0645\u0627\u0642 \u0627\u0644\u062c\u0628\u0627\u0644 \u0627\u0644\u064a\u0645\u0646\u064a\u0629\u060c \u062a\u0645\u0631 \u0628\u0623\u062d\u062f\u062b \u0639\u0645\u0644\u064a\u0627\u062a \u0627\u0644\u062a\u0646\u0642\u064a\u0629 \u0648\u0627\u0644\u062a\u0639\u0628\u0626\u0629 \u0644\u0636\u0645\u0627\u0646 \u0623\u0639\u0644\u0649 \u0645\u0639\u0627\u064a\u064a\u0631 \u0627\u0644\u062c\u0648\u062f\u0629 \u0648\u0627\u0644\u0646\u0642\u0627\u0621."}
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
