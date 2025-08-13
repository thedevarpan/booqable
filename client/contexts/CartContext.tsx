import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';

export interface CartItem {
  id: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  category: string;
  quantity: number;
  rentalDates: {
    startDate: string;
    endDate: string;
    days: number;
  };
  size?: string;
  color?: string;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  totalAmount: number;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateRentalDates: (itemId: string, dates: CartItem['rentalDates']) => void;
  clearCart: () => void;
  isInCart: (itemId: string) => boolean;
  getCartItem: (itemId: string) => CartItem | undefined;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

interface CartProviderProps {
  children: React.ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  const [items, setItems] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('costume-rental-cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        setItems(parsedCart);
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
        localStorage.removeItem('costume-rental-cart');
      }
    }
  }, []);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem('costume-rental-cart', JSON.stringify(items));
  }, [items]);

  // Calculate total item count
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);

  // Calculate total amount
  const totalAmount = items.reduce((total, item) => {
    return total + (item.price * item.quantity * item.rentalDates.days);
  }, 0);

  // Add item to cart
  const addItem = (newItem: Omit<CartItem, 'quantity'>) => {
    setItems(currentItems => {
      const existingItemIndex = currentItems.findIndex(item => 
        item.id === newItem.id && 
        item.rentalDates.startDate === newItem.rentalDates.startDate &&
        item.rentalDates.endDate === newItem.rentalDates.endDate
      );

      if (existingItemIndex >= 0) {
        // Item already exists with same rental dates, increase quantity
        const updatedItems = [...currentItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + 1
        };
        toast.success('Quantity updated in cart');
        return updatedItems;
      } else {
        // Add new item
        const cartItem: CartItem = {
          ...newItem,
          quantity: 1
        };
        toast.success('Added to cart successfully!');
        return [...currentItems, cartItem];
      }
    });
  };

  // Remove item from cart
  const removeItem = (itemId: string) => {
    setItems(currentItems => {
      const updatedItems = currentItems.filter(item => item.id !== itemId);
      toast.success('Item removed from cart');
      return updatedItems;
    });
  };

  // Update item quantity
  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }

    setItems(currentItems => {
      return currentItems.map(item => 
        item.id === itemId 
          ? { ...item, quantity }
          : item
      );
    });
  };

  // Update rental dates for an item
  const updateRentalDates = (itemId: string, dates: CartItem['rentalDates']) => {
    setItems(currentItems => {
      return currentItems.map(item => 
        item.id === itemId 
          ? { ...item, rentalDates: dates }
          : item
      );
    });
  };

  // Clear entire cart
  const clearCart = () => {
    setItems([]);
    toast.success('Cart cleared');
  };

  // Check if item is in cart
  const isInCart = (itemId: string) => {
    return items.some(item => item.id === itemId);
  };

  // Get specific cart item
  const getCartItem = (itemId: string) => {
    return items.find(item => item.id === itemId);
  };

  const value: CartContextType = {
    items,
    itemCount,
    totalAmount,
    addItem,
    removeItem,
    updateQuantity,
    updateRentalDates,
    clearCart,
    isInCart,
    getCartItem,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}
