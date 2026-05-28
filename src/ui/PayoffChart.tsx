import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { useTheme } from './theme';

type Props = {
  baseline: number[];
  withExtra?: number[] | null;
  height?: number;
};

const PADDING = 8;

function buildPath(
  values: number[],
  width: number,
  height: number,
  maxX: number,
  maxY: number,
): string {
  if (values.length === 0 || maxX <= 0 || maxY <= 0) return '';
  const innerW = Math.max(1, width - PADDING * 2);
  const innerH = Math.max(1, height - PADDING * 2);
  let d = '';
  for (let i = 0; i < values.length; i++) {
    const x = PADDING + (i / maxX) * innerW;
    const y = PADDING + innerH - (values[i] / maxY) * innerH;
    d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  return d;
}

export function PayoffChart({ baseline, withExtra, height = 160 }: Props) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const maxMonths = Math.max(
    baseline.length - 1,
    withExtra ? withExtra.length - 1 : 0,
    1,
  );
  const maxBalance = Math.max(...baseline, 0) || 1;

  const baselinePath = buildPath(baseline, width, height, maxMonths, maxBalance);
  const extraPath = withExtra
    ? buildPath(withExtra, width, height, maxMonths, maxBalance)
    : '';

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
      {width > 0 && (
        <Svg width={width} height={height}>
          <Line
            x1={PADDING}
            y1={height - PADDING}
            x2={width - PADDING}
            y2={height - PADDING}
            stroke={theme.colors.border}
            strokeWidth={1}
          />
          {baselinePath && (
            <Path
              d={baselinePath}
              stroke={theme.colors.textMuted}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {extraPath && (
            <Path
              d={extraPath}
              stroke={theme.colors.accent}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </Svg>
      )}
    </View>
  );
}
