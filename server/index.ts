import "dotenv/config";
import express from "express";
import cors from "cors";

// Booqable API routes
import {
  getCollections,
  getProducts,
  getProduct,
  getProductsWithImages,
  checkAvailability,
  createCustomer,
  createOrder,
} from "./routes/booqable";

// Stripe API routes (removed mock). Use real checkout + payment-management routes.

// Availability/Calendar routes (legacy functions that may not exist)
// import {
//   getUnavailableDates,
//   validateDateRange,
//   getSuggestedDates
// } from "./routes/availability";

// Checkout routes
import * as checkoutRoutes from "./routes/checkout";

// User dashboard routes
import * as userDashboard from "./routes/user-dashboard";

// User routes
import {
  getUserProfile,
  getUserOrders,
  updateUserProfile,
  addToWishlist,
  removeFromWishlist,
  getUserWishlist,
  getUserPreferences,
  updateUserPreferences,
  addUserNote,
  getUserNotes,
} from "./routes/user";

// Order management routes
import {
  modifyOrder,
  cancelOrder,
  rescheduleOrder,
  getOrderModificationOptions,
} from "./routes/order-management";

// Payment management routes (simplified version without full Stripe integration)
import {
  getOrderPayments,
  processPayment,
  handlePaymentSuccess,
  downloadInvoice,
  getCustomerPaymentMethods,
} from "./routes/payment-management";

// Stock alerts routes
import {
  createStockAlert,
  getUserStockAlerts,
  deleteStockAlert,
  checkAllAlertsAvailability,
  getAlertStatistics,
  triggerTestNotification,
} from "./routes/stock-alerts";

// Authentication middleware
import { authenticateToken, optionalAuth } from "./middleware/auth";

export function createServer() {
  const app = express();

  // Instrument route registration to catch invalid route patterns (a previous error was 'Missing parameter name' from path-to-regexp)
  try {
    const methodsToWrap = [
      "get",
      "post",
      "put",
      "delete",
      "patch",
      "use",
      "options",
    ];
    for (const m of methodsToWrap) {
      const orig = (app as any)[m];
      (app as any)[m] = function (...args: any[]) {
        try {
          // Log the route/prefix being registered for debugging
          if (typeof args[0] === "string") {
            // eslint-disable-next-line no-console
            console.log(`[route-register] ${m.toUpperCase()} ${args[0]}`);
          }
          return orig.apply(app, args);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(
            `[route-register][ERROR] while registering ${m.toUpperCase()} ${String(args[0])}:`,
            err,
          );
          throw err;
        }
      };
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("Failed to instrument route registration:", e);
  }

  // Middleware
  app.use(
    cors({
      origin: true,
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    }),
  );

  // Raw body for Stripe webhooks (must be before JSON parser)
  app.use("/api/webhooks/stripe", express.raw({ type: "application/json" }));
  // Raw body for checkout webhook (must be before JSON parser)
  app.use("/api/checkout/webhook", express.raw({ type: "application/json" }));

  // JSON middleware for all other routes
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  // Booqable API routes
  app.get("/api/collections", getCollections);
  app.get("/api/products", getProducts);
  app.get("/api/products-with-images", getProductsWithImages);
  app.get("/api/products/:id", getProduct);
  app.post("/api/customers", authenticateToken, createCustomer);
  app.post("/api/orders", authenticateToken, createOrder);

  // Stripe webhook (use real handler from checkout routes)
  app.post("/api/webhooks/stripe", checkoutRoutes.handleStripeWebhook);

  // Availability/Calendar routes (commented out legacy functions)
  // app.get("/api/availability/:product_id", getUnavailableDates);
  // app.get("/api/availability", getUnavailableDates); // For all products
  // app.post("/api/availability/validate", validateDateRange);
  // app.post("/api/availability/suggestions", getSuggestedDates);

  // User routes (require authentication)
  app.get("/api/user/profile", authenticateToken, getUserProfile);
  app.put("/api/user/profile", authenticateToken, updateUserProfile);
  app.get("/api/user/orders", authenticateToken, getUserOrders);
  app.get("/api/user/wishlist", authenticateToken, getUserWishlist);
  app.post("/api/user/wishlist", authenticateToken, addToWishlist);
  app.delete(
    "/api/user/wishlist/:product_id",
    authenticateToken,
    removeFromWishlist,
  );

  // Preferences and notes
  app.get("/api/user/preferences", authenticateToken, getUserPreferences);
  app.put("/api/user/preferences", authenticateToken, updateUserPreferences);
  app.get("/api/user/notes", authenticateToken, getUserNotes);
  app.post("/api/user/notes", authenticateToken, addUserNote);

  // Order management routes (require authentication)
  app.put("/api/orders/:orderId/modify", authenticateToken, modifyOrder);
  app.post("/api/orders/:orderId/cancel", authenticateToken, cancelOrder);
  app.put(
    "/api/orders/:orderId/reschedule",
    authenticateToken,
    rescheduleOrder,
  );
  app.get(
    "/api/orders/:orderId/modification-options",
    authenticateToken,
    getOrderModificationOptions,
  );

  // Payment management routes (require authentication)
  app.get("/api/orders/:orderId/payments", authenticateToken, getOrderPayments);
  app.post("/api/orders/:orderId/pay", authenticateToken, processPayment);
  app.post("/api/payments/success", handlePaymentSuccess);
  app.get(
    "/api/invoices/:invoiceId/download",
    authenticateToken,
    downloadInvoice,
  );
  app.get(
    "/api/customers/:customerId/payment-methods",
    authenticateToken,
    getCustomerPaymentMethods,
  );

  // Stock alerts routes (require authentication)
  app.post("/api/stock-alerts", authenticateToken, createStockAlert);
  app.get("/api/user/stock-alerts", authenticateToken, getUserStockAlerts);
  app.delete("/api/stock-alerts/:alertId", authenticateToken, deleteStockAlert);
  app.post("/api/stock-alerts/check-availability", checkAllAlertsAvailability);
  app.get("/api/stock-alerts/statistics", getAlertStatistics);
  app.post(
    "/api/stock-alerts/:alertId/test-notification",
    triggerTestNotification,
  );


  // Checkout and payment routes
  app.post(
    "/api/checkout/create-session",
    checkoutRoutes.createCheckoutSession,
  );
  app.post("/api/checkout/webhook", checkoutRoutes.handleStripeWebhook);
  app.get(
    "/api/checkout/session/:session_id",
    checkoutRoutes.getCheckoutSession,
  );

  // User dashboard routes (authenticated, scoped to current user)
  app.get(
    "/api/dashboard/data",
    authenticateToken,
    userDashboard.getDashboardData,
  );
  app.get(
    "/api/dashboard/wishlist",
    authenticateToken,
    userDashboard.getWishlistByEmail,
  );
  app.get(
    "/api/dashboard/profile",
    authenticateToken,
    userDashboard.getCustomerProfile,
  );
  app.put(
    "/api/dashboard/profile",
    authenticateToken,
    userDashboard.updateCustomerProfile,
  );

  return app;
}
