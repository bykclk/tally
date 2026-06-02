import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from './theme';

export type ForecastBar = {
  label: string;
  value: number;
  /** Emphasise this bar (e.g. the current month). */
  highlight?: boolean;
};

type Props = {
  data: ForecastBar[];
  height?: number;
};

const LABEL_BAND = 22;
const PAD = 10;
const MIN_GAP = 6;

/**
 * Bar chart with a zero baseline: positive bars grow up (accent), negative
 * bars grow down (danger/red). Used by the forecast screen where projected
 * remaining can dip below zero.
 */
export function ForecastChart({ data, height = 180 }: Props) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const n = data.length;
  const values = data.map((d) => d.value);
  const max = Math.max(0, ...values);
  const min = Math.min(0, ...values);
  const range = max - min || 1;

  const barAreaH = Math.max(1, height - LABEL_BAND - PAD);
  const zeroY = PAD + (max / range) * barAreaH;
  const scale = barAreaH / range;

  const gap = MIN_GAP;
  const barWidth = n > 0 ? Math.max(4, (width - gap * (n + 1)) / n) : 0;

  return (
    <View
      onLayout={onLayout}
      style={{
        height,
        width: '100%',
        backgroundColor: theme.colors.surfaceMuted,
        borderRadius: theme.radius.md,
      }}
    >
      {width > 0 && n > 0 && (
        <Svg width={width} height={height}>
          <Line
            x1={0}
            y1={zeroY}
            x2={width}
            y2={zeroY}
            stroke={theme.colors.border}
            strokeWidth={1}
          />
          {data.map((d, i) => {
            const isNeg = d.value < 0;
            const magnitude = Math.max(2, Math.abs(d.value) * scale);
            const x = gap + i * (barWidth + gap);
            const y = isNeg ? zeroY : zeroY - magnitude;
            const fill = isNeg ? theme.colors.expense : theme.colors.accent;
            return (
              <Rect
                key={i}
                x={x}
                y={y}
                width={barWidth}
                height={magnitude}
                rx={3}
                fill={fill}
                opacity={d.highlight ? 1 : 0.5}
              />
            );
          })}
          {data.map((d, i) => {
            const x = gap + i * (barWidth + gap) + barWidth / 2;
            return (
              <SvgText
                key={`l${i}`}
                x={x}
                y={height - 6}
                fill={theme.colors.textMuted}
                fontSize={10}
                fontWeight={d.highlight ? 'bold' : 'normal'}
                textAnchor="middle"
              >
                {d.label}
              </SvgText>
            );
          })}
        </Svg>
      )}
    </View>
  );
}
