import { Text, View, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAppStore } from "@/lib/store";
import { trpc } from "@/lib/trpc";
import { formatPrice, validateYemeniPhone } from "@/lib/validation";
import { useState } from "react";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollView } from "react-native";

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

  const createOrderMutation = trpc.orders.create.useMutation();

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "\u0627\u0644\u0627\u0633\u0645 \u0645\u0637\u0644\u0648\u0628";
    const phoneValidation = validateYemeniPhone(phone);
    if (!phoneValidation.valid) newErrors.phone = phoneValidation.message;
    if (!address.trim()) newErrors.address = "\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0645\u0637\u0644\u0648\u0628";
    if (cart.length === 0) newErrors.cart = "\u0627\u0644\u0633\u0644\u0629 \u0641\u0627\u0631\u063a\u0629";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const result = await createOrderMutation.mutateAsync({
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerAddress: address.trim(),
        notes: notes.trim() || undefined,
        isGuest: !user?.isLoggedIn,
        items: cart.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          productSize: item.productSize,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
          totalPrice: (item.unitPrice * item.quantity).toString(),
        })),
        totalAmount: cartTotal.toString(),
      });
      clearCart();
      router.replace(`/order-success?orderNumber=${result.orderNumber}&orderId=${result.orderId}` as any);
    } catch (error: any) {
      Alert.alert("\u062e\u0637\u0623", error?.message || "\u062d\u062f\u062b \u062e\u0637\u0623 \u0623\u062b\u0646\u0627\u0621 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0637\u0644\u0628");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 }}>
        <View />
        <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>{"\u0625\u062a\u0645\u0627\u0645 \u0627\u0644\u0637\u0644\u0628"}</Text>
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
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, textAlign: "right", marginBottom: 12, marginTop: 8 }}>
            {"\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a"}
          </Text>
          {cart.length === 0 ? (
            <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 20, alignItems: "center", borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.muted }}>{"\u0627\u0644\u0633\u0644\u0629 \u0641\u0627\u0631\u063a\u0629"}</Text>
              <TouchableOpacity
                style={{ marginTop: 12, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}
                onPress={() => router.push("/(tabs)/products" as any)}
                activeOpacity={0.7}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>{"\u062a\u0635\u0641\u062d \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a"}</Text>
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
                    <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>{item.quantity}</Text>
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
                  <Text style={{ fontSize: 13, color: colors.primary, fontWeight: "600", marginTop: 4 }}>
                    {formatPrice(item.unitPrice * item.quantity)}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>{item.productName}</Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>{item.productSize}</Text>
                </View>
                <Image source={{ uri: item.imageUrl }} style={{ width: 50, height: 50, marginLeft: 8 }} contentFit="contain" />
              </View>
            ))
          )}

          {errors.cart && (
            <Text style={{ color: colors.error, fontSize: 12, textAlign: "right", marginTop: 4 }}>{errors.cart}</Text>
          )}

          {/* Customer Info */}
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, textAlign: "right", marginBottom: 12, marginTop: 20 }}>
            {"\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0639\u0645\u064a\u0644"}
          </Text>

          <FormField
            label={"\u0627\u0644\u0627\u0633\u0645"}
            value={name}
            onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: "" })); }}
            placeholder={"\u0623\u062f\u062e\u0644 \u0627\u0633\u0645\u0643 \u0627\u0644\u0643\u0627\u0645\u0644"}
            error={errors.name}
            colors={colors}
          />
          <FormField
            label={"\u0631\u0642\u0645 \u0627\u0644\u062c\u0648\u0627\u0644"}
            value={phone}
            onChangeText={(t) => { setPhone(t); setErrors((e) => ({ ...e, phone: "" })); }}
            placeholder="7XXXXXXXX"
            error={errors.phone}
            colors={colors}
            keyboardType="phone-pad"
            maxLength={9}
          />
          <FormField
            label={"\u0627\u0644\u0639\u0646\u0648\u0627\u0646"}
            value={address}
            onChangeText={(t) => { setAddress(t); setErrors((e) => ({ ...e, address: "" })); }}
            placeholder={"\u0623\u062f\u062e\u0644 \u0639\u0646\u0648\u0627\u0646\u0643 \u0628\u0627\u0644\u062a\u0641\u0635\u064a\u0644"}
            error={errors.address}
            colors={colors}
            multiline
          />
          <FormField
            label={"\u0645\u0644\u0627\u062d\u0638\u0627\u062a (\u0627\u062e\u062a\u064a\u0627\u0631\u064a)"}
            value={notes}
            onChangeText={setNotes}
            placeholder={"\u0623\u064a \u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0625\u0636\u0627\u0641\u064a\u0629..."}
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
              <Text style={{ fontSize: 20, fontWeight: "800", color: colors.primary }}>
                {formatPrice(cartTotal)}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>
                {"\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a"}
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
            <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700" }}>
              {"\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u0637\u0644\u0628"}
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
      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground, textAlign: "right", marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 12,
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
        <Text style={{ color: colors.error, fontSize: 12, textAlign: "right", marginTop: 4 }}>{error}</Text>
      ) : null}
    </View>
  );
}
