import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { MoneyText } from './MoneyText';

type Props = ComponentProps<typeof MoneyText> & {
  /** Tween duration in ms. */
  duration?: number;
};

/**
 * A MoneyText that counts up/down to a new amount instead of snapping to it.
 * Pure JS-thread requestAnimationFrame tween (no Reanimated worklets), so all
 * currency formatting/rounding stays in MoneyText. Only animates on change —
 * a value equal to the last one renders instantly.
 */
export function AnimatedMoney({ amount, duration = 450, ...rest }: Props) {
  const [display, setDisplay] = useState(amount);
  // Tracks the currently-shown value so a change mid-tween continues smoothly.
  const fromRef = useRef(amount);

  useEffect(() => {
    const from = fromRef.current;
    const to = amount;
    if (from === to) return;

    let raf = 0;
    const start = Date.now();
    const step = () => {
      const p = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      const value = from + (to - from) * eased;
      fromRef.current = value;
      setDisplay(value);
      if (p < 1) {
        raf = requestAnimationFrame(step);
      } else {
        fromRef.current = to;
        setDisplay(to);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [amount, duration]);

  return <MoneyText amount={display} {...rest} />;
}
