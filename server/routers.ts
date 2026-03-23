import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, adminProcedure, router } from "./_core/trpc";
import * as db from "./db";

const yemeniPhoneSchema = z.string().regex(/^7[0-9]{8}$/, "\u0631\u0642\u0645 \u0627\u0644\u062c\u0648\u0627\u0644 \u064a\u062c\u0628 \u0623\u0646 \u064a\u0628\u062f\u0623 \u0628\u0640 7 \u0648\u064a\u062a\u0643\u0648\u0646 \u0645\u0646 9 \u0623\u0631\u0642\u0627\u0645");

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
        customerName: z.string().min(1, "\u0627\u0644\u0627\u0633\u0645 \u0645\u0637\u0644\u0648\u0628"),
        customerPhone: yemeniPhoneSchema,
        customerAddress: z.string().min(1, "\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0645\u0637\u0644\u0648\u0628"),
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
            new: "\u062c\u062f\u064a\u062f",
            processing: "\u0642\u064a\u062f \u0627\u0644\u0645\u0639\u0627\u0644\u062c\u0629",
            delivering: "\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u0648\u0635\u064a\u0644",
            delivered: "\u062a\u0645 \u0627\u0644\u062a\u0633\u0644\u064a\u0645",
          };
          await db.createNotification({
            orderId: input.id,
            customerPhone: order.customerPhone,
            title: "\u062a\u062d\u062f\u064a\u062b \u062d\u0627\u0644\u0629 \u0627\u0644\u0637\u0644\u0628",
            message: `\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u062d\u0627\u0644\u0629 \u0637\u0644\u0628\u0643 \u0631\u0642\u0645 ${order.orderNumber} \u0625\u0644\u0649: ${statusLabels[input.status]}`,
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
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
