import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import ProductImage, { CATEGORY_GLYPHS } from '../components/ui/ProductImage';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFeaturedProducts, fetchCategories } from '../store/slices/productSlice';
import { addToCart } from '../store/slices/cartSlice';
import { catalogService, productService, promoService } from '../services';
import DemoBanner from '../components/ui/DemoBanner';
import useAppTheme from '../theme/useAppTheme';
import { num } from '../utils/money';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const dispatch = useDispatch();
  const { featuredProducts, categories, loading } = useSelector(state => state.products);
  const { user } = useSelector(state => state.auth);
  
  const [refreshing, setRefreshing] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [apiCategories, setApiCategories] = useState([]);
  const [apiProducts, setApiProducts] = useState([]);
  const [banners, setBanners] = useState([
    {
      id: 1,
      title: 'Скидка 20%',
      subtitle: 'На все пиццы до конца недели',
      backgroundColor: colors.accent,
    },
    {
      id: 2,
      title: 'Новинка!',
      subtitle: 'Попробуйте нашу новую пиццу "Четыре сыра"',
      backgroundColor: colors.success,
    },
    {
      id: 3,
      title: 'Быстрая доставка',
      subtitle: 'Доставим за 30 минут или пицца бесплатно',
      backgroundColor: colors.accent,
    },
  ]);



  useEffect(() => {
    loadData();
    loadApiData();
  }, []);

  const loadApiData = async (force = false) => {
    try {
      const [categoriesData, productsData, promosData] = await Promise.all([
        catalogService.getCategories({ force }),
        productService.getPopularProducts({ limit: 6, force }),
        promoService.getActivePromos(),
      ]);
      
      setApiCategories(categoriesData.results || categoriesData || []);
      setApiProducts(productsData.results || productsData || []);
      
      // Update banners with API data if available
      if (promosData && promosData.length > 0) {
        const apiBanners = promosData.map(promo => ({
          id: promo.id,
          title: promo.title,
          subtitle: promo.description || promo.subtitle,
          backgroundColor: promo.background_color || colors.accent,
        }));
        setBanners(apiBanners);
      }
    } catch (error) {
      console.error('Error loading API data:', error);
    }
  };

  useEffect(() => {
    // Автоматическая смена баннеров
    const interval = setInterval(() => {
      setBannerIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [banners.length]);

  // 02.11.2026: force=true только для pull-to-refresh — обычный монтаж экрана
  // берёт тёплый кэш каталога и не дублирует запросы (дефект №2)
  const loadData = async (force = false) => {
    try {
      await Promise.all([
        dispatch(fetchFeaturedProducts({ force })).unwrap(),
        dispatch(fetchCategories(force)).unwrap()
      ]);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(true), loadApiData(true)]);
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
  };

  const navigateToCategory = (category) => {
    navigation.navigate('Catalog', { categoryId: category.id });
  };

  const navigateToAllProducts = () => {
    navigation.navigate('Catalog');
  };

  const renderFeaturedProduct = ({ item }) => (
    <TouchableOpacity 
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
    >
      <ProductImage 
        uri={item.image || item.main_image || item.images?.[0]?.image} 
        style={styles.productImage}
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productDescription} numberOfLines={2}>
          {item.description || item.short_description}
        </Text>
        <View style={styles.productFooter}>
          <Text style={styles.productPrice}>
            {num(item.price ?? item.base_price).toFixed(2)} BYN
          </Text>
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

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => navigateToCategory(item)}
    >
      <ProductImage
        uri={item.image}
        glyph={CATEGORY_GLYPHS[item.slug] || '🍽'}
        style={styles.categoryImage}
        emojiSize={32}
      />
      <Text style={styles.categoryName}>{item.name}</Text>
    </TouchableOpacity>
  );

  if (loading && !featuredProducts?.length && !categories?.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#079b59" />
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <DemoBanner />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SoloPizza</Text>
        <Text style={styles.headerSubtitle}>
          {user ? `Привет, ${user.first_name || 'Друг'}!` : 'Лучшая пицца в городе'}
        </Text>
      </View>

      {/* Banner Carousel */}
      <View style={styles.bannerContainer}>
        <View style={[styles.banner, { backgroundColor: banners[bannerIndex].backgroundColor }]}>
          <Text style={styles.bannerTitle}>{banners[bannerIndex].title}</Text>
          <Text style={styles.bannerSubtitle}>{banners[bannerIndex].subtitle}</Text>
        </View>
        <View style={styles.bannerIndicators}>
          {banners.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                { opacity: index === bannerIndex ? 1 : 0.3 }
              ]}
            />
          ))}
        </View>
      </View>

      {/* Categories Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Категории</Text>
          <TouchableOpacity onPress={navigateToAllProducts}>
            <Text style={styles.seeAllText}>Все товары</Text>
          </TouchableOpacity>
        </View>
        
        {(apiCategories?.length > 0 ? apiCategories : categories)?.length > 0 ? (
          <FlatList
            data={apiCategories?.length > 0 ? apiCategories : categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        ) : (
          <Text style={styles.emptyText}>Категории не найдены</Text>
        )}
      </View>

      {/* Featured Products Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Рекомендуемые</Text>
          <TouchableOpacity onPress={navigateToAllProducts}>
            <Text style={styles.seeAllText}>Все</Text>
          </TouchableOpacity>
        </View>
        
        {(apiProducts?.length > 0 ? apiProducts : featuredProducts)?.length > 0 ? (
          <FlatList
            data={(apiProducts?.length > 0 ? apiProducts : featuredProducts).slice(0, 6)}
            renderItem={renderFeaturedProduct}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productsList}
          />
        ) : (
          <Text style={styles.emptyText}>Товары не найдены</Text>
        )}
      </View>

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Почему выбирают нас?</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoItemTitle}>🍕 Свежие ингредиенты</Text>
          <Text style={styles.infoItemText}>Используем только качественные продукты</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoItemTitle}>🚚 Быстрая доставка</Text>
          <Text style={styles.infoItemText}>Доставим горячую пиццу за 30 минут</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoItemTitle}>💰 Выгодные цены</Text>
          <Text style={styles.infoItemText}>Лучшие цены в городе</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingContainer: {
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: colors.accent,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.buttonText,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.buttonText,
    textAlign: 'center',
    marginTop: 5,
    opacity: 0.9,
  },
  bannerContainer: {
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  banner: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.buttonText,
    textAlign: 'center',
    marginBottom: 5,
  },
  bannerSubtitle: {
    fontSize: 16,
    color: colors.buttonText,
    textAlign: 'center',
  },
  bannerIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.cardBg,
    marginHorizontal: 4,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  seeAllText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  categoriesList: {
    paddingLeft: 5,
  },
  categoryCard: {
    alignItems: 'center',
    marginRight: 15,
    width: 80,
  },
  categoryImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.cardBg,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  productsList: {
    paddingLeft: 5,
  },
  productCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    marginRight: 15,
    width: 160,
    elevation: 3,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  productImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
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
    fontWeight: 'bold',
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
  promoImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  promoDiscount: {
    color: colors.buttonText,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  addButtonText: {
    color: colors.buttonText,
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoSection: {
    marginHorizontal: 20,
    marginBottom: 30,
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    padding: 20,
    elevation: 3,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  infoItem: {
    marginBottom: 15,
  },
  infoItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 5,
  },
  infoItemText: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
});

export default HomeScreen;