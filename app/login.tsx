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
import { signIn, getProfile } from "@/lib/supabase";
import { FONT_FAMILY } from "@/lib/fonts";
import { useColors } from "@/hooks/use-colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAppStore();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ phone?: string; password?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    const newErrors: typeof errors = {};
    const phoneValidation = validateYemeniPhone(phone);
    if (!phoneValidation.valid) newErrors.phone = phoneValidation.message;
    if (!password.trim()) newErrors.password = "كلمة المرور مطلوبة";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setIsLoading(true);
    try {
      const result = await signIn(phone.trim(), password.trim());
      const profile = await getProfile(result.user.id);
      const role = (profile?.role || "customer") as "customer" | "admin";
      login({
        id: result.user.id,
        name: profile?.name || "",
        phone: profile?.phone || phone.trim(),
        address: profile?.address || "",
        role,
        isLoggedIn: true,
      });
      if (role === "admin") {
        router.replace("/admin" as any);
      } else {
        router.back();
      }
    } catch (err: any) {
      const msg = err?.message || "حدث خطأ أثناء تسجيل الدخول";
      setErrors({ general: msg.includes("غير صحيحة") ? msg : "رقم الجوال أو كلمة المرور غير صحيحة" });
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
              style={{ alignSelf: "flex-end", padding: 4, marginBottom: 16 }}
            >
              <Text style={{ fontFamily: FONT_FAMILY.medium, fontSize: 16, color: colors.primary }}>
                {"رجوع →"}
              </Text>
            </TouchableOpacity>

            {/* Logo */}
            <View style={{ alignItems: "center", marginBottom: 24 }}>
              <Image
                source={require("@/assets/images/haylan-logo.png")}
                style={{ width: 180, height: 120 }}
                contentFit="contain"
              />
              <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 24, color: colors.foreground, marginTop: 12, textAlign: "center" }}>
                تسجيل الدخول
              </Text>
              <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 14, color: colors.muted, marginTop: 4, textAlign: "center" }}>
                أدخل رقم جوالك وكلمة المرور
              </Text>
            </View>

            {errors.general ? (
              <View style={{ backgroundColor: colors.error + "15", borderRadius: 12, padding: 12, marginBottom: 16 }}>
                <Text style={{ fontFamily: FONT_FAMILY.medium, fontSize: 13, color: colors.error, textAlign: "center" }}>
                  {errors.general}
                </Text>
              </View>
            ) : null}

            {/* Phone Input */}
            <View style={{ marginBottom: 16 }}>
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
                height: 52,
              }}>
                <Text style={{ fontFamily: FONT_FAMILY.medium, fontSize: 14, color: colors.muted, marginRight: 8 }}>
                  +967
                </Text>
                <TextInput
                  value={phone}
                  onChangeText={(t) => { setPhone(t); setErrors((e) => ({ ...e, phone: undefined })); }}
                  placeholder="7XXXXXXXX"
                  placeholderTextColor={colors.muted}
                  keyboardType="phone-pad"
                  maxLength={9}
                  style={{
                    flex: 1,
                    fontFamily: FONT_FAMILY.regular,
                    fontSize: 16,
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
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontFamily: FONT_FAMILY.medium, fontSize: 14, color: colors.foreground, marginBottom: 6, textAlign: "right" }}>
                كلمة المرور
              </Text>
              <View style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: errors.password ? colors.error : colors.border,
                paddingHorizontal: 16,
                height: 52,
                justifyContent: "center",
              }}>
                <TextInput
                  value={password}
                  onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: undefined })); }}
                  placeholder="أدخل كلمة المرور"
                  placeholderTextColor={colors.muted}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  style={{
                    fontFamily: FONT_FAMILY.regular,
                    fontSize: 16,
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

            {/* Login Button */}
            <TouchableOpacity
              onPress={handleLogin}
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
                  تسجيل الدخول
                </Text>
              )}
            </TouchableOpacity>

            {/* Register Link */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <TouchableOpacity onPress={() => router.push("/register" as any)}>
                <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 14, color: colors.primary }}>
                  إنشاء حساب
                </Text>
              </TouchableOpacity>
              <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 14, color: colors.muted }}>
                ليس لديك حساب؟
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
