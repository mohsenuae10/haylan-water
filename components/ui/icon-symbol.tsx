import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "drop.fill": "water-drop",
  "list.bullet": "list-alt",
  "person.fill": "person",
  "cart.fill": "shopping-cart",
  "gearshape.fill": "settings",
  "plus": "add",
  "minus": "remove",
  "xmark": "close",
  "checkmark": "check",
  "clock": "access-time",
  "truck.box": "local-shipping",
  "arrow.right": "arrow-forward",
  "arrow.left": "arrow-back",
  "bell.fill": "notifications",
  "pencil": "edit",
  "trash": "delete",
  "magnifyingglass": "search",
  "phone.fill": "phone",
  "location.fill": "location-on",
  "star.fill": "star",
  "info.circle": "info",
  "shield.fill": "admin-panel-settings",
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
