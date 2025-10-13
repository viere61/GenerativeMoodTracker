import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

interface WaveformViewProps {
  peaks: number[];
  progress: number; // 0..1
  width?: number; // optional fixed width; otherwise fills parent
  height?: number;
  barColor?: string;
  playedColor?: string;
}

const WaveformView: React.FC<WaveformViewProps> = ({
  peaks,
  progress,
  width,
  height = 40,
  barColor = '#d0d7de',
  playedColor = '#4a90e2',
}) => {
  const [measuredWidth, setMeasuredWidth] = useState<number>(typeof width === 'number' ? width : 0);
  const finalWidth = typeof width === 'number' ? width : measuredWidth;

  // Smooth peaks for a nicer visual and clamp
  const smoothed = smoothPeaks(peaks, 3).map(v => Math.max(0, Math.min(1, v)));
  const barCount = smoothed.length || 0;
  const safeProgress = Math.max(0, Math.min(1, progress));
  const playedBars = Math.floor(barCount * safeProgress);

  // Avoid rendering before we know width when width is not provided
  return (
    <View
      style={{ flex: 1, width: width ?? '100%', height, overflow: 'hidden' }}
      onLayout={e => {
        if (typeof width !== 'number') {
          const w = e.nativeEvent.layout.width;
          if (w && w !== measuredWidth) setMeasuredWidth(w);
        }
      }}
    >
      {finalWidth > 0 && (
        <Svg width={finalWidth} height={height}>
          {smoothed.map((p, i) => {
            const barWidth = finalWidth / Math.max(1, barCount);
            const w = Math.max(2, barWidth * 0.6);
            const h = Math.max(2, Math.pow(p, 0.85) * (height - 4)); // gentle emphasis
            const x = i * barWidth + (barWidth - w) / 2;
            const y = (height - h) / 2;
            const color = i <= playedBars ? playedColor : barColor;
            return <Rect key={i} x={x} y={y} width={w} height={h} rx={w / 3} fill={color} />;
          })}
        </Svg>
      )}
    </View>
  );
};

function smoothPeaks(values: number[], window: number): number[] {
  if (!values || values.length === 0) return [];
  const n = values.length;
  const out = new Array(n).fill(0);
  const w = Math.max(1, window | 0);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let count = 0;
    for (let j = i - w; j <= i + w; j++) {
      if (j >= 0 && j < n) {
        sum += values[j];
        count++;
      }
    }
    out[i] = count > 0 ? sum / count : values[i];
  }
  // Normalize after smoothing to ensure full height utilization
  const max = Math.max(0.0001, ...out);
  return out.map(v => v / max);
}

export default WaveformView;



