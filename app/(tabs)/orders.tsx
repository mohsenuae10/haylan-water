import { Text, View, TouchableOpacity, ActivityIndicator, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAppStore } from "@/lib/store";
import { formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, validateYemeniPhone } from "@/lib/validation";
import { useState } from "react";
import { FlatList } from "react-native";

export default function OrdersScreen() {
  const router = useRouter();
  const colors = useColors();
  const { state } = useAppStore();
  const [phone, setPhone] = useState(state.user?.phone || "");
  const [searchPhone, setSearchPhone] = useState(state.user?.phone || "");
  const [phoneError, setPhoneError] = useState("");

  const { data: orders, isLoading, refetch } = trpc.orders.getByPhone.useQuery(
    { phone: searchPhone },
    { enabled: !!searchPhone && validateYemeniPhone(searchPhone).valid }
  );

  const handleSearch = () => {
    const validation = validateYemeniPhone(phone);
    if (!validation.valid) {
      setPhoneError(validation.message);
      return;
    }
    setPhoneError("");
    setSearchPhone(phone);
  };

  const renderOrder = ({ item: order }: { item: any }) => (
    <TouchableOpacity
      style={{
        backgroundColor: colors.surface,
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
      }}
      activeOpacity={0.7}
      onPress={() => router.push(`/order-detail/${order.id}` as any)}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View
          style={{
            backgroundColor: ORDER_STATUS_COLORS[order.status] + "20",
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "600", color: ORDER_STATUS_COLORS[order.status] }}>
            {ORDER_STATUS_LABELS[order.status]}
          </Text>
        </View>
        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground }}>
          #{order.orderNumber}
        </Text>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.primary }}>
          {formatPrice(order.totalAmount)}
        </Text>
        <Text style={{ fontSize: 12, color: colors.muted }}>
          {new Date(order.createdAt).toLocaleDateString("ar-YE")}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer className="px-4">
      <Text className="text-2xl font-bold text-foreground text-right pt-4 pb-3">
        {"\u0637\u0644\u0628\u0627\u062a\u064a"}
      </Text>

      {/* Phone Search */}
      {!state.user?.isLoggedIn && (
        <View className="mb-4">
          <Text style={{ fontSize: 13, color: colors.muted, textAlign: "right", marginBottom: 8 }}>
            {"\u0623\u062f\u062e\u0644 \u0631\u0642\u0645 \u062c\u0648\u0627\u0644\u0643 \u0644\u0639\u0631\u0636 \u0637\u0644\u0628\u0627\u062a\u0643"}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                paddingHorizontal: 16,
                borderRadius: 12,
                justifyContent: "center",
              }}
              onPress={handleSearch}
              activeOpacity={0.7}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>{"\u0628\u062d\u062b"}</Text>
            </TouchableOpacity>
            <TextInput
              style={{
                flex: 1,
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 12,
                fontSize: 16,
                textAlign: "right",
                borderWidth: 1,
                borderColor: phoneError ? colors.error : colors.border,
                color: colors.foreground,
              }}
              placeholder="7XXXXXXXX"
              placeholderTextColor={colors.muted}
              value={phone}
              onChangeText={(t) => { setPhone(t); setPhoneError(""); }}
              keyboardType="phone-pad"
              maxLength={9}
              returnKeyType="done"
              onSubmitEditing={handleSearch}
            />
          </View>
          {phoneError ? (
            <Text style={{ color: colors.error, fontSize: 12, textAlign: "right", marginTop: 4 }}>
              {phoneError}
            </Text>
          ) : null}
        </View>
      )}

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !searchPhone ? (
        <View className="flex-1 items-center justify-center">
          <Text style={{ fontSize: 16, color: colors.muted, textAlign: "center" }}>
            {"\u0623\u062f\u062e\u0644 \u0631\u0642\u0645 \u062c\u0648\u0627\u0644\u0643 \u0644\u0644\u0628\u062d\u062b \u0639\u0646 \u0637\u0644\u0628\u0627\u062a\u0643"}
          </Text>
        </View>
      ) : orders && orders.length > 0 ? (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text style={{ fontSize: 16, color: colors.muted, textAlign: "center" }}>
            {"\u0644\u0627 \u062a\u0648\u062c\u062f \u0637\u0644\u0628\u0627\u062a \u062d\u0627\u0644\u064a\u0627\u064b"}
          </Text>
        </View>
      )}
    </ScreenContainer>
  );
}
