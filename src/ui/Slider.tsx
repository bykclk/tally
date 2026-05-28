import { useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useTheme } from './theme';

type Props = {
  value: number;
  min?: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
};

const THUMB_SIZE = 24;
const TRACK_HEIGHT = 4;
const HIT_HEIGHT = 44;

export function Slider({
  value,
  min = 0,
  max,
  step = 1,
  onChange,
}: Props) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    widthRef.current = w;
    setWidth(w);
  };

  const update = (locationX: number) => {
    const w = widthRef.current;
    if (w <= 0 || max <= min) return;
    const clampedX = Math.max(0, Math.min(w, locationX));
    const ratio = clampedX / w;
    const raw = min + ratio * (max - min);
    const stepped = Math.round(raw / step) * step;
    const bounded = Math.max(min, Math.min(max, stepped));
    onChange(bounded);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => update(e.nativeEvent.locationX),
      onPanResponderMove: (e) => update(e.nativeEvent.locationX),
    }),
  ).current;

  const ratio =
    max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0;
  const fillWidth = width * ratio;
  const thumbLeft = fillWidth - THUMB_SIZE / 2;

  return (
    <View
      onLayout={onLayout}
      {...pan.panHandlers}
      style={styles.hit}
    >
      <View
        style={[
          styles.track,
          {
            backgroundColor: theme.colors.surfaceMuted,
            borderRadius: TRACK_HEIGHT / 2,
          },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              width: Math.max(0, fillWidth),
              backgroundColor: theme.colors.accent,
              borderRadius: TRACK_HEIGHT / 2,
            },
          ]}
        />
      </View>
      {width > 0 && (
        <View
          style={[
            styles.thumb,
            {
              left: thumbLeft,
              backgroundColor: theme.colors.accent,
              borderColor: theme.colors.bg,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hit: {
    height: HIT_HEIGHT,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: TRACK_HEIGHT,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 2,
    top: (HIT_HEIGHT - THUMB_SIZE) / 2,
  },
});
