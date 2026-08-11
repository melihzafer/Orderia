import React from 'react';

/**
 * Jest için SVG bileşen taklidi.
 *
 * Metro, `react-native-svg-transformer` ile `.svg` dosyalarını React bileşenine
 * çeviriyor (bkz. `metro.config.js`). Jest o dönüştürücüyü çalıştırmadığı için
 * içe aktarım bir bileşene değil düz bir nesneye çözülüyor ve `BrandLogo` gibi
 * bileşenler "Element type is invalid" ile düşüyordu. Bu, üründe değil yalnızca
 * test ortamında olan bir fark.
 */
export default function SvgMock(props: Record<string, unknown>) {
  return React.createElement('Svg', props);
}
