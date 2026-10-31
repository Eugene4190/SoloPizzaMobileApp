// API Configuration for SoloPizza Mobile App

// Base URL for the Django API
export const API_BASE_URL = __DEV__ 
  ? 'http://10.0.2.2:8000/api'  // Android emulator localhost
  : 'https://solo-pizza.by/api'; // Production URL

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login/',
    REGISTER: '/auth/register/',
    TOKEN_OBTAIN: '/auth/token/',
    TOKEN_REFRESH: '/auth/token/refresh/',
    TOKEN_VERIFY: '/auth/token/verify/',
    PROFILE: '/auth/profile/',
  },

  // Catalog
  CATALOG: {
    CATEGORIES: '/catalog/categories/',
    CATEGORY_DETAIL: (id) => `/catalog/categories/${id}/`,
    PRODUCTS: '/catalog/products/',
    PRODUCT_DETAIL: (id) => `/catalog/products/${id}/`,
    VARIANTS: '/catalog/variants/',
    SAUCES: '/catalog/sauces/',
    BOARDS: '/catalog/boards/',
    ADDONS: '/catalog/addons/',
    SIZES: '/catalog/sizes/',
  },

  // Cart
  CART: {
    ITEMS: '/cart/items/',
    ITEM_DETAIL: (id) => `/cart/items/${id}/`,
    SUMMARY: '/cart/summary/',
    // ↓ ДОБАВЛЕНО ПРИ АУДИТЕ: cartService.js обращался к этим ключам,
    //   но их не было → API_ENDPOINTS.CART.ADD === undefined → TypeError.
    ADD: '/cart/add/',
    UPDATE: (id) => `/cart/update/${id}/`,
    REMOVE: (id) => `/cart/remove/${id}/`,
    CLEAR: '/cart/clear/',
    PROMO: '/cart/promo/',
  },

  // Orders
  // ⚠️ ВНИМАНИЕ: в проекте было ДВЕ несовместимые группы —
  //    `ORDER` (определена) и `ORDERS` (использовалась в orderService.js,
  //    но не существовала → 18 обращений к undefined → TypeError).
  //    Оставлены обе: ORDER — для обратной совместимости, ORDERS — рабочая.
  //    После стабилизации ORDER нужно удалить и оставить только ORDERS.
  ORDER: {
    LIST: '/order/',
    DETAIL: (id) => `/order/${id}/`,
    CREATE: '/order/create/',
    STATUS: (id) => `/order/${id}/status/`,
  },

  ORDERS: {
    LIST: '/orders/',
    DETAIL: (id) => `/orders/${id}/`,
    CREATE: '/orders/create/',
    CANCEL: (id) => `/orders/${id}/cancel/`,
    STATUS: (id) => `/orders/${id}/status/`,
    STATUSES: '/orders/statuses/',
    TRACK: (id) => `/orders/${id}/track/`,
    REPEAT: (id) => `/orders/${id}/repeat/`,
    RATE: (id) => `/orders/${id}/rate/`,
    RECEIPT: (id) => `/orders/${id}/receipt/`,
    VALIDATE: '/orders/validate/',
    DELIVERY_OPTIONS: '/orders/delivery-options/',
    DELIVERY_COST: '/orders/delivery-cost/',
    DELIVERY_TIME: '/orders/delivery-time/',
    PAYMENT_METHODS: '/orders/payment-methods/',
    PAYMENT: '/orders/payment/',
  },

  // ↓ ДОБАВЛЕНО ПРИ АУДИТЕ: нужны promoService и userService
  PROMO: {
    ACTIVE: '/promo/active/',
    VALIDATE: '/promo/validate/',
  },

  USER: {
    PROFILE: '/auth/profile/',
    ADDRESSES: '/user/addresses/',
    STATS: '/user/stats/',
    CHANGE_PASSWORD: '/auth/password/change/',
    RESET_PASSWORD: '/auth/password/reset/',
  },
};

// HTTP Methods
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
};

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 10000;

// Default headers
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};