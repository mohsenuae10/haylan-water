import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, adminProcedure, router } from "./_core/trpc";
import * as db from "./db";

const yemeniPhoneSchema = z.string().regex(/^7[0-9]{8}$/, "رقم الجوال يجب أن يبدأ بـ 7 ويتكون من 9 أرقام");

const PRODUCT_IMAGE = "https://files.manuscdn.com/user_upload_by_module/session_file/100988061/bSHeoDkWqPlwtqGy.png";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  appAuth: router({
    login: publicProcedure
      .input(z.object({
        phone: yemeniPhoneSchema,
        password: z.string().min(1, "كلمة المرور مطلوبة"),
      }))
      .mutation(async ({ input }) => {
        const user = await db.verifyAppUser(input.phone, input.password);
        if (!user) {
          throw new Error("رقم الجوال أو كلمة المرور غير صحيحة");
        }
        return {
          id: user.id,
          name: user.name,
          phone: user.phone,
          address: user.address || "",
          role: user.role,
        };
      }),
    register: publicProcedure
      .input(z.object({
        name: z.string().min(1, "الاسم مطلوب"),
        phone: yemeniPhoneSchema,
        password: z.string().min(4, "كلمة المرور يجب أن تكون 4 أحرف على الأقل"),
        address: z.string().min(1, "العنوان مطلوب"),
      }))
      .mutation(async ({ input }) => {
        try {
          const userId = await db.createAppUser({
            name: input.name,
            phone: input.phone,
            password: input.password,
            address: input.address,
            role: "customer",
          });
          return {
            id: userId,
            name: input.name,
            phone: input.phone,
            address: input.address,
            role: "customer" as const,
          };
        } catch (err: any) {
          if (err.message === "PHONE_EXISTS") {
            throw new Error("رقم الجوال مسجل مسبقاً");
          }
          throw err;
        }
      }),
  }),

  products: router({
    list: publicProcedure.query(async () => db.getProducts(true)),
    listAll: publicProcedure.query(async () => db.getProducts(false)),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => db.getProductById(input.id)),
    create: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        nameAr: z.string().min(1),
        size: z.string().min(1),
        price: z.string().min(1),
        imageUrl: z.string().optional(),
        description: z.string().optional(),
        descriptionAr: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => db.createProduct(input)),
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        nameAr: z.string().optional(),
        size: z.string().optional(),
        price: z.string().optional(),
        imageUrl: z.string().optional(),
        description: z.string().optional(),
        descriptionAr: z.string().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateProduct(id, data);
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => db.deleteProduct(input.id)),
  }),

  orders: router({
    create: publicProcedure
      .input(z.object({
        customerName: z.string().min(1, "الاسم مطلوب"),
        customerPhone: yemeniPhoneSchema,
        customerAddress: z.string().min(1, "العنوان مطلوب"),
        notes: z.string().optional(),
        isGuest: z.boolean().default(true),
        items: z.array(z.object({
          productId: z.number(),
          productName: z.string(),
          productSize: z.string(),
          quantity: z.number().min(1),
          unitPrice: z.string(),
          totalPrice: z.string(),
        })).min(1),
        totalAmount: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { items, ...orderData } = input;
        const customerId = await db.findOrCreateCustomer({
          name: input.customerName,
          phone: input.customerPhone,
          address: input.customerAddress,
        });
        return db.createOrder({ ...orderData, customerId }, items);
      }),
    getByPhone: publicProcedure
      .input(z.object({ phone: yemeniPhoneSchema }))
      .query(async ({ input }) => db.getOrdersByPhone(input.phone)),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const order = await db.getOrderById(input.id);
        if (!order) return null;
        const items = await db.getOrderItems(input.id);
        return { ...order, items };
      }),
    getByNumber: publicProcedure
      .input(z.object({ orderNumber: z.string() }))
      .query(async ({ input }) => {
        const order = await db.getOrderByNumber(input.orderNumber);
        if (!order) return null;
        const items = await db.getOrderItems(order.id);
        return { ...order, items };
      }),
    listAll: publicProcedure
      .input(z.object({ status: z.string().optional() }).optional())
      .query(async ({ input }) => db.getAllOrders(input?.status)),
    updateStatus: publicProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["new", "processing", "delivering", "delivered"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateOrderStatus(input.id, input.status);
        const order = await db.getOrderById(input.id);
        if (order) {
          const statusLabels: Record<string, string> = {
            new: "جديد",
            processing: "قيد المعالجة",
            delivering: "جاري التوصيل",
            delivered: "تم التسليم",
          };
          await db.createNotification({
            orderId: input.id,
            customerPhone: order.customerPhone,
            title: "تحديث حالة الطلب",
            message: `تم تحديث حالة طلبك رقم ${order.orderNumber} إلى: ${statusLabels[input.status]}`,
          });
        }
        return { success: true };
      }),
    stats: publicProcedure.query(async () => db.getOrderStats()),
  }),

  customers: router({
    getByPhone: publicProcedure
      .input(z.object({ phone: yemeniPhoneSchema }))
      .query(async ({ input }) => db.getCustomerByPhone(input.phone)),
  }),

  notifications: router({
    getByPhone: publicProcedure
      .input(z.object({ phone: yemeniPhoneSchema }))
      .query(async ({ input }) => db.getNotificationsByPhone(input.phone)),
    markRead: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => db.markNotificationRead(input.id)),
  }),

  seed: router({
    products: publicProcedure.mutation(async () => {
      await db.seedProducts();
      await db.seedAdminUser();
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
