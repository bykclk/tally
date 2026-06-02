import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useTheme } from './theme';

export type CurvePoint = {
  label: string;
  value: number;
};

type Props = {
  points: CurvePoint[];
  /** Index of the lowest point, emphasised with a ringed dot. */
  lowestIndex?: number;
  /** Currently selected point (shows a guide line + ring). */
  selectedIndex?: number | null;
  /** Fired when a point is tapped, with its pixel position in the chart box. */
  onSelectPoint?: (index: number, pos: { x: number; y: number }) => void;
  height?: number;
};

const TOP_PAD = 16;
const BOTTOM_PAD = 24; // room for x labels
const SIDE_PAD = 14;

type Pt = { x: number; y: number };

/**
 * Catmull-Rom → cubic-bezier smoothing. Control points are clamped to each
 * segment's y-range so the curve never overshoots past its endpoints (a
 * smoothed line must not imply a dip the data doesn't have).
 */
function smoothLine(pts: Pt[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const lo = Math.min(p1.y, p2.y);
    const hi = Math.max(p1.y, p2.y);
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp1y = Math.max(lo, Math.min(hi, p1.y + (p2.y - p0.y) / 6));
    const cp2y = Math.max(lo, Math.min(hi, p2.y - (p3.y - p1.y) / 6));
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

/**
 * Balance trajectory: a smoothed area+line of projected end-of-month balance.
 * Fills to zero when all-positive (a shrinking buffer reads as approaching the
 * floor); when a month goes negative, the sub-zero region of both the fill and
 * the line turn red, and a dashed zero reference line appears.
 */
export function BalanceCurveChart({
  points,
  lowestIndex,
  selectedIndex,
  onSelectPoint,
  height = 200,
}: Props) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const n = points.length;
  const values = points.map((p) => p.value);

  const rawMin = Math.min(0, ...values);
  const rawMax = Math.max(0, ...values);
  const span = rawMax - rawMin || 1;
  const pad = span * 0.12;
  const yMin = rawMin - (rawMin < 0 ? pad : 0);
  const yMax = rawMax + pad;

  const innerW = Math.max(1, width - SIDE_PAD * 2);
  const innerH = Math.max(1, height - TOP_PAD - BOTTOM_PAD);
  const floorY = TOP_PAD + innerH;

  // Keep tap targets from overlapping when points are dense (12-month horizon),
  // which would otherwise select a neighbouring month.
  const hitR = n > 1 ? Math.max(10, Math.min(20, innerW / (2 * (n - 1)))) : 20;

  const xAt = (i: number) =>
    n <= 1 ? SIDE_PAD + innerW / 2 : SIDE_PAD + (i / (n - 1)) * innerW;
  const yAt = (v: number) =>
    TOP_PAD + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  const hasNeg = rawMin < 0;
  const zeroY = yAt(0);

  const pts: Pt[] = points.map((p, i) => ({ x: xAt(i), y: yAt(p.value) }));
  const linePath = smoothLine(pts);
  const areaPath =
    n > 0
      ? `${linePath} L ${xAt(n - 1).toFixed(1)} ${floorY.toFixed(1)} L ${xAt(0).toFixed(1)} ${floorY.toFixed(1)} Z`
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
      {width > 0 && n > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="curveAccent" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={theme.colors.accent} stopOpacity={0.3} />
              <Stop offset="1" stopColor={theme.colors.accent} stopOpacity={0.02} />
            </LinearGradient>
            <LinearGradient id="curveDanger" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={theme.colors.expense} stopOpacity={0.05} />
              <Stop offset="1" stopColor={theme.colors.expense} stopOpacity={0.32} />
            </LinearGradient>
            <ClipPath id="belowZero">
              <Rect
                x={0}
                y={zeroY}
                width={width}
                height={Math.max(0, height - zeroY)}
              />
            </ClipPath>
          </Defs>

          {areaPath ? <Path d={areaPath} fill="url(#curveAccent)" /> : null}
          {hasNeg && areaPath ? (
            <Path d={areaPath} fill="url(#curveDanger)" clipPath="url(#belowZero)" />
          ) : null}

          {hasNeg && (
            <Line
              x1={SIDE_PAD}
              y1={zeroY}
              x2={width - SIDE_PAD}
              y2={zeroY}
              stroke={theme.colors.expense}
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.7}
            />
          )}

          {typeof selectedIndex === 'number' && selectedIndex >= 0 && (
            <Line
              x1={pts[selectedIndex].x}
              y1={TOP_PAD}
              x2={pts[selectedIndex].x}
              y2={floorY}
              stroke={theme.colors.textMuted}
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.5}
            />
          )}

          {linePath ? (
            <Path
              d={linePath}
              stroke={theme.colors.accent}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {hasNeg && linePath ? (
            <Path
              d={linePath}
              stroke={theme.colors.expense}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              clipPath="url(#belowZero)"
            />
          ) : null}

          {points.map((p, i) => {
            const isLow = i === lowestIndex;
            const isSel = i === selectedIndex;
            const isNeg = p.value < 0;
            const color = isNeg ? theme.colors.expense : theme.colors.accent;
            const ringed = isSel || isLow;
            return (
              <Circle
                key={i}
                cx={pts[i].x}
                cy={pts[i].y}
                r={isSel ? 6 : isLow ? 5 : 3.5}
                fill={color}
                stroke={ringed ? theme.colors.surface : 'none'}
                strokeWidth={ringed ? 2.5 : 0}
              />
            );
          })}

          {points.map((p, i) => (
            <SvgText
              key={`l${i}`}
              x={pts[i].x}
              y={height - 7}
              fill={
                i === selectedIndex ? theme.colors.text : theme.colors.textMuted
              }
              fontSize={10}
              fontWeight={
                i === selectedIndex || i === lowestIndex ? 'bold' : 'normal'
              }
              textAnchor="middle"
            >
              {p.label}
            </SvgText>
          ))}

          {onSelectPoint &&
            points.map((p, i) => (
              <Circle
                key={`hit${i}`}
                cx={pts[i].x}
                cy={pts[i].y}
                r={hitR}
                fill="transparent"
                onPress={() => onSelectPoint(i, { x: pts[i].x, y: pts[i].y })}
              />
            ))}
        </Svg>
      )}
    </View>
  );
}
