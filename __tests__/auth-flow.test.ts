import { describe, it, expect } from "vitest";
import { validateYemeniPhone } from "../lib/validation";

describe("Auth Flow - Phone + Password Validation", () => {
  it("should validate correct Yemeni phone numbers", () => {
    expect(validateYemeniPhone("711111111").valid).toBe(true);
    expect(validateYemeniPhone("733333333").valid).toBe(true);
    expect(validateYemeniPhone("777777777").valid).toBe(true);
  });

  it("should reject invalid phone numbers", () => {
    expect(validateYemeniPhone("").valid).toBe(false);
    expect(validateYemeniPhone("123456789").valid).toBe(false);
    expect(validateYemeniPhone("7111111").valid).toBe(false);
    expect(validateYemeniPhone("71111111111").valid).toBe(false);
    expect(validateYemeniPhone("811111111").valid).toBe(false);
  });

  it("should validate password requirements", () => {
    // Password must be at least 4 characters
    const validatePassword = (pwd: string) => {
      if (!pwd.trim()) return { valid: false, message: "كلمة المرور مطلوبة" };
      if (pwd.trim().length < 4) return { valid: false, message: "كلمة المرور يجب أن تكون 4 أحرف على الأقل" };
      return { valid: true, message: "" };
    };

    expect(validatePassword("").valid).toBe(false);
    expect(validatePassword("   ").valid).toBe(false);
    expect(validatePassword("abc").valid).toBe(false);
    expect(validatePassword("abcd").valid).toBe(true);
    expect(validatePassword("admin123").valid).toBe(true);
  });

  it("should validate registration fields", () => {
    const validateRegistration = (data: { name: string; phone: string; password: string; address: string }) => {
      const errors: Record<string, string> = {};
      if (!data.name.trim()) errors.name = "الاسم مطلوب";
      const phoneResult = validateYemeniPhone(data.phone);
      if (!phoneResult.valid) errors.phone = phoneResult.message;
      if (!data.password.trim()) errors.password = "كلمة المرور مطلوبة";
      else if (data.password.trim().length < 4) errors.password = "كلمة المرور يجب أن تكون 4 أحرف على الأقل";
      if (!data.address.trim()) errors.address = "العنوان مطلوب";
      return { valid: Object.keys(errors).length === 0, errors };
    };

    // Valid registration
    const valid = validateRegistration({
      name: "أحمد محمد",
      phone: "711111111",
      password: "pass1234",
      address: "صنعاء - شارع الزبيري",
    });
    expect(valid.valid).toBe(true);

    // Missing name
    const noName = validateRegistration({
      name: "",
      phone: "711111111",
      password: "pass1234",
      address: "صنعاء",
    });
    expect(noName.valid).toBe(false);
    expect(noName.errors.name).toBeDefined();

    // Invalid phone
    const badPhone = validateRegistration({
      name: "أحمد",
      phone: "123",
      password: "pass1234",
      address: "صنعاء",
    });
    expect(badPhone.valid).toBe(false);
    expect(badPhone.errors.phone).toBeDefined();

    // Short password
    const shortPwd = validateRegistration({
      name: "أحمد",
      phone: "711111111",
      password: "ab",
      address: "صنعاء",
    });
    expect(shortPwd.valid).toBe(false);
    expect(shortPwd.errors.password).toBeDefined();

    // Missing address
    const noAddr = validateRegistration({
      name: "أحمد",
      phone: "711111111",
      password: "pass1234",
      address: "",
    });
    expect(noAddr.valid).toBe(false);
    expect(noAddr.errors.address).toBeDefined();
  });

  it("should correctly identify admin role", () => {
    const isAdmin = (role: string) => role === "admin";
    const isCustomer = (role: string) => role === "customer";

    expect(isAdmin("admin")).toBe(true);
    expect(isAdmin("customer")).toBe(false);
    expect(isCustomer("customer")).toBe(true);
    expect(isCustomer("admin")).toBe(false);
  });
});
