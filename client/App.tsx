import "./global.css";

import { Toaster } from "./components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { Navbar } from "./components/Navbar";
import { SupportChatbot } from "./components/SupportChatbot";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PlaceholderPage from "./pages/PlaceholderPage";
import Cart from "./pages/Cart";
import Dashboard from "./pages/Dashboard";
import SearchResults from "./pages/SearchResults";
import { Products } from "./pages/Products";
import { ProductDetails } from "./pages/ProductDetails";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <NotificationProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <div className="min-h-screen bg-background">
                <Navbar />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/search" element={<SearchResults />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/collection/:collectionId" element={<PlaceholderPage pageTitle="Collection" />} />
                  <Route path="/collections" element={<PlaceholderPage pageTitle="All Collections" />} />
                  <Route path="/product/:productId" element={<ProductDetails />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/orders" element={<PlaceholderPage pageTitle="My Orders" />} />
                  <Route path="/settings" element={<PlaceholderPage pageTitle="Settings" />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>

                {/* Support Chatbot - Available on all pages */}
                <SupportChatbot />
              </div>
            </BrowserRouter>
          </NotificationProvider>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
