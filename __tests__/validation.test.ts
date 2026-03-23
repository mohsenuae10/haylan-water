import { describe, it, expect } from "vitest";
import { validateYemeniPhone, formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "../lib/validation";

describe("validateYemeniPhone", () => {
  it("should accept valid 9-digit phone starting with 7", () => {
    expect(validateYemeniPhone("711234567")).toEqual({ valid: true, message: "" });
    expect(validateYemeniPhone("770000000")).toEqual({ valid: true, message: "" });
    expect(validateYemeniPhone("733456789")).toEqual({ valid: true, message: "" });
  });

  it("should reject empty phone", () => {
    const result = validateYemeniPhone("");
    expect(result.valid).toBe(false);
    expect(result.message).toBeTruthy();
  });

  it("should reject non-numeric characters", () => {
    const result = validateYemeniPhone("71234abcd");
    expect(result.valid).toBe(false);
    expect(result.message).toContain("أرقام فقط");
  });

  it("should reject phone not starting with 7", () => {
    const result = validateYemeniPhone("912345678");
    expect(result.valid).toBe(false);
    expect(result.message).toContain("7");
  });

  it("should reject phone with less than 9 digits", () => {
    const result = validateYemeniPhone("7123456");
    expect(result.valid).toBe(false);
    expect(result.message).toContain("9");
  });

  it("should reject phone with more than 9 digits", () => {
    const result = validateYemeniPhone("7123456789");
    expect(result.valid).toBe(false);
    expect(result.message).toContain("9");
  });

  it("should handle whitespace in phone", () => {
    const result = validateYemeniPhone("7 1 2 3 4 5 6 7 8");
    expect(result.valid).toBe(true);
  });
});

describe("formatPrice", () => {
  it("should format number price with YER currency", () => {
    const formatted = formatPrice(200);
    expect(formatted).toContain("ر.ي");
    // Numbers may be formatted in Arabic numerals
    expect(formatted).toMatch(/200|٢٠٠/);
  });

  it("should format string price", () => {
    const formatted = formatPrice("1500");
    expect(formatted).toContain("ر.ي");
  });
});

describe("ORDER_STATUS_LABELS", () => {
  it("should have all 4 statuses", () => {
    expect(ORDER_STATUS_LABELS).toHaveProperty("new");
    expect(ORDER_STATUS_LABELS).toHaveProperty("processing");
    expect(ORDER_STATUS_LABELS).toHaveProperty("delivering");
    expect(ORDER_STATUS_LABELS).toHaveProperty("delivered");
  });

  it("should have Arabic labels", () => {
    expect(ORDER_STATUS_LABELS.new).toBe("جديد");
    expect(ORDER_STATUS_LABELS.processing).toBe("قيد المعالجة");
    expect(ORDER_STATUS_LABELS.delivering).toBe("جاري التوصيل");
    expect(ORDER_STATUS_LABELS.delivered).toBe("تم التسليم");
  });
});

describe("ORDER_STATUS_COLORS", () => {
  it("should have colors for all statuses", () => {
    expect(ORDER_STATUS_COLORS).toHaveProperty("new");
    expect(ORDER_STATUS_COLORS).toHaveProperty("processing");
    expect(ORDER_STATUS_COLORS).toHaveProperty("delivering");
    expect(ORDER_STATUS_COLORS).toHaveProperty("delivered");
  });

  it("should have valid hex colors", () => {
    Object.values(ORDER_STATUS_COLORS).forEach((color) => {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});
