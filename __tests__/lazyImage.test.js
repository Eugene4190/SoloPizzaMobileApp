/**
 * Регрессия тяжёлого каталога (02.11.2026): на веб картинки товаров обязаны
 * уходить в ленивую загрузку, иначе браузер тянет 22 MB разом и лента стоит
 * в pending до полуминуты. На native веб-атрибутов быть не должно.
 */

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  // изменяемая Platform.OS, чтобы проверить обе ветки одним файлом
  return { ...RN, Platform: { OS: 'ios' } };
});

import React from 'react';
import renderer from 'react-test-renderer';
import { Image, Platform } from 'react-native';
import ProductImage from '../src/components/ui/ProductImage';

const render = () => {
  let tree;
  renderer.act(() => {
    tree = renderer.create(
      <ProductImage uri="https://solo-pizza.by/media/x.png" style={{ width: 10 }} />,
    );
  });
  return tree.root.findByType(Image);
};

test('web: картинка товара ленивая (loading=lazy, decoding=async)', () => {
  Platform.OS = 'web';
  const img = render();
  expect(img.props.loading).toBe('lazy');
  expect(img.props.decoding).toBe('async');
});

test('native: веб-атрибутов нет, ленивость даёт виртуализация FlatList', () => {
  Platform.OS = 'ios';
  const img = render();
  expect(img.props.loading).toBeUndefined();
  expect(img.props.decoding).toBeUndefined();
  expect(img.props.source).toEqual({ uri: 'https://solo-pizza.by/media/x.png' });
});
