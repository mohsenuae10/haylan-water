import { Text, View, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAppStore } from "@/lib/store";
import { createOrder } from "@/lib/supabase";
import { formatPrice, validateYemeniPhone } from "@/lib/validation";
import { useState } from "react";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FONT_FAMILY } from "@/lib/fonts";

const PRODUCT_IMAGE = require("@/assets/images/product-carton.png");

export default function OrderScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { state, updateQuantity, removeFromCart, clearCart, cartTotal } = useAppStore();
  const cart = state.cart;
  const user = state.user;

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState(user?.address || "");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "الاسم مطلوب";
    const phoneValidation = validateYemeniPhone(phone);
    if (!phoneValidation.valid) newErrors.phone = phoneValidation.message;
    if (!address.trim()) newErrors.address = "العنوان مطلوب";
    if (cart.length === 0) newErrors.cart = "السلة فارغة";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const result = await createOrder(
        {
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerAddress: address.trim(),
          notes: notes.trim() || undefined,
          isGuest: !user?.isLoggedIn,
          totalAmount: cartTotal.toString(),
        },
        cart.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          productSize: item.productSize,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
          totalPrice: (item.unitPrice * item.quantity).toString(),
        }))
      );
      clearCart();
      router.replace(`/order-success?orderNumber=${result.orderNumber}&orderId=${result.orderId}` as any);
    } catch (error: any) {
      Alert.alert("خطأ", error?.message || "حدث خطأ أثناء إرسال الطلب");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 }}>
        <View />
        <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 18, color: colors.foreground }}>إتمام الطلب</Text>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <IconSymbol name="xmark" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Cart Items */}
          <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 16, color: colors.foreground, textAlign: "right", marginBottom: 12, marginTop: 8 }}>
            المنتجات
          </Text>
          {cart.length === 0 ? (
            <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 20, alignItems: "center", borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontFamily: FONT_FAMILY.regular, color: colors.muted }}>السلة فارغة</Text>
              <TouchableOpacity
                style={{ marginTop: 12, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}
                onPress={() => router.push("/(tabs)/products" as any)}
                activeOpacity={0.7}
              >
                <Text style={{ fontFamily: FONT_FAMILY.semiBold, color: "#fff" }}>تصفح المنتجات</Text>
              </TouchableOpacity>
            </View>
          ) : (
            cart.map((item) => (
              <View
                key={item.productId}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 14,
                  padding: 12,
                  marginBottom: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <TouchableOpacity onPress={() => removeFromCart(item.productId)} activeOpacity={0.7}>
                  <IconSymbol name="trash" size={18} color={colors.error} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <TouchableOpacity
                      style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}
                      onPress={() => updateQuantity(item.productId, item.quantity + 1)}
                      activeOpacity={0.7}
                    >
                      <IconSymbol name="plus" size={16} color="#fff" />
                    </TouchableOpacity>
                    <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 16, color: colors.foreground }}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={{
                        width: 30, height: 30, borderRadius: 8,
                        backgroundColor: item.quantity > 1 ? colors.surface : colors.border,
                        alignItems: "center", justifyContent: "center",
                        borderWidth: 1, borderColor: colors.border,
                      }}
                      onPress={() => updateQuantity(item.productId, item.quantity - 1)}
                      activeOpacity={0.7}
                    >
                      <IconSymbol name="minus" size={16} color={colors.foreground} />
                    </TouchableOpacity>
                  </View>
                  <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 13, color: colors.primary, marginTop: 4 }}>
                    {formatPrice(item.unitPrice * item.quantity)}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 14, color: colors.foreground }}>{item.productName}</Text>
                  <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 12, color: colors.muted }}>{item.productSize}</Text>
                </View>
                <Image source={PRODUCT_IMAGE} style={{ width: 50, height: 50, marginLeft: 8 }} contentFit="contain" />
              </View>
            ))
          )}

          {errors.cart && (
            <Text style={{ fontFamily: FONT_FAMILY.regular, color: colors.error, fontSize: 12, textAlign: "right", marginTop: 4 }}>{errors.cart}</Text>
          )}

          {/* Customer Info */}
          <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 16, color: colors.foreground, textAlign: "right", marginBottom: 12, marginTop: 20 }}>
            بيانات العميل
          </Text>

          <FormField
            label="الاسم"
            value={name}
            onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: "" })); }}
            placeholder="أدخل اسمك الكامل"
            error={errors.name}
            colors={colors}
          />
          <FormField
            label="رقم الجوال"
            value={phone}
            onChangeText={(t) => { setPhone(t); setErrors((e) => ({ ...e, phone: "" })); }}
            placeholder="7XXXXXXXX"
            error={errors.phone}
            colors={colors}
            keyboardType="phone-pad"
            maxLength={9}
          />
          <FormField
            label="العنوان"
            value={address}
            onChangeText={(t) => { setAddress(t); setErrors((e) => ({ ...e, address: "" })); }}
            placeholder="أدخل عنوانك بالتفصيل"
            error={errors.address}
            colors={colors}
            multiline
          />
          <FormField
            label="ملاحظات (اختياري)"
            value={notes}
            onChangeText={setNotes}
            placeholder="أي ملاحظات إضافية..."
            colors={colors}
            multiline
          />

          {/* Total */}
          {cart.length > 0 && (
            <View style={{
              backgroundColor: colors.surface,
              borderRadius: 14,
              padding: 16,
              marginTop: 16,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              borderWidth: 1,
              borderColor: colors.border,
            }}>
              <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 20, color: colors.primary }}>
                {formatPrice(cartTotal)}
              </Text>
              <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 16, color: colors.foreground }}>
                الإجمالي
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Submit Button */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <TouchableOpacity
          style={{
            backgroundColor: cart.length > 0 ? colors.primary : colors.muted,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
            opacity: isSubmitting ? 0.7 : 1,
          }}
          onPress={handleSubmit}
          activeOpacity={0.8}
          disabled={cart.length === 0 || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ fontFamily: FONT_FAMILY.bold, color: "#fff", fontSize: 17 }}>
              تأكيد الطلب
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

function FormField({
  label, value, onChangeText, placeholder, error, colors, keyboardType, maxLength, multiline,
}: {
  label: string; value: string; onChangeText: (t: string) => void; placeholder: string;
  error?: string; colors: any; keyboardType?: any; maxLength?: number; multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontFamily: FONT_FAMILY.medium, fontSize: 13, color: colors.foreground, textAlign: "right", marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 12,
          fontFamily: FONT_FAMILY.regular,
          fontSize: 15,
          textAlign: "right",
          borderWidth: 1,
          borderColor: error ? colors.error : colors.border,
          color: colors.foreground,
          minHeight: multiline ? 80 : undefined,
          textAlignVertical: multiline ? "top" : "center",
        }}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        maxLength={maxLength}
        multiline={multiline}
        returnKeyType={multiline ? "default" : "done"}
      />
      {error ? (
        <Text style={{ fontFamily: FONT_FAMILY.regular, color: colors.error, fontSize: 12, textAlign: "right", marginTop: 4 }}>{error}</Text>
      ) : null}
    </View>
  );
}
