import { Text, View, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAppStore } from "@/lib/store";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScrollView } from "react-native";

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const { state, logout } = useAppStore();
  const user = state.user;

  const handleLogout = () => {
    Alert.alert(
      "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c",
      "\u0647\u0644 \u062a\u0631\u064a\u062f \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c\u061f",
      [
        { text: "\u0625\u0644\u063a\u0627\u0621", style: "cancel" },
        { text: "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c", style: "destructive", onPress: logout },
      ]
    );
  };

  return (
    <ScreenContainer className="px-4">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text className="text-2xl font-bold text-foreground text-right pt-4 pb-3">
          {"\u062d\u0633\u0627\u0628\u064a"}
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
                  <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>{user.name}</Text>
                  <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, marginTop: 2 }}>{user.phone}</Text>
                  <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 2 }}>{user.address}</Text>
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
              label={"\u0637\u0644\u0628\u0627\u062a\u064a"}
              colors={colors}
              onPress={() => router.push("/(tabs)/orders" as any)}
            />
            <MenuItem
              icon="shield.fill"
              label={"\u0644\u0648\u062d\u0629 \u0627\u0644\u0625\u062f\u0627\u0631\u0629"}
              colors={colors}
              onPress={() => router.push("/admin" as any)}
            />

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
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.error }}>
                {"\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c"}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <View className="flex-1 items-center justify-center" style={{ paddingTop: 60 }}>
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
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground, marginBottom: 8 }}>
              {"\u0645\u0631\u062d\u0628\u0627\u064b \u0628\u0643"}
            </Text>
            <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center", marginBottom: 24, paddingHorizontal: 40 }}>
              {"\u0633\u062c\u0644 \u062f\u062e\u0648\u0644\u0643 \u0644\u062d\u0641\u0638 \u0628\u064a\u0627\u0646\u0627\u062a\u0643 \u0648\u062a\u062a\u0628\u0639 \u0637\u0644\u0628\u0627\u062a\u0643 \u0628\u0633\u0647\u0648\u0644\u0629"}
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                paddingHorizontal: 40,
                paddingVertical: 14,
                borderRadius: 12,
              }}
              onPress={() => router.push("/login" as any)}
              activeOpacity={0.8}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                {"\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644"}
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
        <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>{label}</Text>
        <IconSymbol name={icon} size={22} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
}
