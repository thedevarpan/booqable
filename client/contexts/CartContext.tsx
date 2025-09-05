import React, { createContext, useContext, useReducer, ReactNode } from 'react';

export interface CartItem {
  id: string;
  name: string;
  price_per_day: number;
  image: string;
  quantity: number;
  start_date?: string;
  end_date?: string;
  rental_days?: number;
  category: string;
}

interface CartState {
  items: CartItem[];
  total: number;
  totalItems: number;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'quantity'> & { quantity?: number } }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'UPDATE_DATES'; payload: { id: string; start_date: string; end_date: string; rental_days: number } }
  | { type: 'CLEAR_CART' };

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.id === action.payload.id);
      
      if (existingItem) {
        // Update quantity if item already exists
        const updatedItems = state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: item.quantity + (action.payload.quantity || 1) }
            : item
        );
        return {
          ...state,
          items: updatedItems,
          totalItems: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
          total: updatedItems.reduce((sum, item) => sum + (item.price_per_day * item.quantity * (item.rental_days || 1)), 0)
        };
      } else {
        // Add new item
        const newItem: CartItem = {
          ...action.payload,
          quantity: action.payload.quantity || 1
        };
        const updatedItems = [...state.items, newItem];
        return {
          ...state,
          items: updatedItems,
          totalItems: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
          total: updatedItems.reduce((sum, item) => sum + (item.price_per_day * item.quantity * (item.rental_days || 1)), 0)
        };
      }
    }
    
    case 'REMOVE_ITEM': {
      const updatedItems = state.items.filter(item => item.id !== action.payload);
      return {
        ...state,
        items: updatedItems,
        totalItems: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
        total: updatedItems.reduce((sum, item) => sum + (item.price_per_day * item.quantity * (item.rental_days || 1)), 0)
      };
    }
    
    case 'UPDATE_QUANTITY': {
      const updatedItems = state.items.map(item =>
        item.id === action.payload.id
          ? { ...item, quantity: Math.max(0, action.payload.quantity) }
          : item
      ).filter(item => item.quantity > 0);
      
      return {
        ...state,
        items: updatedItems,
        totalItems: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
        total: updatedItems.reduce((sum, item) => sum + (item.price_per_day * item.quantity * (item.rental_days || 1)), 0)
      };
    }
    
    case 'UPDATE_DATES': {
      const updatedItems = state.items.map(item =>
        item.id === action.payload.id
          ? { 
              ...item, 
              start_date: action.payload.start_date,
              end_date: action.payload.end_date,
              rental_days: action.payload.rental_days
            }
          : item
      );
      
      return {
        ...state,
        items: updatedItems,
        total: updatedItems.reduce((sum, item) => sum + (item.price_per_day * item.quantity * (item.rental_days || 1)), 0)
      };
    }
    
    case 'CLEAR_CART':
      return {
        items: [],
        total: 0,
        totalItems: 0
      };
    
    default:
      return state;
  }
};

const initialState: CartState = {
  items: [],
  total: 0,
  totalItems: 0
};

interface CartContextType {
  state: CartState;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateDates: (id: string, start_date: string, end_date: string, rental_days: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const addItem = (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
  };

  const removeItem = (id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id });
  };

  const updateQuantity = (id: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  };

  const updateDates = (id: string, start_date: string, end_date: string, rental_days: number) => {
    dispatch({ type: 'UPDATE_DATES', payload: { id, start_date, end_date, rental_days } });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  return (
    <CartContext.Provider value={{
      state,
      addItem,
      removeItem,
      updateQuantity,
      updateDates,
      clearCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
