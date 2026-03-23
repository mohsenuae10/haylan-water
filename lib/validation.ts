/**
 * Validate Yemeni phone number
 * Must start with 7 and be exactly 9 digits
 */
export function validateYemeniPhone(phone: string): { valid: boolean; message: string } {
  const cleaned = phone.replace(/\s/g, "");
  if (!cleaned) {
    return { valid: false, message: "رقم الجوال مطلوب" };
  }
  if (!/^\d+$/.test(cleaned)) {
    return { valid: false, message: "رقم الجوال يجب أن يحتوي على أرقام فقط" };
  }
  if (cleaned.length !== 9) {
    return { valid: false, message: "رقم الجوال يجب أن يتكون من 9 أرقام" };
  }
  if (!cleaned.startsWith("7")) {
    return { valid: false, message: "رقم الجوال يجب أن يبدأ بالرقم 7" };
  }
  return { valid: true, message: "" };
}

export function formatPrice(price: number | string): string {
  const num = typeof price === "string" ? parseFloat(price) : price;
  return `${num.toLocaleString("ar-YE")} ر.ي`;
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  new: "جديد",
  processing: "قيد المعالجة",
  delivering: "جاري التوصيل",
  delivered: "تم التسليم",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  new: "#6B7280",
  processing: "#F59E0B",
  delivering: "#3B82F6",
  delivered: "#22C55E",
};
