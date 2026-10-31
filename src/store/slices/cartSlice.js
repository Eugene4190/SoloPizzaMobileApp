import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';
const CART_STORAGE_KEY = 'cart_items';

// Асинхронные действия
export const addToCart = createAsyncThunk(
  'cart/addToCart',
  async ({ productId, quantity = 1, options = {} }, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      
      if (auth.isAuthenticated) {
        // Если пользователь авторизован, отправляем на сервер
        const response = await axios.post(
          `${API_BASE_URL}/cart/add/`,
          {
            product_id: productId,
            quantity,
            options,
          },
          {
            headers: {
              Authorization: `Bearer ${auth.accessToken}`,
            },
          }
        );
        return response.data;
      } else {
        // Если не авторизован, сохраняем локально
        const cartItems = await AsyncStorage.getItem(CART_STORAGE_KEY);
        const items = cartItems ? JSON.parse(cartItems) : [];
        
        const existingItemIndex = items.findIndex(
          item => item.productId === productId && 
          JSON.stringify(item.options) === JSON.stringify(options)
        );
        
        if (existingItemIndex >= 0) {
          items[existingItemIndex].quantity += quantity;
        } else {
          items.push({
            id: Date.now().toString(),
            productId,
            quantity,
            options,
            addedAt: new Date().toISOString(),
          });
        }
        
        await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
        return { items };
      }
    } catch (error) {
      return rejectWithValue('Ошибка добавления в корзину');
    }
  }
);

export const removeFromCart = createAsyncThunk(
  'cart/removeFromCart',
  async (itemId, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      
      if (auth.isAuthenticated) {
        await axios.delete(`${API_BASE_URL}/cart/remove/${itemId}/`, {
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
          },
        });
        return { itemId };
      } else {
        const cartItems = await AsyncStorage.getItem(CART_STORAGE_KEY);
        const items = cartItems ? JSON.parse(cartItems) : [];
        const filteredItems = items.filter(item => item.id !== itemId);
        
        await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(filteredItems));
        return { items: filteredItems };
      }
    } catch (error) {
      return rejectWithValue('Ошибка удаления из корзины');
    }
  }
);

export const updateCartItemQuantity = createAsyncThunk(
  'cart/updateCartItemQuantity',
  async ({ itemId, quantity }, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      
      if (auth.isAuthenticated) {
        const response = await axios.patch(
          `${API_BASE_URL}/cart/update/${itemId}/`,
          { quantity },
          {
            headers: {
              Authorization: `Bearer ${auth.accessToken}`,
            },
          }
        );
        return response.data;
      } else {
        const cartItems = await AsyncStorage.getItem(CART_STORAGE_KEY);
        const items = cartItems ? JSON.parse(cartItems) : [];
        
        const itemIndex = items.findIndex(item => item.id === itemId);
        if (itemIndex >= 0) {
          if (quantity <= 0) {
            items.splice(itemIndex, 1);
          } else {
            items[itemIndex].quantity = quantity;
          }
        }
        
        await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
        return { items };
      }
    } catch (error) {
      return rejectWithValue('Ошибка обновления количества');
    }
  }
);

export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      
      if (auth.isAuthenticated) {
        const response = await axios.get(`${API_BASE_URL}/cart/`, {
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
          },
        });
        return response.data;
      } else {
        const cartItems = await AsyncStorage.getItem(CART_STORAGE_KEY);
        const items = cartItems ? JSON.parse(cartItems) : [];
        return { items, total: 0 };
      }
    } catch (error) {
      return rejectWithValue('Ошибка загрузки корзины');
    }
  }
);

export const clearCart = createAsyncThunk(
  'cart/clearCart',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { auth } = getState();
      
      if (auth.isAuthenticated) {
        await axios.delete(`${API_BASE_URL}/cart/clear/`, {
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
          },
        });
      }
      
      await AsyncStorage.removeItem(CART_STORAGE_KEY);
      return {};
    } catch (error) {
      return rejectWithValue('Ошибка очистки корзины');
    }
  }
);

const initialState = {
  items: [],
  total: 0,
  itemsCount: 0,
  isLoading: false,
  error: null,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Add to Cart
      .addCase(addToCart.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.items) {
          state.items = action.payload.items;
          state.itemsCount = action.payload.items.length;
        }
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Remove from Cart
      .addCase(removeFromCart.fulfilled, (state, action) => {
        if (action.payload.items) {
          state.items = action.payload.items;
          state.itemsCount = action.payload.items.length;
        } else {
          state.items = state.items.filter(item => item.id !== action.payload.itemId);
          state.itemsCount = state.items.length;
        }
      })
      .addCase(removeFromCart.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Update Cart Item Quantity
      .addCase(updateCartItemQuantity.fulfilled, (state, action) => {
        if (action.payload.items) {
          state.items = action.payload.items;
          state.itemsCount = action.payload.items.length;
        }
      })
      .addCase(updateCartItemQuantity.rejected, (state, action) => {
        state.error = action.payload;
      })
      
      // Fetch Cart
      .addCase(fetchCart.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.items || [];
        state.total = action.payload.total || 0;
        state.itemsCount = (action.payload.items || []).length;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Clear Cart
      .addCase(clearCart.fulfilled, (state) => {
        state.items = [];
        state.total = 0;
        state.itemsCount = 0;
      })
      .addCase(clearCart.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearError } = cartSlice.actions;
export default cartSlice.reducer;