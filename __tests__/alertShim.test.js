/**
 * Дефект №15 (02.11.2026): на веб-превью react-native Alert не реализован,
 * кнопка «Очистить» в корзине выглядела мёртвой. alertShim даёт web-ветку
 * через window.alert/window.confirm с той же семантикой кнопок.
 */

describe('web-ветка', () => {
  let shim;
  const rnAlert = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    rnAlert.mockClear();
    jest.doMock('react-native', () => ({
      Platform: { OS: 'web' },
      Alert: { alert: rnAlert },
    }));
    global.window = { alert: jest.fn(), confirm: jest.fn() };
    shim = require('../src/utils/alertShim');
  });

  afterEach(() => {
    delete global.window;
    jest.dontMock('react-native');
  });

  test('уведомление без кнопок → window.alert', () => {
    shim.alert('Успешно', 'Товар добавлен');
    expect(global.window.alert).toHaveBeenCalledWith('Успешно\n\nТовар добавлен');
    expect(global.window.confirm).not.toHaveBeenCalled();
  });

  test('одна кнопка → window.alert и её onPress', () => {
    const onPress = jest.fn();
    shim.alert('Внимание', 'Текст', [{ text: 'ОК', onPress }]);
    expect(global.window.alert).toHaveBeenCalled();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('подтверждение: согласился → рабочая кнопка, cancel не тронут', () => {
    global.window.confirm.mockReturnValue(true);
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    shim.alert('Очистить корзину', 'Уверены?', [
      { text: 'Отмена', style: 'cancel', onPress: onCancel },
      { text: 'Очистить', style: 'destructive', onPress: onConfirm },
    ]);
    expect(global.window.confirm).toHaveBeenCalled();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  test('подтверждение: отказался → cancel', () => {
    global.window.confirm.mockReturnValue(false);
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    shim.alert('Удалить товар', 'Уверены?', [
      { text: 'Отмена', style: 'cancel', onPress: onCancel },
      { text: 'Удалить', style: 'destructive', onPress: onConfirm },
    ]);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('native-ветка', () => {
  test('аргументы прозрачно уходят в react-native Alert', () => {
    jest.resetModules();
    const rnAlert = jest.fn();
    jest.doMock('react-native', () => ({
      Platform: { OS: 'android' },
      Alert: { alert: rnAlert },
    }));
    const shim = require('../src/utils/alertShim');
    const buttons = [{ text: 'ОК' }];
    shim.alert('Заголовок', 'Сообщение', buttons);
    expect(rnAlert).toHaveBeenCalledWith('Заголовок', 'Сообщение', buttons);
    jest.dontMock('react-native');
  });
});
