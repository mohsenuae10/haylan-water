import { Text, View, TouchableOpacity, ActivityIndicator, Alert, ScrollView, TextInput, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/validation";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState } from "react";
import { FONT_FAMILY } from "@/lib/fonts";

const STATUSES = ["all", "new", "processing", "delivering", "delivered"] as const;
const STATUS_FILTER_LABELS: Record<string, string> = {
  all: "الكل",
  new: "جديد",
  processing: "قيد المعالجة",
  delivering: "جاري التوصيل",
  delivered: "تم التسليم",
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
        <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 18, color: colors.foreground }}>لوحة الإدارة</Text>
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
          <Text style={{ fontFamily: FONT_FAMILY.semiBold, color: activeTab === "orders" ? "#fff" : colors.foreground }}>
            الطلبات
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
          <Text style={{ fontFamily: FONT_FAMILY.semiBold, color: activeTab === "products" ? "#fff" : colors.foreground }}>
            المنتجات
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
      "تغيير حالة الطلب",
      `هل تريد تغيير الحالة إلى "${ORDER_STATUS_LABELS[next]}"?`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "تأكيد",
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
              { label: "الكل", count: stats.total, color: colors.foreground },
              { label: "جديد", count: stats.new, color: ORDER_STATUS_COLORS.new },
              { label: "معالجة", count: stats.processing, color: ORDER_STATUS_COLORS.processing },
              { label: "توصيل", count: stats.delivering, color: ORDER_STATUS_COLORS.delivering },
              { label: "مسلم", count: stats.delivered, color: ORDER_STATUS_COLORS.delivered },
            ].map((s) => (
              <View key={s.label} style={{ backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, alignItems: "center", borderWidth: 1, borderColor: colors.border, minWidth: 70 }}>
                <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 18, color: s.color }}>{s.count}</Text>
                <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 11, color: colors.muted, marginTop: 2 }}>{s.label}</Text>
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
              <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 12, color: statusFilter === s ? "#fff" : colors.foreground }}>
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
                  <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 11, color: ORDER_STATUS_COLORS[order.status] }}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </Text>
                </View>
                <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 14, color: colors.foreground }}>#{order.orderNumber}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 13, color: colors.muted }}>{order.customerPhone}</Text>
                <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 13, color: colors.foreground }}>{order.customerName}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 12, color: colors.muted }}>{new Date(order.createdAt).toLocaleDateString("ar-YE")}</Text>
                <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 14, color: colors.primary }}>{formatPrice(order.totalAmount)}</Text>
              </View>
              {order.status !== "delivered" && (
                <TouchableOpacity
                  style={{ backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 8, marginTop: 10, alignItems: "center" }}
                  onPress={() => handleStatusChange(order.id, order.status)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontFamily: FONT_FAMILY.semiBold, color: "#fff", fontSize: 13 }}>
                    {"نقل إلى: "}{ORDER_STATUS_LABELS[order.status === "new" ? "processing" : order.status === "processing" ? "delivering" : "delivered"]}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 40 }}>
              <Text style={{ fontFamily: FONT_FAMILY.regular, color: colors.muted }}>لا توجد طلبات</Text>
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
                  <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 15, color: colors.foreground }}>{product.nameAr}</Text>
                  <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 12, color: colors.muted }}>{product.size}</Text>
                </View>
              </View>
              {editingId === product.id ? (
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10, alignItems: "center" }}>
                  <TouchableOpacity
                    style={{ backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 }}
                    onPress={() => updateMutation.mutate({ id: product.id, price: editPrice })}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontFamily: FONT_FAMILY.semiBold, color: "#fff", fontSize: 12 }}>حفظ</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ paddingHorizontal: 10, paddingVertical: 8 }}
                    onPress={() => setEditingId(null)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontFamily: FONT_FAMILY.regular, color: colors.muted, fontSize: 12 }}>إلغاء</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={{
                      flex: 1,
                      backgroundColor: colors.background,
                      borderRadius: 8,
                      padding: 8,
                      fontFamily: FONT_FAMILY.regular,
                      fontSize: 14,
                      textAlign: "right",
                      borderWidth: 1,
                      borderColor: colors.border,
                      color: colors.foreground,
                    }}
                    value={editPrice}
                    onChangeText={setEditPrice}
                    keyboardType="numeric"
                    placeholder="السعر"
                    placeholderTextColor={colors.muted}
                  />
                </View>
              ) : (
                <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 15, color: colors.primary, textAlign: "left", marginTop: 8 }}>
                  {formatPrice(product.price)}
                </Text>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 40 }}>
              <Text style={{ fontFamily: FONT_FAMILY.regular, color: colors.muted }}>لا توجد منتجات</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
