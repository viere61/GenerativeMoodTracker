import React from 'react';
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

interface WaveformViewProps {
  peaks: number[];
  progress: number; // 0..1
  width?: number;
  height?: number;
  barColor?: string;
  playedColor?: string;
}

const WaveformView: React.FC<WaveformViewProps> = ({
  peaks,
  progress,
  width = 300,
  height = 40,
  barColor = '#d0d7de',
  playedColor = '#4a90e2',
}) => {
  const barCount = peaks.length || 0;
  const barWidth = barCount > 0 ? width / barCount : width;
  const playedBars = Math.floor(barCount * Math.max(0, Math.min(1, progress)));

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {peaks.map((p, i) => {
          const h = Math.max(2, p * height);
          const x = i * barWidth + barWidth * 0.15;
          const w = barWidth * 0.7;
          const y = (height - h) / 2;
          const color = i <= playedBars ? playedColor : barColor;
          return <Rect key={i} x={x} y={y} width={w} height={h} rx={w / 3} fill={color} />;
        })}
      </Svg>
    </View>
  );
};

export default WaveformView;


