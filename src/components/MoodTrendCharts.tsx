import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { MoodEntry } from '../types';
import { format, subDays, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns';

interface MoodTrendChartsProps {
  entries: MoodEntry[];
  isLoading: boolean;
}

type TimeRange = '7days' | '30days' | '180days' | '365days';

const MoodTrendCharts: React.FC<MoodTrendChartsProps> = ({ entries, isLoading }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');
  const [chartData, setChartData] = useState<{ points: MoodEntry[]; startDate: Date; endDate: Date; emotionFrequency: { [key: string]: number } }>({
    points: [],
    startDate: new Date(),
    endDate: new Date(),
    emotionFrequency: {},
  });
  const [visibleRange, setVisibleRange] = useState<{ start: Date; end: Date } | null>(null);

  // Local helper to color-code points by mood level
  const getMoodColor = (rating: number): string => {
    if (rating >= 8) return '#4CAF50'; // high mood
    if (rating >= 5) return '#FFC107'; // medium mood
    return '#F44336'; // low mood
  };

  const screenWidth = Dimensions.get('window').width - 60; // More conservative padding for mobile

  // Process data when entries or time range changes
  useEffect(() => {
    if (entries.length === 0) return;
    
    processChartData();
  }, [entries, timeRange]);

  // Process the chart data based on selected time range (scatter of individual entries)
  const processChartData = () => {
    // Get the date range based on selected time range
    const endDate = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case '7days':
        startDate = subDays(endDate, 6); // Last 7 days including today
        break;
      case '30days':
        startDate = subDays(endDate, 29); // Last 30 days including today
        break;
      case '180days':
        startDate = subDays(endDate, 179); // Last 6 months (~180 days)
        break;
      case '365days':
        startDate = subDays(endDate, 364); // Last year
        break;
      default:
        startDate = subDays(endDate, 29);
        break;
    }
    
    // Set start date to beginning of day
    startDate = startOfDay(startDate);
    
    // Collect points within range (use individual entries)
    const startTs = startDate.getTime();
    const endTs = endOfDay(endDate).getTime();
    const points = entries.filter(e => e.timestamp >= startTs && e.timestamp <= endTs);

    // Emotion frequency for the period
    const emotionFrequency: { [key: string]: number } = {};
    points.forEach(entry => {
      entry.emotionTags.forEach(emotion => {
        emotionFrequency[emotion] = (emotionFrequency[emotion] || 0) + 1;
      });
    });

    setChartData({ points, startDate, endDate, emotionFrequency });
  };

  // Get top emotions
  const getTopEmotions = () => {
    return Object.entries(chartData.emotionFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // Get top 5 emotions
  };

  // Render a custom scatter chart similar to the provided design
  const renderChart = () => {
    const { points, startDate, endDate } = chartData;
    if (points.length === 0) {
      return (
        <View style={styles.emptyChartContainer}>
          <Text style={styles.emptyChartText}>No mood data available for this time range</Text>
        </View>
      );
    }

    const startTs = startOfDay(startDate).getTime();
    const endTs = endOfDay(endDate).getTime();
    const span = Math.max(1, endTs - startTs);
    const totalWidth = screenWidth; // Always fit within the screen width
    const totalHeight = 240;
    const leftPadding = 16;
    const rightPadding = 100; // space for y-axis labels (tighter to give plot more room)
    const topPadding = 12;
    const bottomPadding = 24; // space for x ticks

    const plotWidth = totalWidth - leftPadding - rightPadding;
    const plotHeight = totalHeight - topPadding - bottomPadding;

    const minY = 1;
    const maxY = 10;

    const toX = (ts: number) => leftPadding + ((ts - startTs) / span) * plotWidth;
    const toY = (rating: number) => topPadding + (1 - (rating - minY) / (maxY - minY)) * plotHeight;

    // Build a few vertical tick marks (4)
    const ticks = [0.2, 0.4, 0.6, 0.8];
    const tickLabels = ticks.map(t => {
      const ts = startTs + t * span;
      const days = span / (24 * 60 * 60 * 1000);
      if (days > 120) {
        return format(new Date(ts), 'MMM');
      }
      return format(new Date(ts), 'd');
    });

    const axisLabelLeft = leftPadding + plotWidth + 10; // slight left shift to avoid clipping
    const viewportPlotWidth = Math.min(plotWidth, screenWidth - leftPadding - rightPadding);
    
    const handleScroll = (x: number) => {
      const leftPlotX = Math.max(leftPadding, Math.min(leftPadding + plotWidth - viewportPlotWidth, x + leftPadding));
      const leftFraction = (leftPlotX - leftPadding) / plotWidth;
      const viewStartTs = startTs + leftFraction * span;
      const viewEndTs = viewStartTs + (viewportPlotWidth / plotWidth) * span;
      setVisibleRange({ start: new Date(viewStartTs), end: new Date(viewEndTs) });
    };

    return (
      <ScrollView horizontal={false}>
        <View style={[styles.scatterContainer, { width: totalWidth, height: totalHeight }]}
          accessibilityLabel="Mood scatter chart"
        >
          {/* Grid: horizontal lines at top/middle/bottom */}
          {[0, 0.5, 1].map((p, idx) => (
            <View key={`h-${idx}`} style={{
              position: 'absolute',
              left: leftPadding,
              right: rightPadding,
              top: topPadding + p * plotHeight,
              height: 1,
              backgroundColor: '#e5e5e5'
            }} />
          ))}

          {/* Vertical tick lines */}
          {ticks.map((t, idx) => (
            <View key={`v-${idx}`} style={{
              position: 'absolute',
              top: topPadding,
              bottom: bottomPadding,
              left: leftPadding + t * plotWidth,
              width: 1,
              backgroundColor: '#eeeeee'
            }} />
          ))}

          {/* Points */}
          {points.map((p, i) => (
            <View key={p.entryId || i} style={{
              position: 'absolute',
              left: toX(p.timestamp) - 6,
              top: toY(p.moodRating) - 6,
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: getMoodColor(p.moodRating),
              borderWidth: 2,
              borderColor: 'white',
              shadowColor: '#000',
              shadowOpacity: 0.1,
              shadowRadius: 2,
              shadowOffset: { width: 0, height: 1 },
            }} />
          ))}

          {/* Y-axis labels on the right side of plot */}
          <Text style={[styles.axisYLabel, { left: axisLabelLeft, top: topPadding - 10, width: rightPadding - 12 }]}>
            {`Very\nPleasant`}
          </Text>
          <Text style={[styles.axisYLabel, { left: axisLabelLeft, top: topPadding + (plotHeight / 2) - 12, width: rightPadding - 12 }]}>Neutral</Text>
          <Text style={[styles.axisYLabel, { left: axisLabelLeft, top: topPadding + plotHeight - 18, width: rightPadding - 12 }]}>
            {`Very\nUnpleasant`}
          </Text>

          {/* X tick labels */}
          {ticks.map((t, idx) => (
            <Text key={`t-${idx}`} style={{
              position: 'absolute',
              top: topPadding + plotHeight + 6,
              left: leftPadding + t * plotWidth - 8,
              fontSize: 10,
              color: '#999'
            }}>{tickLabels[idx]}</Text>
          ))}
        </View>
      </ScrollView>
    );
  };

  // Render emotion frequency as a simple list with progress bars (no BarChart)
  const renderEmotionFrequencyChart = () => {
    const topEmotions = getTopEmotions();
    if (topEmotions.length === 0) {
      return (
        <View style={styles.emptyChartContainer}>
          <Text style={styles.emptyChartText}>No emotion data available for this time range</Text>
        </View>
      );
    }

    const maxCount = Math.max(...topEmotions.map(([, count]) => count));

    return (
      <View>
        {topEmotions.map(([emotion, count]) => (
          <View key={emotion} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14 }}>{emotion}</Text>
              <Text style={{ fontSize: 12, color: '#666' }}>{count}</Text>
            </View>
            <View style={{ height: 8, backgroundColor: '#eee', borderRadius: 4, overflow: 'hidden', marginTop: 6 }}>
              <View style={{ width: `${(count / maxCount) * 100}%`, backgroundColor: '#8641f4', height: '100%' }} />
            </View>
          </View>
        ))}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading charts...</Text>
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No mood entries available</Text>
        <Text style={styles.emptySubtext}>Start tracking your mood to see trends</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Mood Trends</Text>
        <Text style={{ color: '#666', marginBottom: 8 }}>
          {`${chartData.points.length} entries`}
        </Text>
        <Text style={{ color: '#999', marginBottom: 12 }}>
          {visibleRange
            ? `${format(visibleRange.start, 'MMM d')} – ${format(visibleRange.end, 'MMM d, yyyy')}`
            : `${format(chartData.startDate, 'MMM d')} – ${format(chartData.endDate, 'MMM d, yyyy')}`}
        </Text>
        
        <View style={styles.controlsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.timeRangeContainer}>
              <TouchableOpacity
                style={[styles.timeRangeButton, timeRange === '7days' && styles.activeButton]}
                onPress={() => setTimeRange('7days')}
              >
                <Text style={timeRange === '7days' ? styles.activeButtonText : styles.buttonText}>W</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timeRangeButton, timeRange === '30days' && styles.activeButton]}
                onPress={() => setTimeRange('30days')}
              >
                <Text style={timeRange === '30days' ? styles.activeButtonText : styles.buttonText}>M</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timeRangeButton, timeRange === '180days' && styles.activeButton]}
                onPress={() => setTimeRange('180days')}
              >
                <Text style={timeRange === '180days' ? styles.activeButtonText : styles.buttonText}>6M</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timeRangeButton, timeRange === '365days' && styles.activeButton]}
                onPress={() => setTimeRange('365days')}
              >
                <Text style={timeRange === '365days' ? styles.activeButtonText : styles.buttonText}>Y</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
        
        {renderChart()}
        {/* Summary stats removed per request */}
      </View>
      
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Top Emotions</Text>
        {renderEmotionFrequencyChart()}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  controlsContainer: {
    marginBottom: 15,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  timeRangeButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  chartTypeContainer: {
    flexDirection: 'row',
  },
  chartTypeButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  activeButton: {
    backgroundColor: '#4a90e2',
  },
  buttonText: {
    color: '#333',
  },
  activeButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  scatterContainer: {
    backgroundColor: '#fff',
  },
  emptyChartContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    marginVertical: 8,
  },
  emptyChartText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4a90e2',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  axisYLabel: {
    position: 'absolute',
    textAlign: 'left',
    color: '#222',
    fontSize: 14,
    lineHeight: 16,
  },
});

export default MoodTrendCharts;