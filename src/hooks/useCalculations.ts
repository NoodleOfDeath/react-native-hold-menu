import React from 'react';
import { useStyleGuide } from './useStyleGuide';
import { MENU_TRANSFORM_ORIGIN_TOLERENCE } from '../constants';

export type TransformOriginAnchorPosition =
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center';

export const useCalculations = () => {
  const { spacing, fontScale, menuWidth, typography } = useStyleGuide();

  const MenuItemHeight = React.useCallback(() => {
    'worklet';
    return typography.callout.lineHeight * fontScale + spacing * 2.5;
  }, [fontScale, spacing, typography.callout.lineHeight]);

  const calculateMenuHeight = React.useCallback(
    (itemLength: number, separatorCount: number) => {
      'worklet';
      return (
        MenuItemHeight() * itemLength +
        (itemLength - 1) +
        separatorCount * spacing
      );
    },
    [MenuItemHeight, spacing]
  );

  const menuAnimationAnchor = React.useCallback(
    (
      anchorPoint: TransformOriginAnchorPosition,
      itemWidth: number,
      itemLength: number,
      itemsWithSeparatorLength: number
    ) => {
      'worklet';
      const MenuHeight = calculateMenuHeight(
        itemLength,
        itemsWithSeparatorLength
      );
      const splittetAnchorName: string[] = anchorPoint.split('-');

      const Center1 = itemWidth;
      const Center2 = 0;

      const TyTop1 = -(MenuHeight / 2);
      const TyTop2 = MenuHeight / 2;

      const TxLeft1 = (menuWidth / 2) * -1;
      const TxLeft2 = (menuWidth / 2) * 1;

      return {
        beginningTransformations: {
          translateX:
            splittetAnchorName[1] === 'right'
              ? -TxLeft1
              : splittetAnchorName[1] === 'left'
              ? TxLeft1
              : Center1,
          translateY:
            splittetAnchorName[0] === 'top'
              ? TyTop1
              : splittetAnchorName[0] === 'bottom'
              ? TyTop1
              : Center2,
        },
        endingTransformations: {
          translateX:
            splittetAnchorName[1] === 'right'
              ? -TxLeft2
              : splittetAnchorName[1] === 'left'
              ? TxLeft2
              : Center2,
          translateY:
            splittetAnchorName[0] === 'top'
              ? TyTop2
              : splittetAnchorName[0] === 'bottom'
              ? -TyTop2
              : Center2,
        },
      };
    },
    [calculateMenuHeight, menuWidth]
  );

  const getTransformOrigin = (
    posX: number,
    itemWidth: number,
    windowWidth: number,
    bottom?: boolean
  ): TransformOriginAnchorPosition => {
    'worklet';
    const distanceToLeft = Math.round(posX + itemWidth / 2);
    const distanceToRight = Math.round(windowWidth - distanceToLeft);

    let position: TransformOriginAnchorPosition = bottom
      ? 'bottom-right'
      : 'top-right';

    const majority = Math.abs(distanceToLeft - distanceToRight);

    if (majority < MENU_TRANSFORM_ORIGIN_TOLERENCE) {
      position = bottom ? 'bottom-center' : 'top-center';
    } else if (distanceToLeft < distanceToRight) {
      position = bottom ? 'bottom-left' : 'top-left';
    }

    return position;
  };

  return {
    calculateMenuHeight,
    menuAnimationAnchor,
    getTransformOrigin,
  };
};
