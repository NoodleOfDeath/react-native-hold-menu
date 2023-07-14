import React from 'react';
import Animated from 'react-native-reanimated';

import {
  MENU_TEXT_DARK_COLOR,
  MENU_TEXT_DESTRUCTIVE_COLOR_DARK,
  MENU_TEXT_DESTRUCTIVE_COLOR_LIGHT,
  MENU_TEXT_LIGHT_COLOR,
  MENU_TITLE_COLOR,
} from './constants';
import { useStyleGuide } from '../../hooks/useStyleGuide';
import type { MenuInternalProps } from './types';

export const useLeftOrRight = (
  menuProps: Animated.SharedValue<MenuInternalProps>
) => {
  'worklet';
  const { menuWidth } = useStyleGuide();
  const anchorPositionHorizontal = React.useMemo(
    () => menuProps.value.anchorPosition.split('-')[1],
    [menuProps.value.anchorPosition]
  );
  const itemWidth = React.useMemo(() => menuProps.value.itemWidth, [
    menuProps.value.itemWidth,
  ]);
  const leftPosition = React.useMemo(
    () =>
      anchorPositionHorizontal === 'right'
        ? menuWidth + itemWidth
        : anchorPositionHorizontal === 'left'
        ? 0
        : -menuProps.value.itemWidth -
          menuWidth / 2 +
          menuProps.value.itemWidth / 2,
    [anchorPositionHorizontal, itemWidth, menuProps.value.itemWidth, menuWidth]
  );
  return leftPosition;
};

export const getColor = (
  isTitle: boolean | undefined,
  isDestructive: boolean | undefined,
  themeValue: 'light' | 'dark'
) => {
  'worklet';
  return isTitle
    ? MENU_TITLE_COLOR
    : isDestructive
    ? themeValue === 'dark'
      ? MENU_TEXT_DESTRUCTIVE_COLOR_DARK
      : MENU_TEXT_DESTRUCTIVE_COLOR_LIGHT
    : themeValue === 'dark'
    ? MENU_TEXT_DARK_COLOR
    : MENU_TEXT_LIGHT_COLOR;
};
