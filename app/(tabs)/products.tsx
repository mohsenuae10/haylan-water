import { Text, View, TouchableOpacity, Dimensions, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { formatPrice } from "@/lib/validation";
import { useAppStore } from "@/lib/store";
import { FlatList } from "react-native";

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
      <Image
        source={{ uri: product.imageUrl || "" }}
        style={{ width: "100%", height: 150 }}
        contentFit="contain"
      />
      <View style={{ padding: 12 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground, textAlign: "right" }}>
          {product.nameAr}
        </Text>
        <Text style={{ fontSize: 12, color: colors.muted, textAlign: "right", marginTop: 2 }}>
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
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
              {"\u0627\u0637\u0644\u0628 \u0627\u0644\u0622\u0646"}
            </Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.primary }}>
            {formatPrice(product.price)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer className="px-4">
      <Text className="text-2xl font-bold text-foreground text-right pt-4 pb-3">
        {"\u0645\u0646\u062a\u062c\u0627\u062a\u0646\u0627"}
      </Text>
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
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
