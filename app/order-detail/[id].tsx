import { Text, View, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getOrderById } from "@/lib/supabase";
import { formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/validation";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { FONT_FAMILY } from "@/lib/fonts";
import { useState, useEffect } from "react";

const STATUSES = ["new", "processing", "delivering", "delivered"] as const;

interface OrderWithItems {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  status: string;
  total_amount: number;
  notes: string | null;
  items: Array<{
    id: number;
    product_name: string;
    product_size: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchOrder = async () => {
      try {
        const data = await getOrderById(parseInt(id));
        setOrder(data as any);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOrder();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchOrder, 10000);
    return () => clearInterval(interval);
  }, [id]);

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (!order) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text style={{ fontFamily: FONT_FAMILY.regular, color: colors.muted }}>الطلب غير موجود</Text>
      </ScreenContainer>
    );
  }

  const currentStatusIndex = STATUSES.indexOf(order.status as any);

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 }}>
        <View />
        <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 18, color: colors.foreground }}>تفاصيل الطلب</Text>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <IconSymbol name="xmark" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Order Number & Status */}
        <View style={{ backgroundColor: colors.primary, borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <Text style={{ fontFamily: FONT_FAMILY.regular, color: "rgba(255,255,255,0.8)", fontSize: 13, textAlign: "center" }}>رقم الطلب</Text>
          <Text style={{ fontFamily: FONT_FAMILY.bold, color: "#fff", fontSize: 24, textAlign: "center", marginTop: 4 }}>
            #{order.order_number}
          </Text>
          <View style={{ alignItems: "center", marginTop: 12 }}>
            <View style={{ backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 }}>
              <Text style={{ fontFamily: FONT_FAMILY.semiBold, color: "#fff", fontSize: 14 }}>
                {ORDER_STATUS_LABELS[order.status]}
              </Text>
            </View>
          </View>
        </View>

        {/* Status Timeline */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 15, color: colors.foreground, textAlign: "right", marginBottom: 16 }}>
            حالة الطلب
          </Text>
          {STATUSES.map((status, index) => {
            const isActive = index <= currentStatusIndex;
            const isCurrent = index === currentStatusIndex;
            return (
              <View key={status} style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View style={{ alignItems: "center", width: 30 }}>
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: isActive ? ORDER_STATUS_COLORS[status] : colors.border,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isActive && <IconSymbol name="checkmark" size={12} color="#fff" />}
                  </View>
                  {index < STATUSES.length - 1 && (
                    <View style={{ width: 2, height: 30, backgroundColor: isActive ? ORDER_STATUS_COLORS[status] : colors.border }} />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 12, paddingBottom: index < STATUSES.length - 1 ? 14 : 0 }}>
                  <Text style={{
                    fontFamily: isCurrent ? FONT_FAMILY.bold : FONT_FAMILY.medium,
                    fontSize: 14,
                    color: isActive ? colors.foreground : colors.muted,
                  }}>
                    {ORDER_STATUS_LABELS[status]}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Order Items */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 15, color: colors.foreground, textAlign: "right", marginBottom: 12 }}>
            المنتجات
          </Text>
          {(order as any).items?.map((item: any) => (
            <View key={item.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 13, color: colors.primary }}>
                {formatPrice(item.total_price)}
              </Text>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 14, color: colors.foreground }}>{item.product_name}</Text>
                <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 12, color: colors.muted }}>{item.product_size} x {item.quantity}</Text>
              </View>
            </View>
          ))}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 8 }}>
            <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 18, color: colors.primary }}>
              {formatPrice(order.total_amount)}
            </Text>
            <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 15, color: colors.foreground }}>
              الإجمالي
            </Text>
          </View>
        </View>

        {/* Customer Info */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 15, color: colors.foreground, textAlign: "right", marginBottom: 12 }}>
            بيانات العميل
          </Text>
          <InfoRow label="الاسم" value={order.customer_name} colors={colors} />
          <InfoRow label="الجوال" value={order.customer_phone} colors={colors} />
          <InfoRow label="العنوان" value={order.customer_address} colors={colors} />
          {order.notes && <InfoRow label="ملاحظات" value={order.notes} colors={colors} />}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function InfoRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
      <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 14, color: colors.foreground, flex: 1 }}>{value}</Text>
      <Text style={{ fontFamily: FONT_FAMILY.medium, fontSize: 13, color: colors.muted, marginLeft: 12 }}>{label}</Text>
    </View>
  );
}
