import React, { useEffect, useRef, useState } from "react";

/**
 * Thin progress bar across the top of the page while a request is in flight.
 *
 * It is not measuring anything. An HTTP request has no progress to report
 * until it finishes, so this eases toward a ceiling it never reaches on its
 * own and only completes when the work actually does. That's honest in the
 * way that matters — the bar can't reach the end and then sit there, which is
 * the behaviour that makes people think an app has hung.
 *
 * The easing is deliberately slowest near the end, so a cold server taking
 * thirty seconds still shows visible movement rather than a frozen bar.
 */
export default function ProgressBar({ active, ceiling = 92 }) {
  const [value, setValue] = useState(0);
  const [visible, setVisible] = useState(false);
  const frame = useRef(null);
  const hideTimer = useRef(null);

  useEffect(() => {
    if (active) {
      clearTimeout(hideTimer.current);
      setVisible(true);
      setValue(8); // Start with something on screen; 0 reads as broken.

      const tick = () => {
        setValue((v) => {
          if (v >= ceiling) return v;
          // Each step covers a fraction of what's left, so it decelerates
          // toward the ceiling instead of stopping dead at it.
          const step = Math.max(0.35, (ceiling - v) * 0.035);
          return Math.min(ceiling, v + step);
        });
        frame.current = window.setTimeout(tick, 180);
      };
      frame.current = window.setTimeout(tick, 180);

      return () => clearTimeout(frame.current);
    }

    clearTimeout(frame.current);
    // Only run the completion animation if a load was actually shown.
    setValue((v) => (v > 0 ? 100 : 0));
    hideTimer.current = window.setTimeout(() => {
      setVisible(false);
      setValue(0);
    }, 420);

    return () => clearTimeout(hideTimer.current);
  }, [active, ceiling]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 h-[3px] bg-transparent"
      role="progressbar"
      aria-label="Loading recipes"
      aria-valuemin={0}
      aria-valuemax={100}
      // Omitted while indeterminate: claiming a number we haven't measured
      // would mislead a screen reader more than saying nothing.
      aria-valuenow={value >= 100 ? 100 : undefined}
    >
      <div
        className="h-full bg-accent transition-[width,opacity] duration-300 ease-out"
        style={{ width: `${value}%`, opacity: value >= 100 ? 0 : 1 }}
      />
    </div>
  );
}
