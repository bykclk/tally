import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from './theme';

export type TrendPoint = {
  label: string;
  value: number;
};

type Props = {
  data: TrendPoint[];
  height?: number;
};

const LABEL_BAND = 22;
const TOP_PAD = 8;
const MIN_GAP = 6;

export function TrendChart({ data, height = 180 }: Props) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barAreaH = Math.max(1, height - LABEL_BAND - TOP_PAD);
  const baselineY = TOP_PAD + barAreaH;

  const n = data.length;
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
            y1={baselineY}
            x2={width}
            y2={baselineY}
            stroke={theme.colors.border}
            strokeWidth={1}
          />
          {data.map((d, i) => {
            const isLatest = i === n - 1;
            const barH = Math.max(2, (d.value / maxValue) * barAreaH);
            const x = gap + i * (barWidth + gap);
            const y = baselineY - barH;
            return (
              <Rect
                key={i}
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={3}
                fill={theme.colors.accent}
                opacity={isLatest ? 1 : 0.45}
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
