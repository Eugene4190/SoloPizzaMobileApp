/**
 * ProductImage — картинка товара с честной заглушкой.
 *
 * Зачем: экраны исторически подставляли fallback с via.placeholder.com —
 * сервис мёртв (404/403), и карточки рисовались серыми квадратами.
 * Реальный API может прислать image: null (ImageField(blank=True, null=True)),
 * поэтому заглушка нужна и в бою: рисуем плитку цвета hover-bg с эмодзи
 * категории вместо битой внешней картинки.
 */

import React from 'react';
import { View, Text, Image } from 'react-native';
import useAppTheme from '../../theme/useAppTheme';

export const CATEGORY_GLYPHS = {
  picca: '🍕',
  kalcone: '🥟',
  burgery: '🍔',
  kombo: '🍱',
  sety: '🎁',
  sousy: '🥫',
  napitki: '🥤',
  fastfud: '🍟',
  skovorodki: '🍳',
};

export default function ProductImage({ uri, glyph, style, emojiSize = 40 }) {
  const { colors } = useAppTheme();

  if (uri) {
    return <Image source={{ uri }} style={style} resizeMode="cover" />;
  }

  return (
    <View
      style={[
        style,
        {
          backgroundColor: colors.hoverBg,
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}
    >
      <Text style={{ fontSize: emojiSize }}>{glyph || '🍕'}</Text>
    </View>
  );
}
