import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFeaturedProducts, fetchCategories } from '../store/slices/productSlice';
import { addToCart } from '../store/slices/cartSlice';
import { catalogService, productService, promoService } from '../services';
import DemoBanner from '../components/ui/DemoBanner';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
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
      backgroundColor: '#079b59',
    },
    {
      id: 2,
      title: 'Новинка!',
      subtitle: 'Попробуйте нашу новую пиццу "Четыре сыра"',
      backgroundColor: '#28A745',
    },
    {
      id: 3,
      title: 'Быстрая доставка',
      subtitle: 'Доставим за 30 минут или пицца бесплатно',
      backgroundColor: '#079b59',
    },
  ]);



  useEffect(() => {
    loadData();
    loadApiData();
  }, []);

  const loadApiData = async () => {
    try {
      const [categoriesData, productsData, promosData] = await Promise.all([
        catalogService.getCategories(),
        productService.getPopularProducts({ limit: 6 }),
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
          backgroundColor: promo.background_color || '#079b59',
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

  const loadData = async () => {
    try {
      await Promise.all([
        dispatch(fetchFeaturedProducts()).unwrap(),
        dispatch(fetchCategories()).unwrap()
      ]);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), loadApiData()]);
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
      <Image 
        source={{ uri: item.image || item.main_image || item.images?.[0]?.image || 'https://via.placeholder.com/150' }} 
        style={styles.productImage}
        defaultSource={{ uri: 'https://via.placeholder.com/150x150/FF6B35/FFFFFF?text=Pizza' }}
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productDescription} numberOfLines={2}>
          {item.description || item.short_description}
        </Text>
        <View style={styles.productFooter}>
          <Text style={styles.productPrice}>
            {(item.price || item.base_price)?.toFixed ? (item.price || item.base_price).toFixed(2) : (item.price || item.base_price)} ₽
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
      <Image
        source={{ uri: item.image || 'https://via.placeholder.com/80' }}
        style={styles.categoryImage}
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
          {user ? `Привет, ${user.first_name || 'Друг'}!` : 'Контур работает: правки прилетают за секунды'}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6c757d',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#079b59',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 5,
    opacity: 0.9,
  },
  bannerContainer: {
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#333333',
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
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 5,
  },
  bannerSubtitle: {
    fontSize: 16,
    color: '#ffffff',
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
    backgroundColor: '#ffffff',
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
    color: '#333',
  },
  seeAllText: {
    color: '#079b59',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
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
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  productsList: {
    paddingLeft: 5,
  },
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginRight: 15,
    width: 160,
    elevation: 3,
    shadowColor: '#333333',
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
    color: '#333',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    color: '#6c757d',
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
    color: '#079b59',
  },
  addButton: {
    backgroundColor: '#079b59',
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
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoSection: {
    marginHorizontal: 20,
    marginBottom: 30,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    elevation: 3,
    shadowColor: '#333333',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  infoItem: {
    marginBottom: 15,
  },
  infoItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  infoItemText: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
});

export default HomeScreen;