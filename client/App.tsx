import "./global.css";

import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { WishlistProvider } from "./contexts/WishlistContext";
import { Layout } from "./components/Layout";
import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductsWithImages from "./pages/ProductsWithImages";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import MyOrders from "./pages/MyOrders";
import Wishlist from "./pages/Wishlist";
import Settings from "./pages/Settings";
import CostumeDetail from "./pages/CostumeDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import PlaceholderPage from "./pages/PlaceholderPage";
import NotFound from "./pages/NotFound";
import NetworkDiagnostics from "./components/NetworkDiagnostics";
import CollectionView from "./pages/CollectionView";
import Notifications from "./pages/Notifications";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Preserve the browser's native fetch in case third-party scripts override window.fetch
    try {
      const w = window as any;
      if (!w.__nativeFetch) w.__nativeFetch = window.fetch.bind(window);
    } catch (e) {
      // ignore
    }

    const shouldIgnoreError = (msg?: string, filename?: string) => {
      if (!msg && !filename) return false;
      const m = (msg || "").toString();
      const f = (filename || "").toString();
      // Ignore noisy FullStory network errors and generic fetch failures originating from their CDN
      if (m.includes("Failed to fetch") && f.includes("fullstory")) return true;
      if (m.includes("FullStory") || f.includes("edge.fullstory.com"))
        return true;
      return false;
    };

    const onError = (event: ErrorEvent) => {
      try {
        const msg = event.error
          ? event.error.message || String(event.error)
          : event.message;
        const filename = (event.filename || "") as string;
        if (shouldIgnoreError(msg, filename)) {
          // suppressed noisy external script error
          return;
        }
        console.error("Global error caught:", event.error || event.message);
        event.preventDefault();
      } catch (e) {
        // swallow
      }
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      try {
        const reason = event.reason
          ? event.reason.message || String(event.reason)
          : "";
        const stack =
          event.reason && event.reason.stack ? event.reason.stack : "";
        if (shouldIgnoreError(reason, stack)) {
          return;
        }
        console.error("Unhandled promise rejection:", event.reason);
        event.preventDefault();
      } catch (e) {}
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/products" element={<Products />} />
                    <Route
                      path="/products-with-images"
                      element={<ProductsWithImages />}
                    />
                    <Route
                      path="/collections/:slug"
                      element={<CollectionView />}
                    />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/costume/:id" element={<CostumeDetail />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route
                      path="/checkout/success"
                      element={<CheckoutSuccess />}
                    />
                    {/* Support legacy or mis-cased URLs */}
                    <Route
                      path="/CheckoutSuccess"
                      element={<Navigate to="/checkout/success" replace />}
                    />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/orders" element={<MyOrders />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/wishlist" element={<Wishlist />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route
                      path="/about"
                      element={<PlaceholderPage title="About Us" />}
                    />
                    <Route
                      path="/contact"
                      element={<PlaceholderPage title="Contact" />}
                    />
                    <Route
                      path="/faq"
                      element={<PlaceholderPage title="FAQ" />}
                    />
                    <Route
                      path="/size-guide"
                      element={<PlaceholderPage title="Size Guide" />}
                    />
                    <Route
                      path="/care-instructions"
                      element={<PlaceholderPage title="Care Instructions" />}
                    />
                    <Route
                      path="/rental-terms"
                      element={<PlaceholderPage title="Rental Terms" />}
                    />
                    <Route
                      path="/privacy"
                      element={<PlaceholderPage title="Privacy Policy" />}
                    />
                    <Route
                      path="/returns"
                      element={<PlaceholderPage title="Returns & Refunds" />}
                    />
                    <Route
                      path="/network-diagnostics"
                      element={
                        <div className="container mx-auto p-8">
                          <NetworkDiagnostics />
                        </div>
                      }
                    />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Layout>
              </BrowserRouter>
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

{
  const container = document.getElementById("root")!;
  const w = window as any;
  if (!w.__app_root) {
    w.__app_root = createRoot(container);
  }
  w.__app_root.render(<App />);
}
