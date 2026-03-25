import { Text, View, TouchableOpacity, ActivityIndicator, TextInput, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getOrdersByPhone } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";
import { formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, validateYemeniPhone } from "@/lib/validation";
import { useState, useEffect, useCallback } from "react";
import { FONT_FAMILY } from "@/lib/fonts";
import type { Order } from "@/lib/supabase-types";

export default function OrdersScreen() {
  const router = useRouter();
  const colors = useColors();
  const { state } = useAppStore();
  const [phone, setPhone] = useState(state.user?.phone || "");
  const [searchPhone, setSearchPhone] = useState(state.user?.phone || "");
  const [phoneError, setPhoneError] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOrders = useCallback(async (phoneNum: string) => {
    if (!phoneNum || !validateYemeniPhone(phoneNum).valid) return;
    setIsLoading(true);
    try {
      const data = await getOrdersByPhone(phoneNum);
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchPhone && validateYemeniPhone(searchPhone).valid) {
      fetchOrders(searchPhone);
    }
  }, [searchPhone, fetchOrders]);

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
          <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 12, color: ORDER_STATUS_COLORS[order.status] }}>
            {ORDER_STATUS_LABELS[order.status]}
          </Text>
        </View>
        <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 14, color: colors.foreground }}>
          #{order.order_number}
        </Text>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
        <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 14, color: colors.primary }}>
          {formatPrice(order.total_amount)}
        </Text>
        <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 12, color: colors.muted }}>
          {new Date(order.created_at).toLocaleDateString("ar-YE")}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer className="px-4">
      <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 24, color: colors.foreground, textAlign: "right", paddingTop: 16, paddingBottom: 12 }}>
        طلباتي
      </Text>

      {/* Phone Search */}
      {!state.user?.isLoggedIn && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 13, color: colors.muted, textAlign: "right", marginBottom: 8 }}>
            أدخل رقم جوالك لعرض طلباتك
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
              <Text style={{ fontFamily: FONT_FAMILY.semiBold, color: "#fff" }}>بحث</Text>
            </TouchableOpacity>
            <TextInput
              style={{
                flex: 1,
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 12,
                fontFamily: FONT_FAMILY.regular,
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
            <Text style={{ fontFamily: FONT_FAMILY.regular, color: colors.error, fontSize: 12, textAlign: "right", marginTop: 4 }}>
              {phoneError}
            </Text>
          ) : null}
        </View>
      )}

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !searchPhone ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 16, color: colors.muted, textAlign: "center" }}>
            أدخل رقم جوالك للبحث عن طلباتك
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
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 16, color: colors.muted, textAlign: "center" }}>
            لا توجد طلبات حالياً
          </Text>
        </View>
      )}
    </ScreenContainer>
  );
}
