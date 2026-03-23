import { Text, View, TouchableOpacity, Dimensions, ActivityIndicator, FlatList } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { formatPrice } from "@/lib/validation";
import { useAppStore } from "@/lib/store";
import { FONT_FAMILY } from "@/lib/fonts";

const PRODUCT_IMAGE = require("@/assets/images/product-carton.png");
const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ProductsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { addToCart } = useAppStore();
  const { data: products, isLoading } = trpc.products.list.useQuery();

  const renderProduct = ({ item: product }: { item: any }) => (
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
      <View style={{ backgroundColor: "#F0F8FF", padding: 8 }}>
        <Image
          source={PRODUCT_IMAGE}
          style={{ width: "100%", height: 130 }}
          contentFit="contain"
        />
      </View>
      <View style={{ padding: 12 }}>
        <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 15, color: colors.foreground, textAlign: "right" }}>
          {product.nameAr}
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

  return (
    <ScreenContainer className="px-4">
      <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 24, color: colors.foreground, textAlign: "right", paddingTop: 16, paddingBottom: 12 }}>
        منتجاتنا
      </Text>
      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
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
