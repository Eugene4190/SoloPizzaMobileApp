import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// ИСПРАВЛЕНО ПРИ АУДИТЕ: прямой импорт react-native-vector-icons в v10.x
// не тянет шрифт — иконки рендерились пустыми квадратами.
import Icon from '../components/ui/Icon';
import { cartService } from '../services';
import { useDispatch, useSelector } from 'react-redux';
import {
  updateCartItemQuantity,
  removeFromCart,
  clearCart,
} from '../store/slices/cartSlice';

const CartScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { items } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);
  
  const [refreshing, setRefreshing] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState([]);
  const [cartSummary, setCartSummary] = useState({ total: 0, discount: 0, delivery: 0 });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      setLoading(true);
      const [cartData, summaryData] = await Promise.all([
        cartService.getCart(),
        cartService.getCartSummary(),
      ]);
      
      setCartItems(cartData.items || []);
      setCartSummary(summaryData || { total: 0, discount: 0, delivery: 0 });
    } catch (error) {
      console.error('Error loading cart:', error);
      // Fallback to local cart
      const localCart = await cartService.getLocalCart();
      setCartItems(localCart.items || []);
      setCartSummary({ total: localCart.total || 0, discount: 0, delivery: 0 });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    if (cartSummary.total) {
      return cartSummary;
    }
    
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = promoApplied ? subtotal * 0.1 : 0;
    const delivery = subtotal > 500 ? 0 : 150;
    const total = subtotal - discount + delivery;
    
    return {
      subtotal,
      discount,
      delivery,
      total,
    };
  };

  // Вычисляем общую сумму и количество товаров
  const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity === 0) {
      removeItem(itemId);
      return;
    }
    
    try {
      setUpdating(true);
      await cartService.updateCartItem(itemId, { quantity: newQuantity });
      await loadCart(); // Reload cart to get updated data
    } catch (error) {
      console.error('Error updating quantity:', error);
      // Update locally as fallback
      setCartItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleQuantityChange = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId);
    } else {
      dispatch(updateCartItemQuantity({ itemId, quantity: newQuantity }));
    }
  };

  const removeItem = (itemId) => {
    Alert.alert(
      'Удалить товар',
      'Вы уверены, что хотите удалить этот товар из корзины?',
      [
        { text: 'Отмена', style: 'cancel' },
        { 
          text: 'Удалить', 
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdating(true);
              await cartService.removeFromCart(itemId);
              await loadCart();
            } catch (error) {
              console.error('Error removing item:', error);
              // Remove locally as fallback
              setCartItems(prevItems => prevItems.filter(item => item.id !== itemId));
            } finally {
              setUpdating(false);
            }
          }
        },
      ]
    );
  };

  const handleRemoveItem = (itemId) => {
    Alert.alert(
      'Удалить товар',
      'Вы уверены, что хотите удалить этот товар из корзины?',
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            dispatch(removeFromCart(itemId));
          },
        },
      ]
    );
  };

  const handleClearCart = () => {
    Alert.alert(
      'Очистить корзину',
      'Вы уверены, что хотите удалить все товары из корзины?',
      [
        {
          text: 'Отмена',
          style: 'cancel',
        },
        {
          text: 'Очистить',
          style: 'destructive',
          onPress: () => {
            dispatch(clearCart());
          },
        },
      ]
    );
  };

  const handleCheckout = () => {
    if (!user) {
      Alert.alert(
        'Требуется авторизация',
        'Для оформления заказа необходимо войти в аккаунт',
        [
          {
            text: 'Отмена',
            style: 'cancel',
          },
          {
            text: 'Войти',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
      return;
    }

    if (items.length === 0) {
      Alert.alert('Пустая корзина', 'Добавьте товары в корзину для оформления заказа');
      return;
    }

    navigation.navigate('Checkout');
  };

  const applyPromoCode = async () => {
    if (promoCode.trim() === '') {
      Alert.alert('Ошибка', 'Введите промокод');
      return;
    }
    
    try {
      setUpdating(true);
      await cartService.applyPromoCode(promoCode.trim());
      setPromoApplied(true);
      await loadCart(); // Reload to get updated totals
      Alert.alert('Успех', 'Промокод применен!');
    } catch (error) {
      console.error('Error applying promo code:', error);
      Alert.alert('Ошибка', 'Неверный промокод или промокод уже использован');
    } finally {
      setUpdating(false);
    }
  };

  const removePromoCode = async () => {
    try {
      setUpdating(true);
      await cartService.removePromoCode();
      setPromoApplied(false);
      setPromoCode('');
      await loadCart();
    } catch (error) {
      console.error('Error removing promo code:', error);
      // Remove locally as fallback
      setPromoApplied(false);
      setPromoCode('');
    } finally {
      setUpdating(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    // Имитируем обновление
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const renderCartItem = ({ item }) => {
    const itemTotal = (item.price * item.quantity).toFixed(2);

    return (
      <View style={styles.cartItem}>
        <Image
          source={{
            uri: item.image || item.product?.main_image || 'https://via.placeholder.com/80x80/FF6B35/FFFFFF?text=' + (item.name?.charAt(0) || 'P'),
          }}
          style={styles.itemImage}
          resizeMode="cover"
        />
        
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={2}>
            {item.name || item.product?.name || 'Товар'}
          </Text>
          
          {/* Размер */}
          {item.size && (
            <Text style={styles.itemOption}>
              Размер: {item.size.name} ({item.size.size})
            </Text>
          )}
          
          {/* Добавки */}
          {item.toppings && item.toppings.length > 0 && (
            <Text style={styles.itemOption}>
              Добавки: {item.toppings.map(topping => topping.name).join(', ')}
            </Text>
          )}
          
          <View style={styles.itemFooter}>
            <Text style={styles.itemPrice}>{(item.price || item.total_price).toFixed(2)} BYN за шт.</Text>
            <Text style={styles.itemTotal}>Итого: {itemTotal} BYN</Text>
          </View>
        </View>
        
        <View style={styles.quantityControls}>
          <TouchableOpacity
            style={[styles.quantityButton, updating && styles.quantityButtonDisabled]}
            onPress={() => updateQuantity(item.id, item.quantity - 1)}
            disabled={updating}
          >
            <Text style={styles.quantityButtonText}>-</Text>
          </TouchableOpacity>
          
          <Text style={styles.quantityText}>{item.quantity}</Text>
          
          <TouchableOpacity
            style={[styles.quantityButton, updating && styles.quantityButtonDisabled]}
            onPress={() => updateQuantity(item.id, item.quantity + 1)}
            disabled={updating}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.removeButton, updating && styles.removeButtonDisabled]}
            onPress={() => removeItem(item.id)}
            disabled={updating}
          >
            <Text style={styles.removeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyCart = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🛒</Text>
      <Text style={styles.emptyTitle}>Корзина пуста</Text>
      <Text style={styles.emptyText}>
        Добавьте товары из каталога, чтобы оформить заказ
      </Text>
      <TouchableOpacity
        style={styles.shopButton}
        onPress={() => navigation.navigate('Catalog')}
      >
        <Text style={styles.shopButtonText}>Перейти к покупкам</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCartSummary = () => (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Товаров:</Text>
        <Text style={styles.summaryValue}>{totalItems} шт.</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Сумма:</Text>
        <Text style={styles.summaryValue}>{totalAmount.toFixed(2)} BYN</Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryRow}>
        <Text style={styles.totalLabel}>Итого к оплате:</Text>
        <Text style={styles.totalValue}>{totalAmount.toFixed(2)} BYN</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Заголовок */}
      <View style={styles.header}>
        <Text style={styles.title}>Корзина</Text>
        {items.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearCart}
          >
            <Text style={styles.clearButtonText}>Очистить</Text>
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 ? (
        renderEmptyCart()
      ) : (
        <>
          {/* Список товаров */}
          <FlatList
            data={items}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.cartList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#FF6B35']}
              />
            }
            ListFooterComponent={renderCartSummary}
          />

          {/* Нижняя панель с кнопкой оформления */}
          <View style={styles.bottomPanel}>
            <View style={styles.totalContainer}>
              <Text style={styles.bottomTotalLabel}>Итого:</Text>
              <Text style={styles.bottomTotalValue}>
                {totalAmount.toFixed(2)} BYN
              </Text>
            </View>
            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={handleCheckout}
            >
              <Text style={styles.checkoutButtonText}>
                Оформить заказ
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FF6B35',
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  clearButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cartList: {
    paddingBottom: 24,
  },
  cartItem: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  itemImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    lineHeight: 22,
  },
  itemOption: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  itemFooter: {
    marginTop: 8,
  },
  itemPrice: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  itemTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B35',
    marginTop: 4,
  },
  quantityControls: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 12,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  quantityButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginVertical: 10,
    minWidth: 30,
    textAlign: 'center',
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FF6B35',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 100,
    color: '#D1D5DB',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    fontWeight: '500',
  },
  continueButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bottomPanel: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  bottomTotalLabel: {
    fontSize: 18,
    color: '#2C3E50',
  },
  bottomTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  checkoutButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default CartScreen;