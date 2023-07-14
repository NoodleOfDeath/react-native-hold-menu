import React, { memo, useCallback, useMemo } from 'react';
import { ViewProps } from 'react-native';

//#region reanimated & gesture handler
import {
  TapGestureHandler,
  LongPressGestureHandler,
  TapGestureHandlerGestureEvent,
  LongPressGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import Animated, {
  measure,
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedProps,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  withSequence,
  withSpring,
  useAnimatedReaction,
} from 'react-native-reanimated';
//#endregion

//#region dependencies
import { Portal } from '@gorhom/portal';
import { nanoid } from 'nanoid/non-secure';
import * as Haptics from 'expo-haptics';
//#endregion

//#region utils & types
import {
  TransformOriginAnchorPosition,
  useCalculations,
} from '../../hooks/useCalculations';
import {
  HOLD_ITEM_TRANSFORM_DURATION,
  HOLD_ITEM_SCALE_DOWN_DURATION,
  HOLD_ITEM_SCALE_DOWN_VALUE,
  SPRING_CONFIGURATION,
  CONTEXT_MENU_STATE,
} from '../../constants';
import { useInternal, useStyleGuide } from '../../hooks';

import styles from './styles';
import type { HoldItemProps, GestureHandlerProps } from './types';

//#endregion

type Context = { didMeasureLayout: boolean };

const HoldItemComponent = ({
  items,
  bottom,
  containerStyles,
  disableMove,
  menuAnchorPosition,
  activateOn,
  hapticFeedback,
  actionParams,
  closeOnTap,
  longPressMinDurationMs = 150,
  children,
}: HoldItemProps) => {
  //#region hooks
  const { state, menuProps, safeAreaInsets } = useInternal();
  const {
    orientation: deviceOrientation,
    dimensionWidth,
    dimensionHeight,
    spacing,
  } = useStyleGuide();
  const { calculateMenuHeight, getTransformOrigin } = useCalculations();
  //#endregion

  //#region variables
  const isActive = useSharedValue(false);
  const isAnimationStarted = useSharedValue(false);

  const itemRectY = useSharedValue<number>(0);
  const itemRectX = useSharedValue<number>(0);
  const itemRectWidth = useSharedValue<number>(0);
  const itemRectHeight = useSharedValue<number>(0);
  const itemScale = useSharedValue<number>(1);
  const transformValue = useSharedValue<number>(0);

  const transformOrigin = useSharedValue<TransformOriginAnchorPosition>(
    menuAnchorPosition || 'top-right'
  );

  const key = useMemo(() => `hold-item-${nanoid()}`, []);
  const menuHeight = useMemo(() => {
    const itemsWithSeparator = items.filter(item => item.withSeparator);
    return calculateMenuHeight(items.length, itemsWithSeparator.length);
  }, [calculateMenuHeight, items]);

  const isHold = useMemo(() => !activateOn || activateOn === 'hold', [
    activateOn,
  ]);
  //#endregion

  //#region refs
  const containerRef = useAnimatedRef<Animated.View>();
  //#endregion

  //#region functions
  const hapticResponse = useCallback(() => {
    const style = !hapticFeedback ? 'Medium' : hapticFeedback;
    switch (style) {
      case `Selection`:
        Haptics.selectionAsync();
        break;
      case `Light`:
      case `Medium`:
      case `Heavy`:
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle[style]);
        break;
      case `Success`:
      case `Warning`:
      case `Error`:
        Haptics.notificationAsync(Haptics.NotificationFeedbackType[style]);
        break;
      default:
    }
  }, [hapticFeedback]);
  //#endregion

  //#region worklet functions
  const activateAnimation = useCallback(
    (ctx: any) => {
      'worklet';
      if (!ctx.didMeasureLayout) {
        const measured = measure(containerRef);

        itemRectY.value = measured.pageY;
        itemRectX.value = measured.pageX;
        itemRectHeight.value = measured.height;
        itemRectWidth.value = measured.width;

        if (!menuAnchorPosition) {
          const position = getTransformOrigin(
            measured.pageX,
            itemRectWidth.value,
            deviceOrientation === 'portrait' ? dimensionWidth : dimensionHeight,
            bottom
          );
          transformOrigin.value = position;
        }
      }
    },
    [
      containerRef,
      itemRectY,
      itemRectX,
      itemRectHeight,
      itemRectWidth,
      menuAnchorPosition,
      getTransformOrigin,
      deviceOrientation,
      dimensionWidth,
      dimensionHeight,
      bottom,
      transformOrigin,
    ]
  );

  const calculateTransformValue = useCallback(() => {
    'worklet';

    const height =
      deviceOrientation === 'portrait' ? dimensionHeight : dimensionWidth;

    const isAnchorPointTop = transformOrigin.value.includes('top');

    let tY = 0;
    if (!disableMove) {
      if (isAnchorPointTop) {
        const topTransform =
          itemRectY.value +
          itemRectHeight.value +
          menuHeight +
          spacing +
          (safeAreaInsets?.bottom || 0);

        tY = topTransform > height ? height - topTransform : 0;
      } else {
        const bottomTransform =
          itemRectY.value - menuHeight - (safeAreaInsets?.top || 0);
        tY = bottomTransform < 0 ? -bottomTransform + spacing * 2 : 0;
      }
    }
    return tY;
  }, [
    deviceOrientation,
    dimensionHeight,
    dimensionWidth,
    transformOrigin.value,
    disableMove,
    itemRectY.value,
    itemRectHeight.value,
    menuHeight,
    spacing,
    safeAreaInsets?.bottom,
    safeAreaInsets?.top,
  ]);

  const setMenuProps = useCallback(() => {
    'worklet';
    menuProps.value = {
      itemHeight: itemRectHeight.value,
      itemWidth: itemRectWidth.value,
      itemY: itemRectY.value,
      itemX: itemRectX.value,
      anchorPosition: transformOrigin.value,
      menuHeight: menuHeight,
      items,
      transformValue: transformValue.value,
      actionParams: actionParams || {},
    };
  }, [
    actionParams,
    itemRectHeight.value,
    itemRectWidth.value,
    itemRectX.value,
    itemRectY.value,
    items,
    menuHeight,
    menuProps,
    transformOrigin.value,
    transformValue.value,
  ]);

  const scaleBack = useCallback(() => {
    'worklet';
    itemScale.value = withTiming(1, {
      duration: HOLD_ITEM_TRANSFORM_DURATION / 2,
    });
  }, [itemScale]);

  const onCompletion = useCallback(
    (isFinised?: boolean) => {
      'worklet';
      const isListValid = items && items.length > 0;
      if (isFinised && isListValid) {
        state.value = CONTEXT_MENU_STATE.ACTIVE;
        isActive.value = true;
        scaleBack();
        if (hapticFeedback !== 'None') {
          runOnJS(hapticResponse)();
        }
      }

      isAnimationStarted.value = false;

      // TODO: Warn user if item list is empty or not given
    },
    [
      hapticFeedback,
      hapticResponse,
      isActive,
      isAnimationStarted,
      items,
      scaleBack,
      state,
    ]
  );

  const scaleHold = useCallback(() => {
    'worklet';
    itemScale.value = withTiming(
      HOLD_ITEM_SCALE_DOWN_VALUE,
      { duration: HOLD_ITEM_SCALE_DOWN_DURATION },
      onCompletion
    );
  }, [itemScale, onCompletion]);

  const scaleTap = useCallback(() => {
    'worklet';
    isAnimationStarted.value = true;

    itemScale.value = withSequence(
      withTiming(HOLD_ITEM_SCALE_DOWN_VALUE, {
        duration: HOLD_ITEM_SCALE_DOWN_DURATION,
      }),
      withTiming(
        1,
        {
          duration: HOLD_ITEM_TRANSFORM_DURATION / 2,
        },
        onCompletion
      )
    );
  }, [isAnimationStarted, itemScale, onCompletion]);

  /**
   * When use tap activation ("tap") and trying to tap multiple times,
   * scale animation is called again despite it is started. This causes a bug.
   * To prevent this, it is better to check is animation already started.
   */
  const canCallActivateFunctions = useCallback(() => {
    'worklet';
    const willActivateWithTap =
      activateOn === 'double-tap' || activateOn === 'tap';

    return (
      (willActivateWithTap && !isAnimationStarted.value) || !willActivateWithTap
    );
  }, [activateOn, isAnimationStarted.value]);
  //#endregion

  //#region gesture events
  const gestureEvent = useAnimatedGestureHandler<
    LongPressGestureHandlerGestureEvent | TapGestureHandlerGestureEvent,
    Context
  >({
    onActive: (_, context) => {
      if (canCallActivateFunctions()) {
        if (!context.didMeasureLayout) {
          activateAnimation(context);
          transformValue.value = calculateTransformValue();
          setMenuProps();
          context.didMeasureLayout = true;
        }

        if (!isActive.value) {
          if (isHold) {
            scaleHold();
          } else {
            scaleTap();
          }
        }
      }
    },
    onFinish: (_, context) => {
      context.didMeasureLayout = false;
      if (isHold) {
        scaleBack();
      }
    },
  });

  const overlayGestureEvent = useAnimatedGestureHandler<
    TapGestureHandlerGestureEvent,
    Context
  >({
    onActive: _ => {
      if (closeOnTap) state.value = CONTEXT_MENU_STATE.END;
    },
  });
  //#endregion

  //#region animated styles & props
  const animatedContainerStyle = useAnimatedStyle(() => {
    const animateOpacity = () =>
      withDelay(HOLD_ITEM_TRANSFORM_DURATION, withTiming(1, { duration: 0 }));

    return {
      opacity: isActive.value ? 0 : animateOpacity(),
      transform: [
        {
          scale: isActive.value
            ? withTiming(1, { duration: HOLD_ITEM_TRANSFORM_DURATION })
            : itemScale.value,
        },
      ],
    };
  });
  const containerStyle = useMemo(
    () => [containerStyles, animatedContainerStyle],
    [containerStyles, animatedContainerStyle]
  );

  const animatedPortalStyle = useAnimatedStyle(() => {
    const animateOpacity = () =>
      withDelay(HOLD_ITEM_TRANSFORM_DURATION, withTiming(0, { duration: 0 }));

    let tY = calculateTransformValue();
    const transformAnimation = () =>
      disableMove
        ? 0
        : isActive.value
        ? withSpring(tY, SPRING_CONFIGURATION)
        : withTiming(-0.1, { duration: HOLD_ITEM_TRANSFORM_DURATION });

    return {
      zIndex: 10,
      position: 'absolute',
      top: itemRectY.value,
      left: itemRectX.value,
      width: itemRectWidth.value,
      height: itemRectHeight.value,
      opacity: isActive.value ? 1 : animateOpacity(),
      transform: [
        {
          translateY: transformAnimation(),
        },
        {
          scale: isActive.value
            ? withTiming(1, { duration: HOLD_ITEM_TRANSFORM_DURATION })
            : itemScale.value,
        },
      ],
    };
  });
  const portalContainerStyle = useMemo(
    () => [styles.holdItem, animatedPortalStyle],
    [animatedPortalStyle]
  );

  const animatedPortalProps = useAnimatedProps<ViewProps>(() => ({
    pointerEvents: isActive.value ? 'auto' : 'none',
  }));
  //#endregion

  //#region animated effects
  useAnimatedReaction(
    () => state.value,
    _state => {
      if (_state === CONTEXT_MENU_STATE.END) {
        isActive.value = false;
      }
    }
  );
  //#endregion

  //#region components
  const GestureHandler = useMemo(() => {
    switch (activateOn) {
      case `double-tap`:
        return ({ children: handlerChildren }: GestureHandlerProps) => (
          <TapGestureHandler
            numberOfTaps={2}
            onHandlerStateChange={gestureEvent}
          >
            {handlerChildren}
          </TapGestureHandler>
        );
      case `tap`:
        return ({ children: handlerChildren }: GestureHandlerProps) => (
          <TapGestureHandler
            numberOfTaps={1}
            onHandlerStateChange={gestureEvent}
          >
            {handlerChildren}
          </TapGestureHandler>
        );
      // default is hold
      default:
        return ({ children: handlerChildren }: GestureHandlerProps) => (
          <LongPressGestureHandler
            minDurationMs={longPressMinDurationMs}
            onHandlerStateChange={gestureEvent}
          >
            {handlerChildren}
          </LongPressGestureHandler>
        );
    }
  }, [activateOn, gestureEvent, longPressMinDurationMs]);

  const PortalOverlay = useMemo(() => {
    return () => (
      <TapGestureHandler
        numberOfTaps={1}
        onHandlerStateChange={overlayGestureEvent}
      >
        <Animated.View style={styles.portalOverlay} />
      </TapGestureHandler>
    );
  }, [overlayGestureEvent]);
  //#endregion

  //#region render
  return (
    <>
      <GestureHandler>
        <Animated.View ref={containerRef} style={containerStyle}>
          {children}
        </Animated.View>
      </GestureHandler>

      <Portal key={key} name={key}>
        <Animated.View
          key={key}
          style={portalContainerStyle}
          animatedProps={animatedPortalProps}
        >
          <PortalOverlay />
          {children}
        </Animated.View>
      </Portal>
    </>
  );
  //#endregion
};

const HoldItem = memo(HoldItemComponent);

export default HoldItem;
