import { Text, View, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

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

      <Text style={{ fontSize: 24, fontWeight: "800", color: colors.foreground, textAlign: "center" }}>
        {"\u062a\u0645 \u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628\u0643 \u0628\u0646\u062c\u0627\u062d!"}
      </Text>

      <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 8, lineHeight: 22 }}>
        {"\u0633\u064a\u062a\u0645 \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0645\u0639\u0643 \u0642\u0631\u064a\u0628\u0627\u064b \u0644\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u0637\u0644\u0628"}
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
        <Text style={{ fontSize: 13, color: colors.muted }}>{"\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628"}</Text>
        <Text style={{ fontSize: 22, fontWeight: "800", color: colors.primary, marginTop: 4 }}>
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
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
            {"\u062a\u062a\u0628\u0639 \u0627\u0644\u0637\u0644\u0628"}
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
          <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "600" }}>
            {"\u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u0644\u0631\u0626\u064a\u0633\u064a\u0629"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
