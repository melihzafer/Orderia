import { useWindowDimensions } from 'react-native';
import { ServiceLayoutMode, serviceBreakpoints, serviceSpace } from './tokens';

export interface AdaptiveLayout {
  readonly mode: ServiceLayoutMode;
  readonly width: number;
  readonly height: number;
  readonly fontScale: number;
  readonly horizontalPadding: number;
  readonly tableColumns: number;
}

export function layoutModeForWidth(width: number): ServiceLayoutMode {
  if (!Number.isFinite(width) || width <= 0) {
    throw new Error('Layout width must be a positive finite number');
  }
  if (width <= serviceBreakpoints.compactMaximum) return 'compact';
  if (width <= serviceBreakpoints.mediumMaximum) return 'medium';
  return 'expanded';
}

export function adaptiveLayoutForWindow(
  width: number,
  height: number,
  fontScale = 1,
): AdaptiveLayout {
  const mode = layoutModeForWidth(width);
  return {
    mode,
    width,
    height,
    fontScale,
    horizontalPadding:
      mode === 'compact' ? serviceSpace.md : mode === 'medium' ? serviceSpace.lg : serviceSpace.xl,
    tableColumns:
      mode === 'compact'
        ? 2
        : mode === 'medium'
          ? Math.max(3, Math.floor(width / 200))
          : Math.max(4, Math.floor((width - 360) / 220)),
  };
}

export function useAdaptiveLayout(): AdaptiveLayout {
  const { width, height, fontScale } = useWindowDimensions();
  return adaptiveLayoutForWindow(width, height, fontScale);
}
