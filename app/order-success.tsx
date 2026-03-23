import { Text, View, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { FONT_FAMILY } from "@/lib/fonts";

export default function OrderSuccessScreen() {
  const router = useRouter();
  const colors = useColors();
  const { orderNumber, orderId } = useLocalSearchParams<{ orderNumber: string; orderId: string }>();

  return (
    <ScreenContainer className="items-center justify-center px-6">
      {/* Success Icon */}
      <View
        style={{
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: colors.success + "20",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        <IconSymbol name="checkmark" size={50} color={colors.success} />
      </View>

      <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 24, color: colors.foreground, textAlign: "center" }}>
        تم إرسال طلبك بنجاح!
      </Text>

      <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 8, lineHeight: 22 }}>
        سيتم التواصل معك قريباً لتأكيد الطلب
      </Text>

      {/* Order Number */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 14,
          padding: 20,
          marginTop: 24,
          width: "100%",
          alignItems: "center",
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 13, color: colors.muted }}>رقم الطلب</Text>
        <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 22, color: colors.primary, marginTop: 4 }}>
          #{orderNumber}
        </Text>
      </View>

      {/* Actions */}
      <View style={{ width: "100%", marginTop: 32, gap: 12 }}>
        <TouchableOpacity
          style={{
            backgroundColor: colors.primary,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
          }}
          onPress={() => router.push(`/order-detail/${orderId}` as any)}
          activeOpacity={0.8}
        >
          <Text style={{ fontFamily: FONT_FAMILY.bold, color: "#fff", fontSize: 16 }}>
            تتبع الطلب
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: colors.surface,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
            borderWidth: 1,
            borderColor: colors.border,
          }}
          onPress={() => router.replace("/(tabs)" as any)}
          activeOpacity={0.8}
        >
          <Text style={{ fontFamily: FONT_FAMILY.semiBold, color: colors.foreground, fontSize: 16 }}>
            العودة للرئيسية
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
