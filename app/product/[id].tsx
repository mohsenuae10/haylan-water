import { Text, View, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { formatPrice } from "@/lib/validation";
import { useAppStore } from "@/lib/store";
import { useState } from "react";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FONT_FAMILY } from "@/lib/fonts";

const PRODUCT_IMAGE = require("@/assets/images/product-carton.png");

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addToCart } = useAppStore();
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading } = trpc.products.getById.useQuery(
    { id: parseInt(id || "0") },
    { enabled: !!id }
  );

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (!product) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text style={{ fontFamily: FONT_FAMILY.regular, color: colors.muted }}>المنتج غير موجود</Text>
      </ScreenContainer>
    );
  }

  const totalPrice = parseFloat(product.price) * quantity;

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 16, paddingVertical: 8 }}>
        <TouchableOpacity
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <IconSymbol name="xmark" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        <View style={{ alignItems: "center", paddingVertical: 20, backgroundColor: "#F0F8FF", marginHorizontal: 16, borderRadius: 20 }}>
          <Image
            source={PRODUCT_IMAGE}
            style={{ width: 250, height: 250 }}
            contentFit="contain"
          />
        </View>

        {/* Product Info */}
        <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 24, color: colors.foreground, textAlign: "right" }}>
            {product.nameAr}
          </Text>
          <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 14, color: colors.muted, textAlign: "right", marginTop: 4 }}>
            {product.size}
          </Text>
          <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 22, color: colors.primary, textAlign: "right", marginTop: 8 }}>
            {formatPrice(product.price)}
          </Text>

          {product.descriptionAr && (
            <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 14, color: colors.muted, textAlign: "right", marginTop: 16, lineHeight: 22 }}>
              {product.descriptionAr}
            </Text>
          )}

          {/* Quantity Selector */}
          <View style={{ marginTop: 24 }}>
            <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 15, color: colors.foreground, textAlign: "right", marginBottom: 12 }}>
              الكمية
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 20 }}>
              <TouchableOpacity
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onPress={() => setQuantity((q) => q + 1)}
                activeOpacity={0.7}
              >
                <IconSymbol name="plus" size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 24, color: colors.foreground, minWidth: 40, textAlign: "center" }}>
                {quantity}
              </Text>
              <TouchableOpacity
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: quantity > 1 ? colors.surface : colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                activeOpacity={0.7}
                disabled={quantity <= 1}
              >
                <IconSymbol name="minus" size={22} color={quantity > 1 ? colors.foreground : colors.muted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <TouchableOpacity
          style={{
            backgroundColor: colors.primary,
            borderRadius: 14,
            paddingVertical: 16,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
          }}
          onPress={() => {
            addToCart({
              productId: product.id,
              productName: product.nameAr,
              productSize: product.size,
              imageUrl: product.imageUrl || "",
              quantity,
              unitPrice: parseFloat(product.price),
            });
            router.push("/order" as any);
          }}
          activeOpacity={0.8}
        >
          <Text style={{ fontFamily: FONT_FAMILY.bold, color: "#fff", fontSize: 16 }}>
            {"أضف للطلب - "}{formatPrice(totalPrice)}
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
