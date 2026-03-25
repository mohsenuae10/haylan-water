import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Database, ProductCategory } from "./supabase-types";

// ============================================================
// Supabase Client Configuration
// ============================================================
// Set these in your .env file:
//   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
//   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
// ============================================================

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. " +
    "Add them to your .env file."
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ============ Auth Helpers ============

/**
 * Sign up with phone + password.
 * We use email-based auth with phone@haylan.app pattern
 * since SMS OTP is not needed for this app.
 */
export async function signUp(data: {
  phone: string;
  password: string;
  name: string;
  address: string;
}) {
  const email = `${data.phone}@haylan.app`;

  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password: data.password,
    options: {
      data: {
        name: data.name,
        phone: data.phone,
        address: data.address,
        role: "customer",
      },
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      throw new Error("رقم الجوال مسجل مسبقاً");
    }
    throw new Error(error.message);
  }

  // If signup didn't return a session (email confirmation flow),
  // auto-login since we have auto-confirm enabled
  if (authData.user && !authData.session) {
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password: data.password,
    });
    if (!loginError && loginData.session) {
      return { user: loginData.user, session: loginData.session };
    }
  }

  return authData;
}

/**
 * Sign in with phone + password.
 */
export async function signIn(phone: string, password: string) {
  const email = `${phone}@haylan.app`;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error("رقم الجوال أو كلمة المرور غير صحيحة");
  }

  return data;
}

/**
 * Sign out.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

/**
 * Get current session.
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  return data.session;
}

/**
 * Get user profile from profiles table.
 */
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) return null;
  return data;
}

// ============ Categories ============

export async function getCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
  return data || [];
}

// ============ Products ============

export async function getProducts(activeOnly = true, category?: ProductCategory) {
  let query = supabase
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true });

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getProductsByCategory(category: ProductCategory) {
  return getProducts(true, category);
}

export async function getFeaturedProducts(limit = 6) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching featured products:", error);
    return [];
  }
  return data || [];
}

export async function getProductById(id: number) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export async function createProduct(product: {
  name: string;
  name_ar: string;
  size: string;
  price: number;
  image_url?: string;
  description?: string;
  description_ar?: string;
  sort_order?: number;
  category?: string;
}) {
  const { data, error } = await supabase
    .from("products")
    .insert(product)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateProduct(
  id: number,
  updates: Partial<{
    name: string;
    name_ar: string;
    size: string;
    price: number;
    image_url: string;
    description: string;
    description_ar: string;
    is_active: boolean;
    sort_order: number;
  }>
) {
  const { data, error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteProduct(id: number) {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/**
 * Upload a product image to Supabase Storage.
 * Requires a "product-images" bucket in Supabase Storage.
 */
export async function uploadProductImage(uri: string, fileName?: string): Promise<string> {
  const ext = uri.split(".").pop()?.toLowerCase() || "jpg";
  const name = fileName || `product_${Date.now()}.${ext}`;
  const filePath = `products/${name}`;

  // Fetch the file as a blob
  const response = await fetch(uri);
  const blob = await response.blob();

  // Convert blob to ArrayBuffer for upload
  const arrayBuffer = await new Response(blob).arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(filePath, arrayBuffer, {
      contentType: `image/${ext === "png" ? "png" : "jpeg"}`,
      upsert: true,
    });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage
    .from("product-images")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

// ============ Customers ============

export async function findOrCreateCustomer(data: {
  name: string;
  phone: string;
  address: string;
}) {
  // Check if customer exists
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", data.phone)
    .limit(1)
    .single();

  if (existing) {
    // Update existing customer
    await supabase
      .from("customers")
      .update({ name: data.name, address: data.address })
      .eq("id", existing.id);
    return existing.id;
  }

  // Create new customer
  const { data: newCustomer, error } = await supabase
    .from("customers")
    .insert(data)
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return newCustomer!.id;
}

export async function getCustomerByPhone(phone: string) {
  const { data } = await supabase
    .from("customers")
    .select("*")
    .eq("phone", phone)
    .limit(1)
    .single();

  return data;
}

// ============ Orders ============

function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `HW${y}${m}${d}${rand}`;
}

export async function createOrder(
  orderData: {
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    notes?: string;
    isGuest: boolean;
    totalAmount: string;
  },
  items: Array<{
    productId: number;
    productName: string;
    productSize: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
  }>
) {
  // Find or create customer
  const customerId = await findOrCreateCustomer({
    name: orderData.customerName,
    phone: orderData.customerPhone,
    address: orderData.customerAddress,
  });

  const orderNumber = generateOrderNumber();

  // Create order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      customer_id: customerId,
      customer_name: orderData.customerName,
      customer_phone: orderData.customerPhone,
      customer_address: orderData.customerAddress,
      total_amount: parseFloat(orderData.totalAmount),
      notes: orderData.notes || null,
      is_guest: orderData.isGuest,
      status: "new",
    })
    .select("id")
    .single();

  if (orderError) throw new Error(orderError.message);

  // Create order items
  const orderItems = items.map((item) => ({
    order_id: order!.id,
    product_id: item.productId,
    product_name: item.productName,
    product_size: item.productSize,
    quantity: item.quantity,
    unit_price: parseFloat(item.unitPrice),
    total_price: parseFloat(item.totalPrice),
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) throw new Error(itemsError.message);

  return { orderId: order!.id, orderNumber };
}

export async function getOrdersByPhone(phone: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_phone", phone)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getOrderById(id: number) {
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", id);

  return { ...order, items: items || [] };
}

export async function getAllOrders(statusFilter?: string) {
  let query = supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter as "new" | "processing" | "delivering" | "delivered");
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function updateOrderStatus(
  id: number,
  status: "new" | "processing" | "delivering" | "delivered"
) {
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(error.message);

  // Get order to create notification
  const { data: order } = await supabase
    .from("orders")
    .select("order_number, customer_phone")
    .eq("id", id)
    .single();

  if (order) {
    const statusLabels: Record<string, string> = {
      new: "جديد",
      processing: "قيد المعالجة",
      delivering: "جاري التوصيل",
      delivered: "تم التسليم",
    };

    await supabase.from("notifications").insert({
      order_id: id,
      customer_phone: order.customer_phone,
      title: "تحديث حالة الطلب",
      message: `تم تحديث حالة طلبك رقم ${order.order_number} إلى: ${statusLabels[status]}`,
    });
  }
}

export async function getOrderStats() {
  const { data, error } = await supabase.from("orders").select("status");

  if (error || !data) {
    return { total: 0, new: 0, processing: 0, delivering: 0, delivered: 0 };
  }

  return {
    total: data.length,
    new: data.filter((o) => o.status === "new").length,
    processing: data.filter((o) => o.status === "processing").length,
    delivering: data.filter((o) => o.status === "delivering").length,
    delivered: data.filter((o) => o.status === "delivered").length,
  };
}

// ============ Notifications ============

export async function getNotificationsByPhone(phone: string) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("customer_phone", phone)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function markNotificationRead(id: number) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ============ Banners ============

export async function getBanners(activeOnly = true) {
  let query = supabase
    .from("banners")
    .select("*")
    .order("sort_order", { ascending: true });

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching banners:", error);
    return [];
  }
  return data || [];
}

export async function createBanner(banner: {
  title?: string;
  title_ar?: string;
  description?: string;
  description_ar?: string;
  image_url: string;
  link_type?: "none" | "category" | "product" | "url";
  link_value?: string;
  sort_order?: number;
  is_active?: boolean;
}) {
  const { data, error } = await supabase
    .from("banners")
    .insert(banner)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateBanner(
  id: number,
  updates: Partial<{
    title: string;
    title_ar: string;
    description: string;
    description_ar: string;
    image_url: string;
    link_type: "none" | "category" | "product" | "url";
    link_value: string;
    sort_order: number;
    is_active: boolean;
  }>
) {
  const { data, error } = await supabase
    .from("banners")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteBanner(id: number) {
  const { error } = await supabase
    .from("banners")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/**
 * Upload a banner image to Supabase Storage.
 */
export async function uploadBannerImage(uri: string, fileName?: string): Promise<string> {
  const ext = uri.split(".").pop()?.toLowerCase() || "jpg";
  const name = fileName || `banner_${Date.now()}.${ext}`;
  const filePath = `banners/${name}`;

  const response = await fetch(uri);
  const blob = await response.blob();
  const arrayBuffer = await new Response(blob).arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("banners")
    .upload(filePath, arrayBuffer, {
      contentType: `image/${ext === "png" ? "png" : ext === "gif" ? "gif" : ext === "webp" ? "webp" : "jpeg"}`,
      upsert: true,
    });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage
    .from("banners")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

// ============ Category Images ============

/**
 * Upload a category image to Supabase Storage and update the category.
 */
export async function uploadCategoryImage(uri: string, categoryId: string): Promise<string> {
  const ext = uri.split(".").pop()?.toLowerCase() || "jpg";
  const name = `category_${categoryId}_${Date.now()}.${ext}`;
  const filePath = `categories/${name}`;

  const response = await fetch(uri);
  const blob = await response.blob();
  const arrayBuffer = await new Response(blob).arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(filePath, arrayBuffer, {
      contentType: `image/${ext === "png" ? "png" : "jpeg"}`,
      upsert: true,
    });

  if (uploadError) throw new Error(uploadError.message);

  const { data: urlData } = supabase.storage
    .from("product-images")
    .getPublicUrl(filePath);

  // Update category record with image_url
  const { error: updateError } = await supabase
    .from("categories")
    .update({ image_url: urlData.publicUrl })
    .eq("id", categoryId);

  if (updateError) throw new Error(updateError.message);

  return urlData.publicUrl;
}

export async function updateCategory(
  id: string,
  updates: Partial<{
    name_ar: string;
    name_en: string;
    icon: string;
    image_url: string | null;
    description_ar: string;
    sort_order: number;
    is_active: boolean;
  }>
) {
  const { data, error } = await supabase
    .from("categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
