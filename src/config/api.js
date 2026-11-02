// API Configuration for SoloPizza Mobile App

// Base URL for the Django API
// 03.11.2026: убрана ветка __DEV__ с 10.0.2.2 — это адрес ЭМУЛЯТОРА Android,
// на живом телефоне и на iPhone он не существует, из-за чего debug-сборки
// стучались в никуда и падали в демо-режим. Боевой адрес один для всех сборок;
// локальный бэкенд друга не используется, его сервер в интернете.
export const API_BASE_URL = 'https://solo-pizza.by/api/v1'; // Production URL

// ДЕМО-РЕЖИМ. На 01.11.2026 app_api существует ТОЛЬКО в коде сайта, на боевом
// solo-pizza.by все /api/v1/* отвечают 404 (друг ещё не задеплоил).
// Пока true: при сетевой ошибке/404 каталог подставляет демо-данные ТОЙ ЖЕ ФОРМЫ,
// что и реальный API, и приложение помечает экраны баннером «демо-данные».
// Как только друг задеплоит app_api — поставить false и удалить demoCatalog.js.
export const USE_DEMO_FALLBACK = true;

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  // ⚠️ НЕ ЗАДЕПЛОЕНО: в app_api пока нет эндпоинтов авторизации (на сайте — allauth,
  // сессии). Пути ниже — заглушки по plan.txt; сверим с фактом, когда друг допишет.
  AUTH: {
    LOGIN: '/auth/login/',
    REGISTER: '/auth/register/',
    TOKEN_OBTAIN: '/auth/token/',
    TOKEN_REFRESH: '/auth/token/refresh/',
    TOKEN_VERIFY: '/auth/token/verify/',
    PROFILE: '/auth/profile/',
  },

  // Catalog
  // ЕДИНСТВЕННАЯ группа, чьи пути совпадают с кодом сайта (Xumpocmb/SoloPizza, app_api).
  // Источник истины: app_api/urls.py + serializers.py, снято 01.11.2026.
  // Ответы DRF без пагинации (plain-массивы). branch_id обязателен для всех,
  // кроме META и BRANCHES. Алкоголь отфильтрован на сервере (filters.py).
  CATALOG: {
    META: '/meta/',
    BRANCHES: '/branches/',
    CATEGORIES: '/categories/',
    CATEGORY_DETAIL: (slug) => `/categories/${slug}/`,
    PRODUCTS: '/products/',
    PRODUCT_DETAIL: (slug) => `/products/${slug}/`,
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