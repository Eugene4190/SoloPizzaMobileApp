import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import ProductImage from '../components/ui/ProductImage';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProducts, fetchCategories } from '../store/slices/productSlice';
import { addToCart } from '../store/slices/cartSlice';
import { catalogService, productService } from '../services';
import DemoBanner from '../components/ui/DemoBanner';
import useAppTheme from '../theme/useAppTheme';

const CatalogScreen = ({ navigation }) => {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const dispatch = useDispatch();
  const { products, categories, loading, error } = useSelector(state => state.products);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sortBy, setSortBy] = useState('name'); // name, price_asc, price_desc
  const [refreshing, setRefreshing] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      loadData(true);
    }, 500);
    
    return () => clearTimeout(delayedSearch);
  }, [selectedCategory, searchQuery, sortBy]);

  useEffect(() => {
    filterProducts();
  }, [products, selectedCategory, searchQuery, sortBy]);

  const loadData = async (reset = true) => {
    try {
      if (reset) {
        setPage(1);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }
      
      const [categoriesResponse, productsResponse] = await Promise.all([
        dispatch(fetchCategories()).unwrap(),
        productService.getProducts({
          page: reset ? 1 : page,
          category: selectedCategory?.id !== 'all' ? selectedCategory?.id : undefined,
          search: searchQuery || undefined,
          ordering: sortBy === 'price_asc' ? 'price' : sortBy === 'price_desc' ? '-price' : sortBy === 'rating' ? '-rating' : 'name',
        })
      ]);
      
      // Update products
      if (reset) {
        dispatch(fetchProducts()).unwrap();
      }
      
      // Update pagination
      if (reset) {
        setPage(2);
      } else {
        setPage(prev => prev + 1);
      }
      
      setHasMore(productsResponse?.next ? true : false);
      
      // Также можно использовать catalogService для дополнительных данных
      const additionalData = await catalogService.getProducts();
      console.log('Additional catalog data:', additionalData);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadData(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  const handleAddToCart = (product) => {
    dispatch(addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1
    }));
    Alert.alert('Успешно', `${product.name} добавлен в корзину`);
  };

  const filterProducts = () => {
    let filtered = [...products];

    // Фильтрация по поиску
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Фильтрация по категории
    if (selectedCategory) {
      filtered = filtered.filter(product => 
        product.category === selectedCategory.id || product.category_id === selectedCategory.id
      );
    }

    // Сортировка
    switch (sortBy) {
      case 'price_asc':
        filtered.sort((a, b) => (a.price || a.base_price || 0) - (b.price || b.base_price || 0));
        break;
      case 'price_desc':
        filtered.sort((a, b) => (b.price || b.base_price || 0) - (a.price || a.base_price || 0));
        break;
      case 'name':
      default:
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    setFilteredProducts(filtered);
  };

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategory?.id === item.id && styles.selectedCategory
      ]}
      onPress={() => setSelectedCategory(selectedCategory?.id === item.id ? null : item)}
    >
      <Text style={[
        styles.categoryText,
        selectedCategory?.id === item.id && styles.selectedCategoryText
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderProduct = ({ item }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
    >
      <ProductImage uri={item.image || item.main_image || item.images?.[0]?.image} style={styles.productImage} />
      {(item.is_popular || item.isPopular) && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>Популярное</Text>
        </View>
      )}
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productDescription} numberOfLines={2}>
          {item.description || item.short_description || 'Описание товара'}
        </Text>
        <View style={styles.productFooter}>
          <Text style={styles.productPrice}>{item.price || item.base_price} ₽</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleAddToCart(item)}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSortButton = (value, label) => (
    <TouchableOpacity
      style={[
        styles.sortButton,
        sortBy === value && styles.selectedSortButton
      ]}
      onPress={() => setSortBy(value)}
    >
      <Text style={[
        styles.sortButtonText,
        sortBy === value && styles.selectedSortButtonText
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#079b59" />
        <Text style={styles.loadingText}>Загрузка каталога...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Ошибка загрузки каталога</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Повторить</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DemoBanner />

      {/* Поиск */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск товаров..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#6c757d"
        />
      </View>

      {/* Категории */}
      {categories.length > 0 && (
        <View style={styles.categoriesContainer}>
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>
      )}

      {/* Сортировка */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Сортировка:</Text>
        <View style={styles.sortButtons}>
          {renderSortButton('name', 'По названию')}
          {renderSortButton('price_asc', 'Цена ↑')}
          {renderSortButton('price_desc', 'Цена ↓')}
        </View>
      </View>

      {/* Список товаров */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.productsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#079b59']}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={() => {
          if (loadingMore) {
            return (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color="#079b59" />
              </View>
            );
          }
          return null;
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Товары не найдены</Text>
            <Text style={styles.emptySubtext}>Попробуйте изменить фильтры поиска</Text>
          </View>
        }
      />
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  searchInput: {
    backgroundColor: colors.bg,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  categoriesContainer: {
    backgroundColor: 'white',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  categoriesList: {
    paddingHorizontal: 15,
  },
  categoryItem: {
    backgroundColor: colors.bg,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  selectedCategory: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  categoryText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: 'white',
  },
  sortContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  sortLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  sortButton: {
    backgroundColor: colors.bg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  selectedSortButton: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  sortButtonText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  selectedSortButtonText: {
    color: 'white',
  },
  productsList: {
    padding: 15,
  },
  productCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    margin: 5,
    shadowColor: colors.text,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  productImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 8,
    lineHeight: 16,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent,
  },
  addButton: {
    backgroundColor: colors.accent,
    width: 30,
    height: 30,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  popularBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 1,
  },
  popularText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default CatalogScreen;