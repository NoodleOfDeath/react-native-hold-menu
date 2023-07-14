import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

type Orientation = 'landscape' | 'portrait';

export const useStyleGuide = () => {
  const { width, height, fontScale } = useWindowDimensions();
  const guide = useMemo(() => ({
    spacing: 8,
    dimensionWidth: width,
    dimensionHeight: height,
    fontScale,
    menuWidth: (width * 60) / 100,
    orientation: (height >= width ? 'portrait' : 'landscape') as Orientation,
    palette: {
      primary: '#0072ff',
      secondary: '#e2e2e2',
      common: {
        white: '#fff',
        black: '#000',
      },
    },
    typography: {
      body: {
        fontSize: 17,
        lineHeight: 20,
      },
      callout: {
        fontSize: 16,
        lineHeight: 20,
      },
      callout2: {
        fontSize: 14,
        lineHeight: 18,
      },
    },
  }), [width, height, fontScale]);
  return guide;
}
