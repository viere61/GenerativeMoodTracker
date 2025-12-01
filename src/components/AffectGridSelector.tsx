import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, LayoutChangeEvent, Animated } from 'react-native';

type AffectGridSelectorProps = {
  valence: number | null; // 1..10 (x axis)
  intensity: number | null; // 1..10 (y axis)
  onChange: (valence: number, intensity: number) => void;
  onValidationChange?: (valid: boolean) => void;
  size?: number; // square size in px
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// Maps 1..10 -> 0..1 (inclusive)
const toUnit = (n: number | null) => {
  if (n == null) return null;
  return clamp((n - 1) / 9, 0, 1);
};

// Maps 0..1 -> 1..10 (rounded)
const fromUnit = (u: number) => {
  return clamp(Math.round(1 + u * 9), 1, 10);
};

const AffectGridSelector: React.FC<AffectGridSelectorProps> = ({
  valence,
  intensity,
  onChange,
  onValidationChange,
  size = 240,
}) => {
  const [boxSize, setBoxSize] = useState<number>(size);
  const dotX = useRef(new Animated.Value(0)).current;
  const dotY = useRef(new Animated.Value(0)).current;
  const measured = useRef(false);

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    const s = Math.min(w, size);
    setBoxSize(s);
    measured.current = true;

    // Position dot if we already have values
    const ux = toUnit(valence ?? null);
    const uy = toUnit(intensity ?? null);
    if (ux != null && uy != null) {
      const x = ux * s;
      const y = (1 - uy) * s; // invert: high at top
      dotX.setValue(x - 8);
      dotY.setValue(y - 8);
    }
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          if (!measured.current) return;
          const local = evt.nativeEvent;
          const x = clamp(local.locationX, 0, boxSize);
          const y = clamp(local.locationY, 0, boxSize);
          dotX.setValue(x - 8);
          dotY.setValue(y - 8);
          const v = fromUnit(x / boxSize);
          const i = fromUnit(1 - y / boxSize);
          onChange(v, i);
          onValidationChange?.(true);
        },
        onPanResponderMove: (evt) => {
          if (!measured.current) return;
          const local = evt.nativeEvent;
          const x = clamp(local.locationX, 0, boxSize);
          const y = clamp(local.locationY, 0, boxSize);
          dotX.setValue(x - 8);
          dotY.setValue(y - 8);
          const v = fromUnit(x / boxSize);
          const i = fromUnit(1 - y / boxSize);
          onChange(v, i);
        },
        onPanResponderRelease: () => {},
        onPanResponderTerminationRequest: () => false,
      }),
    [boxSize, dotX, dotY, onChange, onValidationChange]
  );

  return (
    <View>
      <View style={styles.axisLabelsRow}>
        <Text style={styles.axisYTop}>High Intensity</Text>
      </View>
      <View style={[styles.gridContainer]} onLayout={handleLayout} {...pan.panHandlers}>
        {/* Axes */}
        <View style={[styles.axisLineVertical, { left: boxSize / 2 }]} />
        <View style={[styles.axisLineHorizontal, { top: boxSize / 2 }]} />

        {/* Dot */}
        <Animated.View style={[styles.dot, { transform: [{ translateX: dotX }, { translateY: dotY }] }]} />
      </View>
      <View style={styles.axisLabelsRow}>
        <Text style={styles.axisXLeft}>Low Valence</Text>
        <Text style={styles.axisXRight}>High Valence</Text>
      </View>
      <View style={styles.axisLabelsRowBottom}>
        <Text style={styles.axisYBottom}>Low Intensity</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  gridContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  axisLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#cbd5e1',
  },
  axisLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#cbd5e1',
  },
  dot: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4a90e2',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 2,
  },
  axisLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  axisLabelsRowBottom: {
    alignItems: 'center',
    marginTop: 6,
  },
  axisXLeft: { color: '#6b7280', fontSize: 12 },
  axisXRight: { color: '#6b7280', fontSize: 12 },
  axisYTop: { color: '#6b7280', fontSize: 12, textAlign: 'center', width: '100%', marginBottom: 6 },
  axisYBottom: { color: '#6b7280', fontSize: 12, textAlign: 'center' },
});

export default AffectGridSelector;



