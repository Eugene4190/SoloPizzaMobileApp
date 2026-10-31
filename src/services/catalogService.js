import apiService from './apiService';
import { API_ENDPOINTS } from '../config/api';

class CatalogService {
  // Get all categories
  async getCategories() {
    try {
      const response = await apiService.get(API_ENDPOINTS.CATALOG.CATEGORIES);
      return response;
    } catch (error) {
      console.error('Get categories failed:', error);
      throw error;
    }
  }

  // Get category details
  async getCategoryDetail(categoryId) {
    try {
      const response = await apiService.get(API_ENDPOINTS.CATALOG.CATEGORY_DETAIL(categoryId));
      return response;
    } catch (error) {
      console.error('Get category detail failed:', error);
      throw error;
    }
  }

  // Get products with filters
  async getProducts(filters = {}) {
    try {
      const response = await apiService.get(API_ENDPOINTS.CATALOG.PRODUCTS, filters);
      return response;
    } catch (error) {
      console.error('Get products failed:', error);
      throw error;
    }
  }

  // Get product details
  async getProductDetail(productId) {
    try {
      const response = await apiService.get(API_ENDPOINTS.CATALOG.PRODUCT_DETAIL(productId));
      return response;
    } catch (error) {
      console.error('Get product detail failed:', error);
      throw error;
    }
  }

  // Get product variants
  async getProductVariants(filters = {}) {
    try {
      const response = await apiService.get(API_ENDPOINTS.CATALOG.VARIANTS, filters);
      return response;
    } catch (error) {
      console.error('Get product variants failed:', error);
      throw error;
    }
  }

  // Get pizza sauces
  async getPizzaSauces() {
    try {
      const response = await apiService.get(API_ENDPOINTS.CATALOG.SAUCES);
      return response;
    } catch (error) {
      console.error('Get pizza sauces failed:', error);
      throw error;
    }
  }

  // Get pizza boards
  async getPizzaBoards() {
    try {
      const response = await apiService.get(API_ENDPOINTS.CATALOG.BOARDS);
      return response;
    } catch (error) {
      console.error('Get pizza boards failed:', error);
      throw error;
    }
  }

  // Get pizza addons
  // ИСПРАВЛЕНО ПРИ АУДИТЕ: ProductDetailScreen вызывает getPizzaAddons(productId),
  // но аргумент игнорировался → возвращались добавки вообще всех товаров.
  async getPizzaAddons(filters = {}) {
    try {
      const response = await apiService.get(API_ENDPOINTS.CATALOG.ADDONS, filters);
      return response;
    } catch (error) {
      console.error('Get pizza addons failed:', error);
      throw error;
    }
  }

  // Get pizza sizes
  // ИСПРАВЛЕНО ПРИ АУДИТЕ: ProductDetailScreen вызывает getPizzaSizes(productId),
  // но аргумент игнорировался.
  async getPizzaSizes(filters = {}) {
    try {
      const response = await apiService.get(API_ENDPOINTS.CATALOG.SIZES, filters);
      return response;
    } catch (error) {
      console.error('Get pizza sizes failed:', error);
      throw error;
    }
  }

  // Search products
  async searchProducts(query, filters = {}) {
    try {
      const searchParams = {
        search: query,
        ...filters,
      };
      
      const response = await apiService.get(API_ENDPOINTS.CATALOG.PRODUCTS, searchParams);
      return response;
    } catch (error) {
      console.error('Search products failed:', error);
      throw error;
    }
  }

  // Get products by category
  async getProductsByCategory(categoryId, filters = {}) {
    try {
      const searchParams = {
        category: categoryId,
        ...filters,
      };
      
      const response = await apiService.get(API_ENDPOINTS.CATALOG.PRODUCTS, searchParams);
      return response;
    } catch (error) {
      console.error('Get products by category failed:', error);
      throw error;
    }
  }

  // Get featured products
  async getFeaturedProducts() {
    try {
      const response = await apiService.get(API_ENDPOINTS.CATALOG.PRODUCTS, {
        is_featured: true,
      });
      return response;
    } catch (error) {
      console.error('Get featured products failed:', error);
      throw error;
    }
  }

  // Get popular products
  // ИСПРАВЛЕНО ПРИ АУДИТЕ: HomeScreen вызывает getPopularProducts({ limit: 6 }),
  // но аргумент игнорировался → всегда возвращалось 10 товаров.
  async getPopularProducts(params = {}) {
    try {
      const response = await apiService.get(API_ENDPOINTS.CATALOG.PRODUCTS, {
        ordering: '-popularity',
        limit: 10,
        ...params,
      });
      return response;
    } catch (error) {
      console.error('Get popular products failed:', error);
      throw error;
    }
  }
}

export default new CatalogService();