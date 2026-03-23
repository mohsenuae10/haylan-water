import React, { createContext, useContext, useReducer, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ============ Types ============

export interface CartItem {
  productId: number;
  productName: string;
  productSize: string;
  imageUrl: string;
  quantity: number;
  unitPrice: number;
}

export interface LocalUser {
  id?: number;
  name: string;
  phone: string;
  address: string;
  role: "customer" | "admin";
  isLoggedIn: boolean;
}

interface AppState {
  cart: CartItem[];
  user: LocalUser | null;
  isLoading: boolean;
}

type Action =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "ADD_TO_CART"; payload: CartItem }
  | { type: "UPDATE_QUANTITY"; payload: { productId: number; quantity: number } }
  | { type: "REMOVE_FROM_CART"; payload: number }
  | { type: "CLEAR_CART" }
  | { type: "SET_USER"; payload: LocalUser | null }
  | { type: "LOAD_STATE"; payload: Partial<AppState> };

// ============ Reducer ============

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "ADD_TO_CART": {
      const existing = state.cart.find((i) => i.productId === action.payload.productId);
      if (existing) {
        return {
          ...state,
          cart: state.cart.map((i) =>
            i.productId === action.payload.productId
              ? { ...i, quantity: i.quantity + action.payload.quantity }
              : i
          ),
        };
      }
      return { ...state, cart: [...state.cart, action.payload] };
    }
    case "UPDATE_QUANTITY":
      if (action.payload.quantity <= 0) {
        return { ...state, cart: state.cart.filter((i) => i.productId !== action.payload.productId) };
      }
      return {
        ...state,
        cart: state.cart.map((i) =>
          i.productId === action.payload.productId ? { ...i, quantity: action.payload.quantity } : i
        ),
      };
    case "REMOVE_FROM_CART":
      return { ...state, cart: state.cart.filter((i) => i.productId !== action.payload) };
    case "CLEAR_CART":
      return { ...state, cart: [] };
    case "SET_USER":
      return { ...state, user: action.payload };
    case "LOAD_STATE":
      return { ...state, ...action.payload, isLoading: false };
    default:
      return state;
  }
}

// ============ Context ============

const initialState: AppState = { cart: [], user: null, isLoading: true };

interface AppContextType {
  state: AppState;
  addToCart: (item: CartItem) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => void;
  login: (user: LocalUser) => void;
  logout: () => void;
  cartTotal: number;
  cartCount: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ============ Provider ============

const CART_KEY = "haylan_cart";
const USER_KEY = "haylan_user";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    (async () => {
      try {
        const [cartStr, userStr] = await Promise.all([
          AsyncStorage.getItem(CART_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        dispatch({
          type: "LOAD_STATE",
          payload: {
            cart: cartStr ? JSON.parse(cartStr) : [],
            user: userStr ? JSON.parse(userStr) : null,
          },
        });
      } catch {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    })();
  }, []);

  useEffect(() => {
    if (!state.isLoading) {
      AsyncStorage.setItem(CART_KEY, JSON.stringify(state.cart));
    }
  }, [state.cart, state.isLoading]);

  useEffect(() => {
    if (!state.isLoading) {
      if (state.user) {
        AsyncStorage.setItem(USER_KEY, JSON.stringify(state.user));
      } else {
        AsyncStorage.removeItem(USER_KEY);
      }
    }
  }, [state.user, state.isLoading]);

  const addToCart = useCallback((item: CartItem) => dispatch({ type: "ADD_TO_CART", payload: item }), []);
  const updateQuantity = useCallback((productId: number, quantity: number) => dispatch({ type: "UPDATE_QUANTITY", payload: { productId, quantity } }), []);
  const removeFromCart = useCallback((productId: number) => dispatch({ type: "REMOVE_FROM_CART", payload: productId }), []);
  const clearCart = useCallback(() => dispatch({ type: "CLEAR_CART" }), []);
  const login = useCallback((user: LocalUser) => dispatch({ type: "SET_USER", payload: { ...user, isLoggedIn: true } }), []);
  const logout = useCallback(() => dispatch({ type: "SET_USER", payload: null }), []);

  const cartTotal = state.cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const cartCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <AppContext.Provider value={{ state, addToCart, updateQuantity, removeFromCart, clearCart, login, logout, cartTotal, cartCount }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppStore must be used within AppProvider");
  return ctx;
}
