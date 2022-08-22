import { Colors } from "constants/Colors";
import { darkenColor } from "widgets/WidgetUtils";

interface GetPosition {
  value: number;
  min: number;
  max: number;
}

/**
 *
 * @returns the position of value to be used in the Track component
 */
export function getPosition({ max, min, value }: GetPosition) {
  const position = ((value - min) / (max - min)) * 100;
  return Math.min(Math.max(position, 0), 100);
}

interface GetChangeValue {
  value: number;
  min: number;
  max: number;
  step: number;
  /**
   * precision is used when we are using decimal numbers as step size
   */
  precision?: number;
  /**
   * container width is passed in case of RangeSlider
   */
  containerWidth?: number;
}

export function getChangeValue({
  containerWidth,
  max,
  min,
  precision,
  step,
  value,
}: GetChangeValue) {
  const left = !containerWidth
    ? value
    : Math.min(Math.max(value, 0), containerWidth) / containerWidth;

  const dx = left * (max - min);

  const nextValue = (dx !== 0 ? Math.round(dx / step) * step : 0) + min;

  if (precision !== undefined) {
    return Number(nextValue.toFixed(precision));
  }

  return nextValue;
}

export function getClientPosition(event: any) {
  if ("TouchEvent" in window && event instanceof window.TouchEvent) {
    const touch = event.touches[0];
    return touch.clientX;
  }

  return event.clientX;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

interface IsMarkedFilled {
  mark: { value: number; label?: any };
  offset?: number;
  value: number;
}

export function isMarkedFilled({ mark, offset, value }: IsMarkedFilled) {
  return typeof offset === "number"
    ? mark.value >= offset && mark.value <= value
    : mark.value <= value;
}

export const thumbSizeMap = {
  s: "12px",
  m: "16px",
  l: "20px",
};

export const sizeMap = {
  s: 6,
  m: 8,
  l: 10,
};

export type SliderSizes = "s" | "m" | "l";

export const getSliderStyles = ({
  color,
  disabled,
  dragging,
  hovering,
}: {
  disabled: boolean;
  hovering: boolean;
  dragging: boolean;
  color: string;
}) => {
  const darkColor = darkenColor(color);

  if (disabled) {
    return {
      track: Colors.GREY_5,
      bar: Colors.GREY_6,
      thumb: Colors.GREY_6,
      marks: {
        filled: Colors.GREY_6,
        notFilled: Colors.GREY_5,
        label: Colors.DARK_GRAY,
      },
    };
  }

  if (hovering || dragging) {
    return {
      track: Colors.GRAY_400,
      bar: darkColor,
      thumb: darkColor,
      marks: {
        filled: darkColor,
        notFilled: Colors.GRAY_400,
        label: Colors.CHARCOAL,
      },
    };
  }

  return {
    track: Colors.GREY_5,
    bar: color,
    thumb: color,
    marks: {
      filled: color,
      notFilled: Colors.GREY_5,
      label: Colors.CHARCOAL,
    },
  };
};