import { useState } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { ScreenContainer } from "@/components/screen-container";
import { useAppStore } from "@/lib/store";
import { validateYemeniPhone } from "@/lib/validation";
import { signUp, getProfile } from "@/lib/supabase";
import { FONT_FAMILY } from "@/lib/fonts";
import { useColors } from "@/hooks/use-colors";

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAppStore();
  const colors = useColors();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "الاسم مطلوب";
    const phoneValidation = validateYemeniPhone(phone);
    if (!phoneValidation.valid) newErrors.phone = phoneValidation.message;
    if (!password.trim()) newErrors.password = "كلمة المرور مطلوبة";
    else if (password.trim().length < 6) newErrors.password = "كلمة المرور يجب أن تكون 6 أحرف على الأقل";
    if (!address.trim()) newErrors.address = "العنوان مطلوب";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setIsLoading(true);
    try {
      const result = await signUp({
        phone: phone.trim(),
        password: password.trim(),
        name: name.trim(),
        address: address.trim(),
      });
      if (result.user) {
        // Small delay to allow trigger to create profile
        await new Promise(r => setTimeout(r, 500));
        const profile = await getProfile(result.user.id);
        login({
          id: result.user.id,
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          role: (profile?.role || "customer") as "customer" | "admin",
          isLoggedIn: true,
        });
      }
      router.replace("/(tabs)" as any);
    } catch (err: any) {
      const msg = err?.message || "حدث خطأ أثناء إنشاء الحساب";
      if (msg.includes("مسجل مسبقاً") || msg.includes("already registered")) {
        setErrors({ phone: "رقم الجوال مسجل مسبقاً" });
      } else {
        setErrors({ general: msg });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}>
            {/* Header with back button */}
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ alignSelf: "flex-end", padding: 4, marginBottom: 12 }}
            >
              <Text style={{ fontFamily: FONT_FAMILY.medium, fontSize: 16, color: colors.primary }}>
                {"رجوع →"}
              </Text>
            </TouchableOpacity>

            {/* Logo */}
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <Image
                source={require("@/assets/images/haylan-logo.png")}
                style={{ width: 140, height: 90 }}
                contentFit="contain"
              />
              <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 22, color: colors.foreground, marginTop: 10, textAlign: "center" }}>
                إنشاء حساب جديد
              </Text>
              <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 13, color: colors.muted, marginTop: 4, textAlign: "center" }}>
                سجل بياناتك للاستمتاع بخدمات مياه هيلان
              </Text>
            </View>

            {(errors as any).general ? (
              <View style={{ backgroundColor: colors.error + "15", borderRadius: 12, padding: 12, marginBottom: 12 }}>
                <Text style={{ fontFamily: FONT_FAMILY.medium, fontSize: 13, color: colors.error, textAlign: "center" }}>
                  {(errors as any).general}
                </Text>
              </View>
            ) : null}

            {/* Name Input */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontFamily: FONT_FAMILY.medium, fontSize: 14, color: colors.foreground, marginBottom: 6, textAlign: "right" }}>
                الاسم الكامل
              </Text>
              <View style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: errors.name ? colors.error : colors.border,
                paddingHorizontal: 16,
                height: 50,
                justifyContent: "center",
              }}>
                <TextInput
                  value={name}
                  onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: "" })); }}
                  placeholder="أدخل اسمك الكامل"
                  placeholderTextColor={colors.muted}
                  returnKeyType="next"
                  style={{
                    fontFamily: FONT_FAMILY.regular,
                    fontSize: 15,
                    color: colors.foreground,
                    textAlign: "right",
                  }}
                />
              </View>
              {errors.name ? (
                <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 12, color: colors.error, marginTop: 4, textAlign: "right" }}>
                  {errors.name}
                </Text>
              ) : null}
            </View>

            {/* Phone Input */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontFamily: FONT_FAMILY.medium, fontSize: 14, color: colors.foreground, marginBottom: 6, textAlign: "right" }}>
                رقم الجوال
              </Text>
              <View style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: errors.phone ? colors.error : colors.border,
                paddingHorizontal: 16,
                height: 50,
              }}>
                <Text style={{ fontFamily: FONT_FAMILY.medium, fontSize: 14, color: colors.muted, marginRight: 8 }}>
                  +967
                </Text>
                <TextInput
                  value={phone}
                  onChangeText={(t) => { setPhone(t); setErrors((e) => ({ ...e, phone: "" })); }}
                  placeholder="7XXXXXXXX"
                  placeholderTextColor={colors.muted}
                  keyboardType="phone-pad"
                  maxLength={9}
                  style={{
                    flex: 1,
                    fontFamily: FONT_FAMILY.regular,
                    fontSize: 15,
                    color: colors.foreground,
                    textAlign: "right",
                  }}
                />
              </View>
              {errors.phone ? (
                <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 12, color: colors.error, marginTop: 4, textAlign: "right" }}>
                  {errors.phone}
                </Text>
              ) : null}
            </View>

            {/* Password Input */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontFamily: FONT_FAMILY.medium, fontSize: 14, color: colors.foreground, marginBottom: 6, textAlign: "right" }}>
                كلمة المرور
              </Text>
              <View style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: errors.password ? colors.error : colors.border,
                paddingHorizontal: 16,
                height: 50,
                justifyContent: "center",
              }}>
                <TextInput
                  value={password}
                  onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: "" })); }}
                  placeholder="أدخل كلمة المرور (4 أحرف على الأقل)"
                  placeholderTextColor={colors.muted}
                  secureTextEntry
                  style={{
                    fontFamily: FONT_FAMILY.regular,
                    fontSize: 15,
                    color: colors.foreground,
                    textAlign: "right",
                  }}
                />
              </View>
              {errors.password ? (
                <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 12, color: colors.error, marginTop: 4, textAlign: "right" }}>
                  {errors.password}
                </Text>
              ) : null}
            </View>

            {/* Address Input */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontFamily: FONT_FAMILY.medium, fontSize: 14, color: colors.foreground, marginBottom: 6, textAlign: "right" }}>
                العنوان
              </Text>
              <View style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: errors.address ? colors.error : colors.border,
                paddingHorizontal: 16,
                paddingVertical: 12,
                minHeight: 70,
              }}>
                <TextInput
                  value={address}
                  onChangeText={(t) => { setAddress(t); setErrors((e) => ({ ...e, address: "" })); }}
                  placeholder="أدخل عنوانك بالتفصيل"
                  placeholderTextColor={colors.muted}
                  multiline
                  style={{
                    fontFamily: FONT_FAMILY.regular,
                    fontSize: 15,
                    color: colors.foreground,
                    textAlign: "right",
                    textAlignVertical: "top",
                  }}
                />
              </View>
              {errors.address ? (
                <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 12, color: colors.error, marginTop: 4, textAlign: "right" }}>
                  {errors.address}
                </Text>
              ) : null}
            </View>

            {/* Register Button */}
            <TouchableOpacity
              onPress={handleRegister}
              disabled={isLoading}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 14,
                height: 52,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 16, color: "#fff" }}>
                  إنشاء حساب
                </Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <TouchableOpacity onPress={() => router.push("/login" as any)}>
                <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 14, color: colors.primary }}>
                  تسجيل الدخول
                </Text>
              </TouchableOpacity>
              <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 14, color: colors.muted }}>
                لديك حساب بالفعل؟
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
