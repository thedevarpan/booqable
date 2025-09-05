import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthContext } from './AuthContext';

interface WishlistItem {
  id: string;
  product_id: string;
  product_name: string;
  price_per_day: number;
  image_url: string;
  category: string;
  added_date: string;
  is_available: boolean;
}

interface WishlistContextType {
  items: WishlistItem[];
  loading: boolean;
  error: string | null;
  itemCount: number;
  totalValue: number;
  addToWishlist: (productId: string, productName: string, pricePerDay: number, imageUrl: string, category: string) => Promise<boolean>;
  removeFromWishlist: (productId: string) => Promise<boolean>;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => Promise<boolean>;
  refreshWishlist: () => Promise<void>;
  getWishlistSummary: () => {
    itemCount: number;
    totalValue: number;
    categories: string[];
    recentlyAdded: WishlistItem[];
  };
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  // Use AuthContext directly to avoid throwing if WishlistProvider mounts outside AuthProvider
  const authCtx = useContext(AuthContext) as any | undefined;
  const currentUser = authCtx?.currentUser ?? null;
  const authLoading = authCtx?.loading ?? false;
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate derived values (guard against bad shapes)
  const safeItems = Array.isArray(items) ? items : [];
  const itemCount = safeItems.length;
  const totalValue = safeItems.reduce((sum, item) => sum + item.price_per_day, 0);

  // Load wishlist when user changes
  useEffect(() => {
    if (!authLoading) {
      if (currentUser) {
        refreshWishlist();
      } else {
        setItems([]);
        setError(null);
      }
    }
  }, [currentUser, authLoading]);

  // Refresh wishlist from API
  const refreshWishlist = async (): Promise<void> => {
    if (!currentUser) {
      setItems([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/user/wishlist', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const serverItems = Array.isArray(result.data) ? result.data : Array.isArray(result.data?.items) ? result.data.items : [];
        setItems(serverItems);
      } else {
        throw new Error(result.error || 'Failed to load wishlist');
      }
    } catch (err) {
      console.error('Error loading wishlist:', err);
      setError(err instanceof Error ? err.message : 'Failed to load wishlist');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Add item to wishlist
  const addToWishlist = async (
    productId: string,
    productName: string,
    pricePerDay: number,
    imageUrl: string,
    category: string
  ): Promise<boolean> => {
    if (!currentUser) {
      setError('Please log in to add items to your wishlist');
      return false;
    }

    if (isInWishlist(productId)) {
      setError('Item is already in your wishlist');
      return false;
    }

    setError(null);

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/user/wishlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: productId,
          product_name: productName,
          price_per_day: pricePerDay,
          image_url: imageUrl,
          category: category,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Add item to local state immediately for better UX
        const newItem: WishlistItem = {
          id: `temp-${Date.now()}`, // Temporary ID
          product_id: productId,
          product_name: productName,
          price_per_day: pricePerDay,
          image_url: imageUrl,
          category: category,
          added_date: new Date().toISOString(),
          is_available: true,
        };
        setItems(prev => [newItem, ...prev]);

        // Refresh to get accurate data from server
        setTimeout(() => refreshWishlist(), 100);

        return true;
      } else {
        throw new Error(result.error || 'Failed to add to wishlist');
      }
    } catch (err) {
      console.error('Error adding to wishlist:', err);
      setError(err instanceof Error ? err.message : 'Failed to add to wishlist');
      return false;
    }
  };

  // Remove item from wishlist
  const removeFromWishlist = async (productId: string): Promise<boolean> => {
    if (!currentUser) {
      setError('Please log in to manage your wishlist');
      return false;
    }

    setError(null);

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/user/wishlist/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Remove item from local state immediately
        setItems(prev => prev.filter(item => item.product_id !== productId));
        return true;
      } else {
        throw new Error(result.error || 'Failed to remove from wishlist');
      }
    } catch (err) {
      console.error('Error removing from wishlist:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove from wishlist');
      return false;
    }
  };

  // Check if item is in wishlist
  const isInWishlist = (productId: string): boolean => {
    return items.some(item => item.product_id === productId);
  };

  // Clear entire wishlist
  const clearWishlist = async (): Promise<boolean> => {
    if (!currentUser) {
      setError('Please log in to manage your wishlist');
      return false;
    }

    setError(null);

    try {
      // Remove items one by one (could be optimized with bulk endpoint)
      const promises = items.map(item => removeFromWishlist(item.product_id));
      const results = await Promise.all(promises);
      
      return results.every(result => result);
    } catch (err) {
      console.error('Error clearing wishlist:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear wishlist');
      return false;
    }
  };

  // Get wishlist summary with analytics
  const getWishlistSummary = () => {
    const categories = [...new Set(items.map(item => item.category))];
    const recentlyAdded = items
      .sort((a, b) => new Date(b.added_date).getTime() - new Date(a.added_date).getTime())
      .slice(0, 3);

    return {
      itemCount,
      totalValue,
      categories,
      recentlyAdded,
    };
  };

  const value: WishlistContextType = {
    items,
    loading,
    error,
    itemCount,
    totalValue,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    clearWishlist,
    refreshWishlist,
    getWishlistSummary,
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
