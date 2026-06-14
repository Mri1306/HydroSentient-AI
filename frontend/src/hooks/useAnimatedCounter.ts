import { useState, useEffect, useRef } from "react";

export function useAnimatedCounter(target: number, duration = 1200, decimals = 1) {
  const [value, setValue] = useState(0);
  const animRef = useRef<number>();

  useEffect(() => {
    const start = performance.now();
    const from = 0;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setValue(+(from + (target - from) * eased).toFixed(decimals));
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [target, duration, decimals]);

  return value;
}
