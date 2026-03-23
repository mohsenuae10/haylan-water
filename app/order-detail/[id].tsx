import { Text, View, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/validation";
import { IconSymbol } from "@/components/ui/icon-symbol";

const STATUSES = ["new", "processing", "delivering", "delivered"] as const;

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();

  const { data: order, isLoading } = trpc.orders.getById.useQuery(
    { id: parseInt(id || "0") },
    { enabled: !!id, refetchInterval: 10000 }
  );

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
        <Text className="text-muted">{"\u0627\u0644\u0637\u0644\u0628 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f"}</Text>
      </ScreenContainer>
    );
  }

  const currentStatusIndex = STATUSES.indexOf(order.status as any);

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 }}>
        <View />
        <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>{"\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0637\u0644\u0628"}</Text>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <IconSymbol name="xmark" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Order Number & Status */}
        <View style={{ backgroundColor: colors.primary, borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, textAlign: "center" }}>{"\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628"}</Text>
          <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800", textAlign: "center", marginTop: 4 }}>
            #{order.orderNumber}
          </Text>
          <View style={{ alignItems: "center", marginTop: 12 }}>
            <View style={{ backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 }}>
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
                {ORDER_STATUS_LABELS[order.status]}
              </Text>
            </View>
          </View>
        </View>

        {/* Status Timeline */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground, textAlign: "right", marginBottom: 16 }}>
            {"\u062d\u0627\u0644\u0629 \u0627\u0644\u0637\u0644\u0628"}
          </Text>
          {STATUSES.map((status, index) => {
            const isActive = index <= currentStatusIndex;
            const isCurrent = index === currentStatusIndex;
            return (
              <View key={status} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: index < STATUSES.length - 1 ? 0 : 0 }}>
                {/* Timeline Line */}
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
                    fontSize: 14,
                    fontWeight: isCurrent ? "700" : "500",
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
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground, textAlign: "right", marginBottom: 12 }}>
            {"\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a"}
          </Text>
          {(order as any).items?.map((item: any) => (
            <View key={item.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontSize: 13, color: colors.primary, fontWeight: "600" }}>
                {formatPrice(item.totalPrice)}
              </Text>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>{item.productName}</Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>{item.productSize} x {item.quantity}</Text>
              </View>
            </View>
          ))}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: colors.primary }}>
              {formatPrice(order.totalAmount)}
            </Text>
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground }}>
              {"\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a"}
            </Text>
          </View>
        </View>

        {/* Customer Info */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground, textAlign: "right", marginBottom: 12 }}>
            {"\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0639\u0645\u064a\u0644"}
          </Text>
          <InfoRow label={"\u0627\u0644\u0627\u0633\u0645"} value={order.customerName} colors={colors} />
          <InfoRow label={"\u0627\u0644\u062c\u0648\u0627\u0644"} value={order.customerPhone} colors={colors} />
          <InfoRow label={"\u0627\u0644\u0639\u0646\u0648\u0627\u0646"} value={order.customerAddress} colors={colors} />
          {order.notes && <InfoRow label={"\u0645\u0644\u0627\u062d\u0638\u0627\u062a"} value={order.notes} colors={colors} />}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function InfoRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
      <Text style={{ fontSize: 14, color: colors.foreground, flex: 1 }}>{value}</Text>
      <Text style={{ fontSize: 13, color: colors.muted, marginLeft: 12 }}>{label}</Text>
    </View>
  );
}
