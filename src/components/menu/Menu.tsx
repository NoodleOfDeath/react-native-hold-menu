import React from 'react';

import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import MenuList from './MenuList';

import styles from './styles';
import { useInternal } from '../../hooks';
import {
  HOLD_ITEM_TRANSFORM_DURATION,
  CONTEXT_MENU_STATE,
  SPRING_CONFIGURATION,
} from '../../constants';

const MenuComponent = () => {
  const { state, menuProps } = useInternal();

  const wrapperStyles = useAnimatedStyle(
    React.useCallback(() => {
      const anchorPositionVertical = menuProps.value.anchorPosition.split(
        '-'
      )[0];

      const top =
        anchorPositionVertical === 'top'
          ? menuProps.value.itemHeight + menuProps.value.itemY + 8
          : menuProps.value.itemY - 8;
      const left = menuProps.value.itemX;
      const width = menuProps.value.itemWidth;
      const tY = menuProps.value.transformValue;

      return {
        top,
        left,
        width,
        transform: [
          {
            translateY:
              state.value === CONTEXT_MENU_STATE.ACTIVE
                ? withSpring(tY, SPRING_CONFIGURATION)
                : withTiming(0, { duration: HOLD_ITEM_TRANSFORM_DURATION }),
          },
        ],
      };
    }, [
      menuProps.value.anchorPosition,
      menuProps.value.itemHeight,
      menuProps.value.itemWidth,
      menuProps.value.itemX,
      menuProps.value.itemY,
      menuProps.value.transformValue,
      state.value,
    ]),
    [menuProps]
  );

  return (
    <Animated.View style={[styles.menuWrapper, wrapperStyles]}>
      <MenuList />
    </Animated.View>
  );
};

const Menu = React.memo(MenuComponent);

export default Menu;
