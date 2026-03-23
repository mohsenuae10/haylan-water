import { useFonts } from "expo-font";

export function useCairoFonts() {
  return useFonts({
    "Cairo-Regular": require("@/assets/fonts/Cairo-Regular.ttf"),
    "Cairo-Medium": require("@/assets/fonts/Cairo-Medium.ttf"),
    "Cairo-SemiBold": require("@/assets/fonts/Cairo-SemiBold.ttf"),
    "Cairo-Bold": require("@/assets/fonts/Cairo-Bold.ttf"),
  });
}

export const FONT_FAMILY = {
  regular: "Cairo-Regular",
  medium: "Cairo-Medium",
  semiBold: "Cairo-SemiBold",
  bold: "Cairo-Bold",
};
