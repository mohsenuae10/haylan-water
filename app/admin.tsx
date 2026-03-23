import { Text, View, TouchableOpacity, ActivityIndicator, Alert, ScrollView, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/validation";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState } from "react";
import { FlatList } from "react-native";

const STATUSES = ["all", "new", "processing", "delivering", "delivered"] as const;
const STATUS_FILTER_LABELS: Record<string, string> = {
  all: "\u0627\u0644\u0643\u0644",
  new: "\u062c\u062f\u064a\u062f",
  processing: "\u0642\u064a\u062f \u0627\u0644\u0645\u0639\u0627\u0644\u062c\u0629",
  delivering: "\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u0648\u0635\u064a\u0644",
  delivered: "\u062a\u0645 \u0627\u0644\u062a\u0633\u0644\u064a\u0645",
};

export default function AdminScreen() {
  const router = useRouter();
  const colors = useColors();
  const [activeTab, setActiveTab] = useState<"orders" | "products">("orders");
  const [statusFilter, setStatusFilter] = useState("all");

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 }}>
        <View />
        <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>{"\u0644\u0648\u062d\u0629 \u0627\u0644\u0625\u062f\u0627\u0631\u0629"}</Text>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <IconSymbol name="xmark" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 12 }}>
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: activeTab === "orders" ? colors.primary : colors.surface,
            alignItems: "center",
            borderWidth: 1,
            borderColor: activeTab === "orders" ? colors.primary : colors.border,
          }}
          onPress={() => setActiveTab("orders")}
          activeOpacity={0.7}
        >
          <Text style={{ color: activeTab === "orders" ? "#fff" : colors.foreground, fontWeight: "600" }}>
            {"\u0627\u0644\u0637\u0644\u0628\u0627\u062a"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: activeTab === "products" ? colors.primary : colors.surface,
            alignItems: "center",
            borderWidth: 1,
            borderColor: activeTab === "products" ? colors.primary : colors.border,
          }}
          onPress={() => setActiveTab("products")}
          activeOpacity={0.7}
        >
          <Text style={{ color: activeTab === "products" ? "#fff" : colors.foreground, fontWeight: "600" }}>
            {"\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a"}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "orders" ? (
        <AdminOrders statusFilter={statusFilter} setStatusFilter={setStatusFilter} colors={colors} router={router} />
      ) : (
        <AdminProducts colors={colors} />
      )}
    </ScreenContainer>
  );
}

function AdminOrders({ statusFilter, setStatusFilter, colors, router }: any) {
  const { data: orders, isLoading, refetch } = trpc.orders.listAll.useQuery({ status: statusFilter });
  const { data: stats } = trpc.orders.stats.useQuery();
  const updateStatusMutation = trpc.orders.updateStatus.useMutation({
    onSuccess: () => refetch(),
  });

  const handleStatusChange = (orderId: number, currentStatus: string) => {
    const nextStatuses: Record<string, string> = {
      new: "processing",
      processing: "delivering",
      delivering: "delivered",
    };
    const next = nextStatuses[currentStatus];
    if (!next) return;

    Alert.alert(
      "\u062a\u063a\u064a\u064a\u0631 \u062d\u0627\u0644\u0629 \u0627\u0644\u0637\u0644\u0628",
      `\u0647\u0644 \u062a\u0631\u064a\u062f \u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u062d\u0627\u0644\u0629 \u0625\u0644\u0649 "${ORDER_STATUS_LABELS[next]}"?`,
      [
        { text: "\u0625\u0644\u063a\u0627\u0621", style: "cancel" },
        {
          text: "\u062a\u0623\u0643\u064a\u062f",
          onPress: () => updateStatusMutation.mutate({ id: orderId, status: next as any }),
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, paddingHorizontal: 16 }}>
      {/* Stats */}
      {stats && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, maxHeight: 70 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[
              { label: "\u0627\u0644\u0643\u0644", count: stats.total, color: colors.foreground },
              { label: "\u062c\u062f\u064a\u062f", count: stats.new, color: ORDER_STATUS_COLORS.new },
              { label: "\u0645\u0639\u0627\u0644\u062c\u0629", count: stats.processing, color: ORDER_STATUS_COLORS.processing },
              { label: "\u062a\u0648\u0635\u064a\u0644", count: stats.delivering, color: ORDER_STATUS_COLORS.delivering },
              { label: "\u0645\u0633\u0644\u0645", count: stats.delivered, color: ORDER_STATUS_COLORS.delivered },
            ].map((s) => (
              <View key={s.label} style={{ backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, alignItems: "center", borderWidth: 1, borderColor: colors.border, minWidth: 70 }}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: s.color }}>{s.count}</Text>
                <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Status Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, maxHeight: 40 }}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {STATUSES.map((s) => (
            <TouchableOpacity
              key={s}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: statusFilter === s ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: statusFilter === s ? colors.primary : colors.border,
              }}
              onPress={() => setStatusFilter(s)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: statusFilter === s ? "#fff" : colors.foreground }}>
                {STATUS_FILTER_LABELS[s]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item: order }) => (
            <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ backgroundColor: ORDER_STATUS_COLORS[order.status] + "20", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: ORDER_STATUS_COLORS[order.status] }}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground }}>#{order.orderNumber}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                <Text style={{ fontSize: 13, color: colors.muted }}>{order.customerPhone}</Text>
                <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground }}>{order.customerName}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                <Text style={{ fontSize: 12, color: colors.muted }}>{new Date(order.createdAt).toLocaleDateString("ar-YE")}</Text>
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primary }}>{formatPrice(order.totalAmount)}</Text>
              </View>
              {order.status !== "delivered" && (
                <TouchableOpacity
                  style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 8, marginTop: 10, alignItems: "center" }}
                  onPress={() => handleStatusChange(order.id, order.status)}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
                    {"\u0646\u0642\u0644 \u0625\u0644\u0649: "}{ORDER_STATUS_LABELS[order.status === "new" ? "processing" : order.status === "processing" ? "delivering" : "delivered"]}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 40 }}>
              <Text style={{ color: colors.muted }}>{"\u0644\u0627 \u062a\u0648\u062c\u062f \u0637\u0644\u0628\u0627\u062a"}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function AdminProducts({ colors }: any) {
  const { data: products, isLoading, refetch } = trpc.products.list.useQuery();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState("");

  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => { refetch(); setEditingId(null); },
  });

  return (
    <View style={{ flex: 1, paddingHorizontal: 16 }}>
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item: product }) => (
            <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <TouchableOpacity
                  onPress={() => { setEditingId(product.id); setEditPrice(product.price); }}
                  activeOpacity={0.7}
                >
                  <IconSymbol name="pencil" size={18} color={colors.primary} />
                </TouchableOpacity>
                <View style={{ alignItems: "flex-end", flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: colors.foreground }}>{product.nameAr}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>{product.size}</Text>
                </View>
              </View>
              {editingId === product.id ? (
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10, alignItems: "center" }}>
                  <TouchableOpacity
                    style={{ backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 }}
                    onPress={() => updateMutation.mutate({ id: product.id, price: editPrice })}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>{"\u062d\u0641\u0638"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ paddingHorizontal: 10, paddingVertical: 8 }}
                    onPress={() => setEditingId(null)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: colors.muted, fontSize: 12 }}>{"\u0625\u0644\u063a\u0627\u0621"}</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={{
                      flex: 1,
                      backgroundColor: colors.background,
                      borderRadius: 8,
                      padding: 8,
                      fontSize: 14,
                      textAlign: "right",
                      borderWidth: 1,
                      borderColor: colors.border,
                      color: colors.foreground,
                    }}
                    value={editPrice}
                    onChangeText={setEditPrice}
                    keyboardType="numeric"
                    placeholder={"\u0627\u0644\u0633\u0639\u0631"}
                    placeholderTextColor={colors.muted}
                  />
                </View>
              ) : (
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.primary, textAlign: "left", marginTop: 8 }}>
                  {formatPrice(product.price)}
                </Text>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 40 }}>
              <Text style={{ color: colors.muted }}>{"\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0646\u062a\u062c\u0627\u062a"}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
