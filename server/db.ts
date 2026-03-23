import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  products, InsertProduct,
  customers, InsertCustomer,
  orders, InsertOrder,
  orderItems, InsertOrderItem,
  notifications, InsertNotification,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ Products ============

export async function getProducts(activeOnly = true) {
  const db = await getDb();
  if (!db) return [];
  if (activeOnly) {
    return db.select().from(products).where(eq(products.isActive, true)).orderBy(products.sortOrder);
  }
  return db.select().from(products).orderBy(products.sortOrder);
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(products).values(data);
  return result.insertId;
}

export async function updateProduct(id: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(products).set(data).where(eq(products.id, id));
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(products).set({ isActive: false }).where(eq(products.id, id));
}

// ============ Customers ============

export async function findOrCreateCustomer(data: InsertCustomer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(customers).where(eq(customers.phone, data.phone)).limit(1);
  if (existing.length > 0) {
    await db.update(customers).set({ name: data.name, address: data.address }).where(eq(customers.id, existing[0].id));
    return existing[0].id;
  }
  const [result] = await db.insert(customers).values(data);
  return result.insertId;
}

export async function getCustomerByPhone(phone: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(customers).where(eq(customers.phone, phone)).limit(1);
  return result.length > 0 ? result[0] : undefined;
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
  orderData: Omit<InsertOrder, "orderNumber">,
  items: Array<{ productId: number; productName: string; productSize: string; quantity: number; unitPrice: string; totalPrice: string }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const orderNumber = generateOrderNumber();
  const [orderResult] = await db.insert(orders).values({ ...orderData, orderNumber });
  const orderId = orderResult.insertId;
  for (const item of items) {
    await db.insert(orderItems).values({ orderId, ...item });
  }
  return { orderId, orderNumber };
}

export async function getOrdersByPhone(phone: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.customerPhone, phone)).orderBy(desc(orders.createdAt));
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getOrderItems(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}

export async function getOrderByNumber(orderNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllOrders(statusFilter?: string) {
  const db = await getDb();
  if (!db) return [];
  if (statusFilter && statusFilter !== "all") {
    return db.select().from(orders)
      .where(eq(orders.status, statusFilter as any))
      .orderBy(desc(orders.createdAt));
  }
  return db.select().from(orders).orderBy(desc(orders.createdAt));
}

export async function updateOrderStatus(id: number, status: "new" | "processing" | "delivering" | "delivered") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(orders).set({ status }).where(eq(orders.id, id));
}

export async function getOrderStats() {
  const db = await getDb();
  if (!db) return { total: 0, new: 0, processing: 0, delivering: 0, delivered: 0 };
  const allOrders = await db.select().from(orders);
  return {
    total: allOrders.length,
    new: allOrders.filter(o => o.status === "new").length,
    processing: allOrders.filter(o => o.status === "processing").length,
    delivering: allOrders.filter(o => o.status === "delivering").length,
    delivered: allOrders.filter(o => o.status === "delivered").length,
  };
}

// ============ Notifications ============

export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(notifications).values(data);
  return result.insertId;
}

export async function getNotificationsByPhone(phone: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.customerPhone, phone)).orderBy(desc(notifications.createdAt));
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}

// ============ Seed Products ============

export async function seedProducts() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(products);
  if (existing.length > 0) return;
  const defaultProducts: InsertProduct[] = [
    {
      name: "Haylan Water 330ml",
      nameAr: "\u0645\u064a\u0627\u0647 \u0647\u064a\u0644\u0627\u0646 330 \u0645\u0644",
      size: "330ml",
      price: "150",
      imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/100988061/e5nvExn8ER8JEKraLFKZX9/water-330ml-2MXub3SDhdjpRtLAyiUyYS.webp",
      description: "Pure natural water, perfect for on-the-go hydration",
      descriptionAr: "\u0645\u064a\u0627\u0647 \u0637\u0628\u064a\u0639\u064a\u0629 \u0646\u0642\u064a\u0629\u060c \u0645\u062b\u0627\u0644\u064a\u0629 \u0644\u0644\u062a\u0631\u0637\u064a\u0628 \u0623\u062b\u0646\u0627\u0621 \u0627\u0644\u062a\u0646\u0642\u0644",
      isActive: true,
      sortOrder: 1,
    },
    {
      name: "Haylan Water 500ml",
      nameAr: "\u0645\u064a\u0627\u0647 \u0647\u064a\u0644\u0627\u0646 500 \u0645\u0644",
      size: "500ml",
      price: "200",
      imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/100988061/e5nvExn8ER8JEKraLFKZX9/water-500ml-3Mkr5MeEt6STFKScbEzkzC.webp",
      description: "Pure natural water, ideal daily companion",
      descriptionAr: "\u0645\u064a\u0627\u0647 \u0637\u0628\u064a\u0639\u064a\u0629 \u0646\u0642\u064a\u0629\u060c \u0631\u0641\u064a\u0642\u0643 \u0627\u0644\u064a\u0648\u0645\u064a \u0627\u0644\u0645\u062b\u0627\u0644\u064a",
      isActive: true,
      sortOrder: 2,
    },
    {
      name: "Haylan Water 750ml",
      nameAr: "\u0645\u064a\u0627\u0647 \u0647\u064a\u0644\u0627\u0646 750 \u0645\u0644",
      size: "750ml",
      price: "300",
      imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/100988061/e5nvExn8ER8JEKraLFKZX9/water-750ml-hvc6BmyiYNwMK2eQTMJhjS.webp",
      description: "Pure natural water, great for sports and activities",
      descriptionAr: "\u0645\u064a\u0627\u0647 \u0637\u0628\u064a\u0639\u064a\u0629 \u0646\u0642\u064a\u0629\u060c \u0645\u062b\u0627\u0644\u064a\u0629 \u0644\u0644\u0631\u064a\u0627\u0636\u0629 \u0648\u0627\u0644\u0623\u0646\u0634\u0637\u0629",
      isActive: true,
      sortOrder: 3,
    },
    {
      name: "Haylan Water 1.5L",
      nameAr: "\u0645\u064a\u0627\u0647 \u0647\u064a\u0644\u0627\u0646 1.5 \u0644\u062a\u0631",
      size: "1.5L",
      price: "400",
      imageUrl: "https://d2xsxph8kpxj0f.cloudfront.net/100988061/e5nvExn8ER8JEKraLFKZX9/water-1500ml-iLcyDqYaEnyhnMYaLWbsYS.webp",
      description: "Pure natural water, family size for home use",
      descriptionAr: "\u0645\u064a\u0627\u0647 \u0637\u0628\u064a\u0639\u064a\u0629 \u0646\u0642\u064a\u0629\u060c \u062d\u062c\u0645 \u0639\u0627\u0626\u0644\u064a \u0644\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u0645\u0646\u0632\u0644\u064a",
      isActive: true,
      sortOrder: 4,
    },
  ];
  for (const product of defaultProducts) {
    await db.insert(products).values(product);
  }
  console.log("[Seed] Default products created");
}
