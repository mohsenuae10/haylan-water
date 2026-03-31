import { Text, View, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAppStore } from "@/lib/store";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { FONT_FAMILY } from "@/lib/fonts";
import { deleteAccount } from "@/lib/supabase";

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const { state, logout } = useAppStore();
  const user = state.user;

  const [isDeleting, setIsDeleting] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      "تسجيل الخروج",
      "هل تريد تسجيل الخروج؟",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "تسجيل الخروج",
          style: "destructive",
          onPress: () => {
            logout();
            router.replace("/(tabs)" as any);
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "حذف الحساب",
      "هل أنت متأكد من حذف حسابك؟ سيتم حذف جميع بياناتك وطلباتك نهائياً ولا يمكن استرجاعها.",
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف الحساب",
          style: "destructive",
          onPress: () => confirmDeleteAccount(),
        },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    if (!user?.id || !user?.phone) return;
    setIsDeleting(true);
    try {
      await deleteAccount(user.id, user.phone);
      logout();
      router.replace("/(tabs)" as any);
      Alert.alert("تم الحذف", "تم حذف حسابك وجميع بياناتك بنجاح.");
    } catch (error: any) {
      Alert.alert("خطأ", "حدث خطأ أثناء حذف الحساب. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ScreenContainer className="px-4">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 24, color: colors.foreground, textAlign: "right", paddingTop: 16, paddingBottom: 12 }}>
          حسابي
        </Text>

        {user?.isLoggedIn ? (
          <>
            {/* User Info Card */}
            <View
              style={{
                backgroundColor: colors.primary,
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontFamily: FONT_FAMILY.bold, color: "#fff", fontSize: 18 }}>{user.name}</Text>
                  <Text style={{ fontFamily: FONT_FAMILY.regular, color: "rgba(255,255,255,0.8)", fontSize: 14, marginTop: 2 }}>{user.phone}</Text>
                  <Text style={{ fontFamily: FONT_FAMILY.regular, color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 2 }}>{user.address}</Text>
                  {user.role === "admin" ? (
                    <View style={{ backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, marginTop: 6 }}>
                      <Text style={{ fontFamily: FONT_FAMILY.semiBold, color: "#fff", fontSize: 12 }}>مسؤول</Text>
                    </View>
                  ) : null}
                </View>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: "rgba(255,255,255,0.2)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <IconSymbol name="person.fill" size={28} color="#fff" />
                </View>
              </View>
            </View>

            {/* Menu Items */}
            <MenuItem
              icon="list.bullet"
              label="طلباتي"
              colors={colors}
              onPress={() => router.push("/(tabs)/orders" as any)}
            />
            {user.role === "admin" ? (
              <MenuItem
                icon="shield.fill"
                label="لوحة الإدارة"
                colors={colors}
                onPress={() => router.push("/admin" as any)}
              />
            ) : null}

            <TouchableOpacity
              style={{
                backgroundColor: colors.error + "15",
                borderRadius: 14,
                padding: 16,
                marginTop: 20,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
              }}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 15, color: colors.error }}>
                تسجيل الخروج
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                borderRadius: 14,
                padding: 16,
                marginTop: 10,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
                borderWidth: 1,
                borderColor: colors.error + "40",
              }}
              onPress={handleDeleteAccount}
              activeOpacity={0.7}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 13, color: colors.error + "99" }}>
                  حذف الحساب
                </Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: colors.primary + "15",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <IconSymbol name="person.fill" size={40} color={colors.primary} />
            </View>
            <Text style={{ fontFamily: FONT_FAMILY.bold, fontSize: 18, color: colors.foreground, marginBottom: 8 }}>
              مرحباً بك
            </Text>
            <Text style={{ fontFamily: FONT_FAMILY.regular, fontSize: 14, color: colors.muted, textAlign: "center", marginBottom: 24, paddingHorizontal: 40 }}>
              سجل دخولك لحفظ بياناتك وتتبع طلباتك بسهولة
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                paddingHorizontal: 40,
                paddingVertical: 14,
                borderRadius: 12,
                marginBottom: 12,
              }}
              onPress={() => router.push("/login" as any)}
              activeOpacity={0.8}
            >
              <Text style={{ fontFamily: FONT_FAMILY.bold, color: "#fff", fontSize: 16 }}>
                تسجيل الدخول
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/register" as any)}
              activeOpacity={0.8}
            >
              <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 14, color: colors.primary }}>
                إنشاء حساب جديد
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function MenuItem({ icon, label, colors, onPress }: { icon: any; label: string; colors: any; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={{
        backgroundColor: colors.surface,
        borderRadius: 14,
        padding: 16,
        marginBottom: 8,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.border,
      }}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <IconSymbol name="chevron.right" size={18} color={colors.muted} style={{ transform: [{ scaleX: -1 }] }} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text style={{ fontFamily: FONT_FAMILY.semiBold, fontSize: 15, color: colors.foreground }}>{label}</Text>
        <IconSymbol name={icon} size={22} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
}
