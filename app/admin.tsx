import { Text, View, TouchableOpacity, ActivityIndicator, Alert, ScrollView, TextInput, FlatList, Modal } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import {
  getAllOrders, getOrderStats, updateOrderStatus,
  getProducts, updateProduct, createProduct, deleteProduct, uploadProductImage,
  getBanners, createBanner, updateBanner, deleteBanner, uploadBannerImage,
  getCategories, uploadCategoryImage, updateCategory,
} from "@/lib/supabase";
import { formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/validation";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useState, useEffect, useCallback } from "react";
import { FONT_FAMILY } from "@/lib/fonts";
import type { Order, Product, ProductCategory, Banner, Category } from "@/lib/supabase-types";

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
  const [activeTab, setActiveTab] = useState<"orders" | "products" | "banners" | "categories">("orders");
  const [statusFilter, setStatusFilter] = useState("all");

  const TABS = [
    { id: "orders" as const, label: "الطلبات" },
    { id: "products" as const, label: "المنتجات" },
    { id: "banners" as const, label: "البنرات" },
    { id: "categories" as const, label: "الأقسام" },
  ];

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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 44, marginBottom: 12, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 18,
                borderRadius: 10,
                backgroundColor: activeTab === tab.id ? colors.primary : colors.surface,
                alignItems: "center",
                borderWidth: 1,
                borderColor: activeTab === tab.id ? colors.primary : colors.border,
              }}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              <Text style={{ fontFamily: FONT_FAMILY.semiBold, color: activeTab === tab.id ? "#fff" : colors.foreground, fontSize: 13 }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {activeTab === "orders" ? (
        <AdminOrders statusFilter={statusFilter} setStatusFilter={setStatusFilter} colors={colors} router={router} />
      ) : activeTab === "products" ? (
        <AdminProducts colors={colors} />
      ) : activeTab === "banners" ? (
        <AdminBanners colors={colors} />
      ) : (
        <AdminCategories colors={colors} />
      )}
    </ScreenContainer>
  );
}

function AdminOrders({ statusFilter, setStatusFilter, colors, router }: any) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [ordersData, statsData] = await Promise.all([
        getAllOrders(statusFilter),
        getOrderStats(),
      ]);
      setOrders(ordersData);
      setStats(statsData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setIsLoading(true);
    fetchData();
  }, [fetchData]);

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
          onPress: async () => {
            try {
              await updateOrderStatus(orderId, next as any);
              fetchData();
            } catch (err) {
              Alert.alert("خطأ", "حدث خطأ أثناء تحديث الحالة");
            }
          },
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
                <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 14, color: colors.foreground }}>#{order.order_number}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 13, color: colors.muted }}>{order.customer_phone}</Text>
                <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 13, color: colors.foreground }}>{order.customer_name}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 12, color: colors.muted }}>{new Date(order.created_at).toLocaleDateString("ar-YE")}</Text>
                <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 14, color: colors.primary }}>{formatPrice(order.total_amount)}</Text>
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
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    name_ar: "",
    size: "",
    price: "",
    description: "",
    description_ar: "",
    category: "water" as ProductCategory,
  });

  const fetchProducts = useCallback(async () => {
    try {
      const cat = categoryFilter === "all" ? undefined : (categoryFilter as ProductCategory);
      const data = await getProducts(false, cat);
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    setIsLoading(true);
    fetchProducts();
  }, [fetchProducts]);

  const handleSavePrice = async (id: number) => {
    try {
      await updateProduct(id, { price: parseFloat(editPrice) });
      setEditingId(null);
      fetchProducts();
    } catch (err) {
      Alert.alert("خطأ", "حدث خطأ أثناء تحديث السعر");
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name_ar || !newProduct.price || !newProduct.size) {
      Alert.alert("خطأ", "يرجى ملء اسم المنتج والسعر والحجم");
      return;
    }
    try {
      setIsUploading(true);
      let imageUrl: string | undefined;

      // Upload image if selected
      if (selectedImage) {
        try {
          imageUrl = await uploadProductImage(selectedImage);
        } catch (uploadErr: any) {
          Alert.alert("خطأ في رفع الصورة", uploadErr.message || "حدث خطأ أثناء رفع الصورة");
          setIsUploading(false);
          return;
        }
      }

      await createProduct({
        name: newProduct.name || newProduct.name_ar,
        name_ar: newProduct.name_ar,
        size: newProduct.size,
        price: parseFloat(newProduct.price),
        description: newProduct.description || undefined,
        description_ar: newProduct.description_ar || undefined,
        category: newProduct.category,
        image_url: imageUrl,
      });
      Alert.alert("تم", "تمت إضافة المنتج بنجاح");
      setShowAddModal(false);
      setSelectedImage(null);
      setNewProduct({ name: "", name_ar: "", size: "", price: "", description: "", description_ar: "", category: "water" });
      fetchProducts();
    } catch (err) {
      Alert.alert("خطأ", "حدث خطأ أثناء إضافة المنتج");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteProduct = (product: Product) => {
    Alert.alert(
      "حذف المنتج",
      `هل أنت متأكد من حذف "${product.name_ar}"؟\nلا يمكن التراجع عن هذا الإجراء.`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteProduct(product.id);
              fetchProducts();
            } catch (err) {
              Alert.alert("خطأ", "حدث خطأ أثناء حذف المنتج");
            }
          },
        },
      ]
    );
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("صلاحية مطلوبة", "يرجى السماح بالوصول إلى معرض الصور");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleChangeProductImage = async (product: Product) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("صلاحية مطلوبة", "يرجى السماح بالوصول إلى معرض الصور");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        const imageUrl = await uploadProductImage(result.assets[0].uri);
        await updateProduct(product.id, { image_url: imageUrl });
        fetchProducts();
        Alert.alert("تم", "تم تحديث صورة المنتج بنجاح");
      } catch (err: any) {
        Alert.alert("خطأ", err.message || "حدث خطأ أثناء رفع الصورة");
      }
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case "water": return "💧 مياه";
      case "tissues": return "🧻 مناديل";
      default: return "📦 " + cat;
    }
  };

  return (
    <View style={{ flex: 1, paddingHorizontal: 16 }}>
      {/* Add Product Button */}
      <TouchableOpacity
        onPress={() => setShowAddModal(true)}
        style={{ backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 10, alignItems: "center", marginBottom: 10, flexDirection: "row", justifyContent: "center", gap: 6 }}
        activeOpacity={0.7}
      >
        <Text style={{ fontFamily: FONT_FAMILY.bold, color: "#fff", fontSize: 14 }}>إضافة منتج جديد</Text>
        <IconSymbol name="plus" size={18} color="#fff" />
      </TouchableOpacity>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10, maxHeight: 38 }}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {[
            { id: "all", label: "📦 الكل" },
            { id: "water", label: "💧 مياه" },
            { id: "tissues", label: "🧻 مناديل" },
          ].map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setCategoryFilter(cat.id)}
              style={{
                paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
                backgroundColor: categoryFilter === cat.id ? colors.primary : colors.surface,
                borderWidth: 1, borderColor: categoryFilter === cat.id ? colors.primary : colors.border,
              }}
              activeOpacity={0.7}
            >
              <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 12, color: categoryFilter === cat.id ? "#fff" : colors.foreground }}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

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
                {/* Action Buttons (left side) */}
                <View style={{ flexDirection: "column", gap: 8, alignItems: "center" }}>
                  <TouchableOpacity
                    onPress={() => { setEditingId(product.id); setEditPrice(String(product.price)); }}
                    activeOpacity={0.7}
                    style={{ padding: 4 }}
                  >
                    <IconSymbol name="pencil" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteProduct(product)}
                    activeOpacity={0.7}
                    style={{ padding: 4 }}
                  >
                    <IconSymbol name="trash" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                {/* Product Info (center) */}
                <View style={{ alignItems: "flex-end", flex: 1, marginHorizontal: 10 }}>
                  <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 15, color: colors.foreground }}>{product.name_ar}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 12, color: colors.muted }}>{product.size}</Text>
                    <View style={{
                      backgroundColor: product.category === "water" ? "#E3F2FD" : "#F3E5F5",
                      borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1,
                    }}>
                      <Text style={{ fontSize: 10, fontFamily: FONT_FAMILY.semiBold }}>
                        {getCategoryLabel(product.category || "water")}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Product Image (right side) */}
                <TouchableOpacity onPress={() => handleChangeProductImage(product)} activeOpacity={0.7}>
                  <View style={{
                    width: 56, height: 56, borderRadius: 12, overflow: "hidden",
                    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
                    alignItems: "center", justifyContent: "center",
                  }}>
                    {product.image_url ? (
                      <Image source={{ uri: product.image_url }} style={{ width: 56, height: 56 }} contentFit="cover" />
                    ) : (
                      <View style={{ alignItems: "center" }}>
                        <IconSymbol name="camera" size={20} color={colors.muted} />
                        <Text style={{ fontSize: 8, color: colors.muted, fontFamily: FONT_FAMILY.regular, marginTop: 2 }}>إضافة صورة</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
              {editingId === product.id ? (
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10, alignItems: "center" }}>
                  <TouchableOpacity
                    style={{ backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 }}
                    onPress={() => handleSavePrice(product.id)}
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

      {/* Add Product Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "85%" }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 20, color: colors.foreground, textAlign: "center", marginBottom: 16 }}>
                إضافة منتج جديد
              </Text>

              {/* Category Selection */}
              <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 13, color: colors.foreground, textAlign: "right", marginBottom: 6 }}>
                القسم
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                {([{ id: "water" as ProductCategory, label: "💧 مياه" }, { id: "tissues" as ProductCategory, label: "🧻 مناديل" }]).map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setNewProduct({ ...newProduct, category: cat.id })}
                    style={{
                      flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center",
                      backgroundColor: newProduct.category === cat.id ? colors.primary : colors.surface,
                      borderWidth: 1, borderColor: newProduct.category === cat.id ? colors.primary : colors.border,
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 14, color: newProduct.category === cat.id ? "#fff" : colors.foreground }}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Input Fields */}
              {[
                { key: "name_ar", label: "اسم المنتج (عربي)", placeholder: "مثال: مياه هيلان 500مل" },
                { key: "name", label: "اسم المنتج (إنجليزي)", placeholder: "e.g. Haylan Water 500ml" },
                { key: "size", label: "الحجم", placeholder: "مثال: 500مل / 200 ورقة" },
                { key: "price", label: "السعر (ر.ي)", placeholder: "0", keyboard: "numeric" },
                { key: "description_ar", label: "الوصف (عربي)", placeholder: "وصف المنتج" },
              ].map((field) => (
                <View key={field.key} style={{ marginBottom: 12 }}>
                  <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 13, color: colors.foreground, textAlign: "right", marginBottom: 4 }}>
                    {field.label}
                  </Text>
                  <TextInput
                    value={(newProduct as any)[field.key]}
                    onChangeText={(text) => setNewProduct({ ...newProduct, [field.key]: text })}
                    placeholder={field.placeholder}
                    placeholderTextColor={colors.muted}
                    keyboardType={(field as any).keyboard === "numeric" ? "numeric" : "default"}
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
                      fontFamily: FONT_FAMILY.regular, fontSize: 14, textAlign: "right",
                      borderWidth: 1, borderColor: colors.border, color: colors.foreground,
                    }}
                  />
                </View>
              ))}

              {/* Image Picker */}
              <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 13, color: colors.foreground, textAlign: "right", marginBottom: 6 }}>
                صورة المنتج
              </Text>
              <TouchableOpacity
                onPress={pickImage}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderStyle: "dashed",
                  alignItems: "center",
                  justifyContent: "center",
                  height: selectedImage ? 200 : 100,
                  overflow: "hidden",
                  marginBottom: 14,
                }}
                activeOpacity={0.7}
              >
                {selectedImage ? (
                  <View style={{ width: "100%", height: "100%", position: "relative" }}>
                    <Image source={{ uri: selectedImage }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                    <View style={{
                      position: "absolute", bottom: 8, left: 8,
                      backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 8,
                      paddingHorizontal: 10, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4,
                    }}>
                      <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 11, color: "#fff" }}>تغيير الصورة</Text>
                      <IconSymbol name="camera" size={14} color="#fff" />
                    </View>
                  </View>
                ) : (
                  <View style={{ alignItems: "center", gap: 6 }}>
                    <IconSymbol name="photo" size={28} color={colors.muted} />
                    <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 13, color: colors.muted }}>
                      اضغط لاختيار صورة من الجهاز
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Action Buttons */}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 30 }}>
                <TouchableOpacity
                  onPress={handleAddProduct}
                  disabled={isUploading}
                  style={{
                    flex: 1, backgroundColor: isUploading ? colors.muted : colors.primary,
                    borderRadius: 10, paddingVertical: 12, alignItems: "center",
                    flexDirection: "row", justifyContent: "center", gap: 6,
                  }}
                  activeOpacity={0.7}
                >
                  {isUploading ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 16, color: "#fff" }}>جاري الإضافة...</Text>
                    </>
                  ) : (
                    <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 16, color: "#fff" }}>إضافة</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setShowAddModal(false); setSelectedImage(null); }}
                  disabled={isUploading}
                  style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: colors.border }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 16, color: colors.muted }}>إلغاء</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============ Admin Banners ============

function AdminBanners({ colors }: any) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newBanner, setNewBanner] = useState({
    title_ar: "",
    description_ar: "",
    link_type: "none" as "none" | "category" | "product" | "url",
    link_value: "",
    sort_order: "0",
  });

  const fetchBanners = useCallback(async () => {
    try {
      const data = await getBanners(false);
      setBanners(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("صلاحية مطلوبة", "يرجى السماح بالوصول إلى معرض الصور");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleAddBanner = async () => {
    if (!selectedImage) {
      Alert.alert("خطأ", "يرجى اختيار صورة للبنر");
      return;
    }
    try {
      setIsUploading(true);
      const imageUrl = await uploadBannerImage(selectedImage);
      await createBanner({
        title_ar: newBanner.title_ar || undefined,
        description_ar: newBanner.description_ar || undefined,
        image_url: imageUrl,
        link_type: newBanner.link_type,
        link_value: newBanner.link_value || undefined,
        sort_order: parseInt(newBanner.sort_order) || 0,
      });
      Alert.alert("تم", "تمت إضافة البنر بنجاح");
      setShowAddModal(false);
      setSelectedImage(null);
      setNewBanner({ title_ar: "", description_ar: "", link_type: "none", link_value: "", sort_order: "0" });
      fetchBanners();
    } catch (err: any) {
      Alert.alert("خطأ", err.message || "حدث خطأ أثناء إضافة البنر");
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    try {
      await updateBanner(banner.id, { is_active: !banner.is_active });
      fetchBanners();
    } catch (err) {
      Alert.alert("خطأ", "حدث خطأ أثناء تحديث البنر");
    }
  };

  const handleDeleteBanner = (banner: Banner) => {
    Alert.alert(
      "حذف البنر",
      `هل أنت متأكد من حذف هذا البنر؟\n${banner.title_ar || "بدون عنوان"}`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteBanner(banner.id);
              fetchBanners();
            } catch (err) {
              Alert.alert("خطأ", "حدث خطأ أثناء حذف البنر");
            }
          },
        },
      ]
    );
  };

  const handleChangeBannerImage = async (banner: Banner) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("صلاحية مطلوبة", "يرجى السماح بالوصول إلى معرض الصور");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      try {
        const imageUrl = await uploadBannerImage(result.assets[0].uri);
        await updateBanner(banner.id, { image_url: imageUrl });
        fetchBanners();
        Alert.alert("تم", "تم تحديث صورة البنر بنجاح");
      } catch (err: any) {
        Alert.alert("خطأ", err.message || "حدث خطأ أثناء رفع الصورة");
      }
    }
  };

  const LINK_TYPES = [
    { id: "none" as const, label: "بدون رابط" },
    { id: "category" as const, label: "قسم" },
    { id: "product" as const, label: "منتج" },
    { id: "url" as const, label: "رابط خارجي" },
  ];

  return (
    <View style={{ flex: 1, paddingHorizontal: 16 }}>
      {/* Add Banner Button */}
      <TouchableOpacity
        onPress={() => setShowAddModal(true)}
        style={{ backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 10, alignItems: "center", marginBottom: 10, flexDirection: "row", justifyContent: "center", gap: 6 }}
        activeOpacity={0.7}
      >
        <Text style={{ fontFamily: FONT_FAMILY.bold, color: "#fff", fontSize: 14 }}>إضافة بنر جديد</Text>
        <IconSymbol name="plus" size={18} color="#fff" />
      </TouchableOpacity>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={banners}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item: banner }) => (
            <View style={{ backgroundColor: colors.surface, borderRadius: 14, overflow: "hidden", marginBottom: 12, borderWidth: 1, borderColor: colors.border }}>
              {/* Banner Image */}
              <TouchableOpacity onPress={() => handleChangeBannerImage(banner)} activeOpacity={0.8}>
                <Image source={{ uri: banner.image_url }} style={{ width: "100%", height: 140 }} contentFit="cover" />
                <View style={{ position: "absolute", bottom: 6, left: 6, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 10, color: "#fff" }}>تغيير الصورة</Text>
                  <IconSymbol name="camera" size={12} color="#fff" />
                </View>
              </TouchableOpacity>

              {/* Banner Info */}
              <View style={{ padding: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {/* Toggle Active */}
                    <TouchableOpacity
                      onPress={() => handleToggleActive(banner)}
                      style={{
                        backgroundColor: banner.is_active ? "#E8F5E9" : "#FFEBEE",
                        borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 11, color: banner.is_active ? "#2E7D32" : "#C62828" }}>
                        {banner.is_active ? "مفعّل" : "معطّل"}
                      </Text>
                    </TouchableOpacity>
                    {/* Delete */}
                    <TouchableOpacity onPress={() => handleDeleteBanner(banner)} activeOpacity={0.7} style={{ padding: 4 }}>
                      <IconSymbol name="trash" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                  <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 14, color: colors.foreground, flex: 1, textAlign: "right", marginLeft: 8 }} numberOfLines={1}>
                    {banner.title_ar || "بدون عنوان"}
                  </Text>
                </View>
                {banner.description_ar ? (
                  <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 12, color: colors.muted, textAlign: "right", marginTop: 4 }} numberOfLines={2}>
                    {banner.description_ar}
                  </Text>
                ) : null}
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                  <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 11, color: colors.muted }}>
                    الترتيب: {banner.sort_order}
                  </Text>
                  <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 11, color: colors.muted }}>
                    {banner.link_type === "none" ? "بدون رابط" : `رابط: ${banner.link_type}`}
                  </Text>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 40 }}>
              <Text style={{ fontFamily: FONT_FAMILY.regular, color: colors.muted, fontSize: 14 }}>لا توجد بنرات</Text>
              <Text style={{ fontFamily: FONT_FAMILY.regular, color: colors.muted, fontSize: 12, marginTop: 4 }}>أضف بنراً جديداً ليظهر في الشاشة الرئيسية</Text>
            </View>
          }
        />
      )}

      {/* Add Banner Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "85%" }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 20, color: colors.foreground, textAlign: "center", marginBottom: 16 }}>
                إضافة بنر جديد
              </Text>

              {/* Image Picker */}
              <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 13, color: colors.foreground, textAlign: "right", marginBottom: 6 }}>
                صورة البنر *
              </Text>
              <TouchableOpacity
                onPress={pickImage}
                style={{
                  backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
                  borderStyle: "dashed", alignItems: "center", justifyContent: "center",
                  height: selectedImage ? 180 : 100, overflow: "hidden", marginBottom: 14,
                }}
                activeOpacity={0.7}
              >
                {selectedImage ? (
                  <View style={{ width: "100%", height: "100%", position: "relative" }}>
                    <Image source={{ uri: selectedImage }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                    <View style={{ position: "absolute", bottom: 8, left: 8, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 11, color: "#fff" }}>تغيير الصورة</Text>
                      <IconSymbol name="camera" size={14} color="#fff" />
                    </View>
                  </View>
                ) : (
                  <View style={{ alignItems: "center", gap: 6 }}>
                    <IconSymbol name="photo" size={28} color={colors.muted} />
                    <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 13, color: colors.muted }}>اضغط لاختيار صورة البنر</Text>
                    <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 11, color: colors.muted }}>يفضل بنسبة 16:9</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Title */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 13, color: colors.foreground, textAlign: "right", marginBottom: 4 }}>
                  عنوان البنر (اختياري)
                </Text>
                <TextInput
                  value={newBanner.title_ar}
                  onChangeText={(text) => setNewBanner({ ...newBanner, title_ar: text })}
                  placeholder="مثال: عرض خاص على المياه"
                  placeholderTextColor={colors.muted}
                  style={{
                    backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
                    fontFamily: FONT_FAMILY.regular, fontSize: 14, textAlign: "right",
                    borderWidth: 1, borderColor: colors.border, color: colors.foreground,
                  }}
                />
              </View>

              {/* Description */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 13, color: colors.foreground, textAlign: "right", marginBottom: 4 }}>
                  الوصف (اختياري)
                </Text>
                <TextInput
                  value={newBanner.description_ar}
                  onChangeText={(text) => setNewBanner({ ...newBanner, description_ar: text })}
                  placeholder="وصف قصير يظهر تحت العنوان"
                  placeholderTextColor={colors.muted}
                  style={{
                    backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
                    fontFamily: FONT_FAMILY.regular, fontSize: 14, textAlign: "right",
                    borderWidth: 1, borderColor: colors.border, color: colors.foreground,
                  }}
                />
              </View>

              {/* Link Type */}
              <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 13, color: colors.foreground, textAlign: "right", marginBottom: 6 }}>
                نوع الرابط
              </Text>
              <View style={{ flexDirection: "row", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                {LINK_TYPES.map((lt) => (
                  <TouchableOpacity
                    key={lt.id}
                    onPress={() => setNewBanner({ ...newBanner, link_type: lt.id, link_value: "" })}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                      backgroundColor: newBanner.link_type === lt.id ? colors.primary : colors.surface,
                      borderWidth: 1, borderColor: newBanner.link_type === lt.id ? colors.primary : colors.border,
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 12, color: newBanner.link_type === lt.id ? "#fff" : colors.foreground }}>
                      {lt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Link Value */}
              {newBanner.link_type !== "none" && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 13, color: colors.foreground, textAlign: "right", marginBottom: 4 }}>
                    {newBanner.link_type === "category" ? "اسم القسم (مثال: water)" :
                     newBanner.link_type === "product" ? "رقم المنتج (مثال: 5)" :
                     "الرابط الكامل"}
                  </Text>
                  <TextInput
                    value={newBanner.link_value}
                    onChangeText={(text) => setNewBanner({ ...newBanner, link_value: text })}
                    placeholder={newBanner.link_type === "category" ? "water" : newBanner.link_type === "product" ? "5" : "https://..."}
                    placeholderTextColor={colors.muted}
                    style={{
                      backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
                      fontFamily: FONT_FAMILY.regular, fontSize: 14, textAlign: "right",
                      borderWidth: 1, borderColor: colors.border, color: colors.foreground,
                    }}
                  />
                </View>
              )}

              {/* Sort Order */}
              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 13, color: colors.foreground, textAlign: "right", marginBottom: 4 }}>
                  الترتيب
                </Text>
                <TextInput
                  value={newBanner.sort_order}
                  onChangeText={(text) => setNewBanner({ ...newBanner, sort_order: text })}
                  placeholder="0"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                  style={{
                    backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
                    fontFamily: FONT_FAMILY.regular, fontSize: 14, textAlign: "right",
                    borderWidth: 1, borderColor: colors.border, color: colors.foreground, width: 100,
                  }}
                />
              </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 30 }}>
                <TouchableOpacity
                  onPress={handleAddBanner}
                  disabled={isUploading}
                  style={{
                    flex: 1, backgroundColor: isUploading ? colors.muted : colors.primary,
                    borderRadius: 10, paddingVertical: 12, alignItems: "center",
                    flexDirection: "row", justifyContent: "center", gap: 6,
                  }}
                  activeOpacity={0.7}
                >
                  {isUploading ? (
                    <>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 16, color: "#fff" }}>جاري الرفع...</Text>
                    </>
                  ) : (
                    <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 16, color: "#fff" }}>إضافة البنر</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setShowAddModal(false); setSelectedImage(null); }}
                  disabled={isUploading}
                  style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: colors.border }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 16, color: colors.muted }}>إلغاء</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============ Admin Categories (Image Management) ============

function AdminCategories({ colors }: any) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handlePickCategoryImage = async (cat: Category) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("صلاحية مطلوبة", "يرجى السماح بالوصول إلى معرض الصور");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      try {
        await uploadCategoryImage(result.assets[0].uri, cat.id);
        fetchCategories();
        Alert.alert("تم", `تم تحديث صورة قسم "${cat.name_ar}" بنجاح`);
      } catch (err: any) {
        Alert.alert("خطأ", err.message || "حدث خطأ أثناء رفع الصورة");
      }
    }
  };

  const handleRemoveCategoryImage = async (cat: Category) => {
    Alert.alert(
      "إزالة صورة القسم",
      `هل تريد إزالة صورة قسم "${cat.name_ar}"؟ سيتم استخدام الأيقونة الافتراضية.`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "إزالة",
          style: "destructive",
          onPress: async () => {
            try {
              await updateCategory(cat.id, { image_url: null });
              fetchCategories();
            } catch (err) {
              Alert.alert("خطأ", "حدث خطأ أثناء إزالة الصورة");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, paddingHorizontal: 16 }}>
      <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 14, color: colors.muted, textAlign: "center", marginBottom: 12 }}>
        اضغط على صورة القسم لتغييرها
      </Text>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item: cat }) => (
            <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end" }}>
                {/* Category Info */}
                <View style={{ flex: 1, alignItems: "flex-end", marginLeft: 12 }}>
                  <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 16, color: colors.foreground }}>
                    {cat.icon} {cat.name_ar}
                  </Text>
                  <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 12, color: colors.muted, textAlign: "right", marginTop: 2 }}>
                    {cat.name_en}
                  </Text>
                  {cat.description_ar && (
                    <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 11, color: colors.muted, textAlign: "right", marginTop: 4 }} numberOfLines={2}>
                      {cat.description_ar}
                    </Text>
                  )}
                </View>

                {/* Category Image */}
                <TouchableOpacity onPress={() => handlePickCategoryImage(cat)} activeOpacity={0.7}>
                  <View style={{
                    width: 80, height: 80, borderRadius: 16, overflow: "hidden",
                    backgroundColor: colors.background, borderWidth: 2, borderColor: colors.border,
                    alignItems: "center", justifyContent: "center",
                  }}>
                    {cat.image_url ? (
                      <Image source={{ uri: cat.image_url }} style={{ width: 80, height: 80 }} contentFit="cover" />
                    ) : (
                      <View style={{ alignItems: "center" }}>
                        <Text style={{ fontSize: 32 }}>{cat.icon}</Text>
                        <Text style={{ fontSize: 9, color: colors.muted, fontFamily: FONT_FAMILY.regular, marginTop: 2 }}>إضافة صورة</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              {/* Action buttons */}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                <TouchableOpacity
                  onPress={() => handlePickCategoryImage(cat)}
                  style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 8, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 4 }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 12, color: "#fff" }}>
                    {cat.image_url ? "تغيير الصورة" : "رفع صورة"}
                  </Text>
                  <IconSymbol name="camera" size={14} color="#fff" />
                </TouchableOpacity>
                {cat.image_url && (
                  <TouchableOpacity
                    onPress={() => handleRemoveCategoryImage(cat)}
                    style={{ backgroundColor: "#FFEBEE", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, alignItems: "center", flexDirection: "row", gap: 4 }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 12, color: "#C62828" }}>إزالة</Text>
                    <IconSymbol name="trash" size={14} color="#C62828" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 40 }}>
              <Text style={{ fontFamily: FONT_FAMILY.regular, color: colors.muted }}>لا توجد أقسام</Text>
            </View>
          }
        />
      )}
    </View>
  );
}