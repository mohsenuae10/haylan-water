import { Text, View, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAppStore } from "@/lib/store";
import { trpc } from "@/lib/trpc";
import { validateYemeniPhone } from "@/lib/validation";
import { useState } from "react";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollView } from "react-native";

const LOGO_IMAGE = require("@/assets/images/haylan-logo.jpeg");

export default function LoginScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAppStore();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const customerQuery = trpc.customers.getByPhone.useQuery(
    { phone },
    { enabled: false }
  );

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "\u0627\u0644\u0627\u0633\u0645 \u0645\u0637\u0644\u0648\u0628";
    const phoneValidation = validateYemeniPhone(phone);
    if (!phoneValidation.valid) newErrors.phone = phoneValidation.message;
    if (!address.trim()) newErrors.address = "\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0645\u0637\u0644\u0648\u0628";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = () => {
    if (!validate()) return;
    login({
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      isLoggedIn: true,
    });
    router.back();
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 16, paddingVertical: 8 }}>
        <TouchableOpacity
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <IconSymbol name="xmark" size={20} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={{ alignItems: "center", marginTop: 20, marginBottom: 24 }}>
            <Image source={LOGO_IMAGE} style={{ width: 120, height: 70 }} contentFit="contain" />
            <Text style={{ fontSize: 22, fontWeight: "800", color: colors.foreground, marginTop: 16 }}>
              {"\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644"}
            </Text>
            <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4, textAlign: "center" }}>
              {"\u0633\u062c\u0644 \u0628\u064a\u0627\u0646\u0627\u062a\u0643 \u0644\u062d\u0641\u0638\u0647\u0627 \u0644\u0644\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0642\u0627\u062f\u0645\u0629"}
            </Text>
          </View>

          {/* Form */}
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground, textAlign: "right", marginBottom: 6 }}>
              {"\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644"}
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 14,
                fontSize: 15,
                textAlign: "right",
                borderWidth: 1,
                borderColor: errors.name ? colors.error : colors.border,
                color: colors.foreground,
              }}
              value={name}
              onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: "" })); }}
              placeholder={"\u0623\u062f\u062e\u0644 \u0627\u0633\u0645\u0643"}
              placeholderTextColor={colors.muted}
              returnKeyType="next"
            />
            {errors.name ? <Text style={{ color: colors.error, fontSize: 12, textAlign: "right", marginTop: 4 }}>{errors.name}</Text> : null}
          </View>

          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground, textAlign: "right", marginBottom: 6 }}>
              {"\u0631\u0642\u0645 \u0627\u0644\u062c\u0648\u0627\u0644"}
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 14,
                fontSize: 15,
                textAlign: "right",
                borderWidth: 1,
                borderColor: errors.phone ? colors.error : colors.border,
                color: colors.foreground,
              }}
              value={phone}
              onChangeText={(t) => { setPhone(t); setErrors((e) => ({ ...e, phone: "" })); }}
              placeholder="7XXXXXXXX"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              maxLength={9}
              returnKeyType="next"
            />
            {errors.phone ? <Text style={{ color: colors.error, fontSize: 12, textAlign: "right", marginTop: 4 }}>{errors.phone}</Text> : null}
          </View>

          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground, textAlign: "right", marginBottom: 6 }}>
              {"\u0627\u0644\u0639\u0646\u0648\u0627\u0646"}
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 14,
                fontSize: 15,
                textAlign: "right",
                borderWidth: 1,
                borderColor: errors.address ? colors.error : colors.border,
                color: colors.foreground,
                minHeight: 80,
                textAlignVertical: "top",
              }}
              value={address}
              onChangeText={(t) => { setAddress(t); setErrors((e) => ({ ...e, address: "" })); }}
              placeholder={"\u0623\u062f\u062e\u0644 \u0639\u0646\u0648\u0627\u0646\u0643 \u0628\u0627\u0644\u062a\u0641\u0635\u064a\u0644"}
              placeholderTextColor={colors.muted}
              multiline
            />
            {errors.address ? <Text style={{ color: colors.error, fontSize: 12, textAlign: "right", marginTop: 4 }}>{errors.address}</Text> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Login Button */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <TouchableOpacity
          style={{
            backgroundColor: colors.primary,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
          }}
          onPress={handleLogin}
          activeOpacity={0.8}
        >
          <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700" }}>
            {"\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
