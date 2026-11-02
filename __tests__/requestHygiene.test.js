/**
 * Гигиена запросов каталога (02.11.2026).
 * Регрессии дефектов №2 и №3 из памяти агента:
 *  - одновременный бутстрап не должен стрелять /meta/ несколько раз;
 *  - повторный монтаж экрана (навигация) в пределах TTL не дёргает сеть;
 *  - pull-to-refresh (force) обязан обойти кэш;
 *  - демо-ответы не кэшируются: оживший сервер виден сразу;
 *  - пока PROMOS_ENABLED=false, промо не стучится в несуществующий эндпоинт.
 */

jest.mock('../src/services/apiService', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

import apiService from '../src/services/apiService';
import catalogService from '../src/services/catalogService';
import promoService from '../src/services/promoService';
import { PROMOS_ENABLED } from '../src/config/api';

const META = { currency: 'BYN', timezone: 'Europe/Minsk', default_branch_id: 1, languages: ['ru', 'en'] };
const CATEGORIES = [{ id: 1, slug: 'picca', name: 'Пиццы', product_count: 2 }];
const PRODUCTS = [
  { id: 6, slug: 'antaliya', name: 'Анталия', min_price: '12.50', is_weekly_special: false },
];
const BRANCHES = [{ id: 1, name: 'Центральная', address: 'пр-т 1', phones: ['+375 17 111-11-11'] }];

const callsTo = (path) => apiService.get.mock.calls.filter(([p]) => p === path).length;

beforeEach(() => {
  apiService.get.mockReset();
  apiService.get.mockImplementation((path) => {
    if (path === '/meta/') return Promise.resolve(META);
    if (path === '/branches/') return Promise.resolve(BRANCHES);
    if (path === '/categories/') return Promise.resolve(CATEGORIES);
    if (path === '/products/') return Promise.resolve(PRODUCTS);
    return Promise.reject(new Error('HTTP 404'));
  });
  catalogService.setBranchId(null);
  catalogService.invalidate();
});

describe('дефект №2: дубли запросов каталога', () => {
  test('параллельный бутстрап даёт ОДИН /meta/ вместо четырёх', async () => {
    await Promise.all([
      catalogService.getCategories(),
      catalogService.getProducts(),
      catalogService.getBranches(),
    ]);
    expect(callsTo('/meta/')).toBe(1);
  });

  test('повторный монтаж экрана в пределах TTL не дёргает сеть', async () => {
    await catalogService.getCategories();
    await catalogService.getProducts();
    const afterFirstMount = apiService.get.mock.calls.length;

    // «вернулись на экран»: те же вызовы второй раз
    await catalogService.getCategories();
    await catalogService.getProducts();
    expect(apiService.get.mock.calls.length).toBe(afterFirstMount);
  });

  test('force=true обходит тёплый кэш (pull-to-refresh)', async () => {
    await catalogService.getCategories();
    const before = apiService.get.mock.calls.length;
    await catalogService.getCategories({ force: true });
    expect(callsTo('/categories/')).toBe(2);
    expect(apiService.get.mock.calls.length).toBeGreaterThan(before);
  });

  test('фильтрованный запрос (поиск) не читает и не портит кэш полного списка', async () => {
    await catalogService.getProducts();
    const found = await catalogService.searchProducts('ант');
    expect(found.length).toBe(1);
    expect(callsTo('/products/')).toBe(2); // кэш + свежий фильтрованный
  });

  test('демо-ответ не кэшируется: оживший сервер виден следующим запросом', async () => {
    apiService.get.mockRejectedValue(new Error('HTTP 404'));
    const demo = await catalogService.getCategories();
    expect(catalogService.isDemoActive()).toBe(true);
    expect(demo.length).toBeGreaterThan(0);

    apiService.get.mockReset();
    apiService.get.mockImplementation((path) => {
      if (path === '/meta/') return Promise.resolve(META);
      if (path === '/categories/') return Promise.resolve(CATEGORIES);
      return Promise.reject(new Error('HTTP 404'));
    });
    const live = await catalogService.getCategories();
    expect(callsTo('/categories/')).toBe(1); // ушли в сеть, не в кэш демо
    expect(live).toEqual(CATEGORIES);
    expect(catalogService.isDemoActive()).toBe(false);
  });
});

describe('дефект №3: промо не стучится в несуществующий эндпоинт', () => {
  test('PROMOS_ENABLED=false → запроса нет, возврат []', async () => {
    expect(PROMOS_ENABLED).toBe(false);
    const promos = await promoService.getActivePromos();
    expect(promos).toEqual([]);
    expect(apiService.get).not.toHaveBeenCalled();
  });
});
