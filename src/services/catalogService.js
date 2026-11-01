/**
 * CatalogService — клиент РЕАЛЬНОГО контракта бэкенда.
 *
 * Переписан 01.11.2026 по коду сайта (Xumpocmb/SoloPizza, приложение app_api):
 *   GET /api/v1/meta/                          → { currency, timezone, default_branch_id, languages }
 *   GET /api/v1/branches/                      → [{ id, name, address, phones[] }]
 *   GET /api/v1/categories/?branch_id=N        → [{ id, slug, name, image, product_count }]
 *   GET /api/v1/categories/<slug>/?branch_id=N → категория + products[]
 *   GET /api/v1/products/?branch_id=N&category=<slug>
 *                                              → [{ id, slug, name, description, image,
 *                                                   min_price, is_weekly_special, is_spicy,
 *                                                   is_sweet, is_combo }]
 *   GET /api/v1/products/<slug>/?branch_id=N   → товар + variants[]/sauces[]/drinks[]
 *
 * Важные факты контракта (app_api/views.py, filters.py, serializers.py):
 *  - branch_id — ОБЯЗАТЕЛЬНЫЙ query-параметр всех эндпоинтов, кроме meta/branches;
 *  - пагинации нет: ListAPIView отдаёт plain-массив (в settings нет pagination);
 *  - алкоголь и неактивные позиции отфильтрованы НА СЕРВЕРЕ;
 *  - отдельных эндпоинтов для размеров/соусов/бортов/добавок НЕТ —
 *    они вложены в карточку товара (variants[].boards / variants[].addons / sauces / drinks);
 *  - серверного поиска НЕТ — поиск фильтруется на клиенте по загруженному списку.
 *
 * UI-совместимость: экраны исторически читают `product.price`, а контракт даёт
 * `min_price`. Нормализация в одном месте — uiProduct(): добавляет price-алиас,
 * не удаля контрактные поля. Убрать алиас можно вместе с рефакторингом экранов.
 */

import apiService from './apiService';
import { API_ENDPOINTS, USE_DEMO_FALLBACK } from '../config/api';
import { resolveDemo } from './demoCatalog';

function uiProduct(product) {
  if (!product || typeof product !== 'object') return product;
  return {
    ...product,
    price: product.min_price ?? product.price ?? null,
  };
}

class CatalogService {
  constructor() {
    this.branchId = null;
    this._demo = false;
    this._categoriesCache = null;
    this._productsCache = null;
    this._cacheBranchId = null;
  }

  /** true, если данные сейчас из демо-набора (API недоступен). */
  isDemoActive() {
    return this._demo;
  }

  getBranchId() {
    return this.branchId;
  }

  setBranchId(branchId) {
    if (this.branchId !== branchId) {
      this.branchId = branchId;
      this._productsCache = null;
      this._cacheBranchId = null;
    }
  }

  /**
   * Единая точка запроса: при сетевой ошибке/404 и включённом USE_DEMO_FALLBACK
   * отдаёт демо-данные той же формы и помечает сервис демо-режимом.
   */
  async _request(path, params = {}, slugParam = null) {
    try {
      // 5 секунд вместо общих 10: демо-режим включается быстрее,
      // silent: пока API не задеплоен, ожидаемые сбои не светят красными тостами
      return await apiService.get(path, params, {
        timeout: 5000,
        silent: USE_DEMO_FALLBACK,
      });
    } catch (error) {
      if (!USE_DEMO_FALLBACK) throw error;
      this._demo = true;
      const demo = resolveDemo(path, params, slugParam);
      if (demo === null) throw error;
      return demo;
    }
  }

  async getMeta() {
    return this._request(API_ENDPOINTS.CATALOG.META);
  }

  async getBranches() {
    return this._request(API_ENDPOINTS.CATALOG.BRANCHES);
  }

  /** branch_id из meta.default_branch_id; дёшево, кэшируется. */
  async ensureBranchId() {
    if (this.branchId !== null) return this.branchId;
    const meta = await this.getMeta();
    this.branchId = meta?.default_branch_id ?? null;
    return this.branchId;
  }

  async getCategories() {
    const branchId = await this.ensureBranchId();
    const categories = await this._request(API_ENDPOINTS.CATALOG.CATEGORIES, { branch_id: branchId });
    this._categoriesCache = Array.isArray(categories) ? categories : [];
    return this._categoriesCache;
  }

  async getCategoryDetail(slug) {
    const branchId = await this.ensureBranchId();
    const detail = await this._request(
      API_ENDPOINTS.CATALOG.CATEGORY_DETAIL(slug),
      { branch_id: branchId },
      slug,
    );
    if (detail && Array.isArray(detail.products)) {
      return { ...detail, products: detail.products.map(uiProduct) };
    }
    return detail;
  }

  /** category в фильтрах принимается и как slug, и как id (экраны шлют id). */
  async getProducts(filters = {}) {
    const branchId = await this.ensureBranchId();
    const params = { branch_id: branchId };

    const { category, search } = filters || {};
    if (category !== undefined && category !== null && category !== '') {
      params.category = this._categorySlug(category);
    }

    // Серверного поиска нет: список тянем с серверным фильтром категории,
    // а строку поиска фильтруем локально по name/description.
    const products = await this._request(API_ENDPOINTS.CATALOG.PRODUCTS, params);

    let items = Array.isArray(products) ? products : [];
    if (search !== undefined && search !== null && search !== '') {
      const q = String(search).toLowerCase();
      items = items.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q),
      );
    }

    this._productsCache = items;
    this._cacheBranchId = branchId;
    return items.map(uiProduct);
  }

  async getProductsByCategory(category, filters = {}) {
    return this.getProducts({ ...filters, category });
  }

  async getProductDetail(idOrSlug) {
    const branchId = await this.ensureBranchId();
    const slug = await this._productSlug(idOrSlug);
    const detail = await this._request(
      API_ENDPOINTS.CATALOG.PRODUCT_DETAIL(slug),
      { branch_id: branchId },
      slug,
    );
    return uiProduct(detail);
  }

  /** Варианты товара (размер/объём + цена + борты + добавки). */
  async getProductVariants(idOrSlug) {
    const detail = await this.getProductDetail(idOrSlug);
    return detail?.variants ?? [];
  }

  /** Размеры товара = его варианты (отдельного эндпоинта размеров в app_api нет). */
  async getPizzaSizes(idOrSlug) {
    return this.getProductVariants(idOrSlug);
  }

  /** Добавки товара: объединение addons по всем вариантам, без дублей по id. */
  async getPizzaAddons(idOrSlug) {
    const variants = await this.getProductVariants(idOrSlug);
    const byId = new Map();
    variants.forEach((variant) => {
      (variant.addons || []).forEach((addon) => byId.set(addon.id, addon));
    });
    return Array.from(byId.values());
  }

  /** Борты товара: объединение boards по всем вариантам, без дублей по id. */
  async getPizzaBoards(idOrSlug) {
    const variants = await this.getProductVariants(idOrSlug);
    const byId = new Map();
    variants.forEach((variant) => {
      (variant.boards || []).forEach((board) => byId.set(board.id, board));
    });
    return Array.from(byId.values());
  }

  /** Соусы основы товара (вложены в карточку, отдельного эндпоинта нет). */
  async getPizzaSauces(idOrSlug) {
    const detail = await this.getProductDetail(idOrSlug);
    return detail?.sauces ?? [];
  }

  /** Напитки комбо (вложены в карточку). */
  async getComboDrinks(idOrSlug) {
    const detail = await this.getProductDetail(idOrSlug);
    return detail?.drinks ?? [];
  }

  /**
   * «Популярное» для главного экрана: серверного ordering по популярности нет,
      контракт даёт флаг акции is_weekly_special — он и есть витрина.
   */
  async getPopularProducts(params = {}) {
    const { limit = 6 } = params || {};
    const products = await this.getFeaturedProducts();
    return products.slice(0, limit);
  }

  async getFeaturedProducts() {
    const products = await this.getProducts();
    const weekly = products.filter((p) => p.is_weekly_special);
    const pool = weekly.length > 0 ? weekly : products;
    return pool;
  }

  async searchProducts(query, filters = {}) {
    return this.getProducts({ ...filters, search: query });
  }

  // ── внутренние хелперы ────────────────────────────────────────

  _categorySlug(category) {
    if (typeof category === 'string' && Number.isNaN(Number(category))) return category;
    const found = (this._categoriesCache || []).find(
      (c) => String(c.id) === String(category),
    );
    return found ? found.slug : String(category);
  }

  async _productSlug(idOrSlug) {
    if (typeof idOrSlug === 'string' && Number.isNaN(Number(idOrSlug))) return idOrSlug;
    if (this._cacheBranchId !== this.branchId || !this._productsCache) {
      await this.getProducts();
    }
    const found = (this._productsCache || []).find((p) => String(p.id) === String(idOrSlug));
    return found ? found.slug : String(idOrSlug);
  }
}

export default new CatalogService();
