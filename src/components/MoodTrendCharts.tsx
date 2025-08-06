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
import { LineChart, BarChart } from 'react-native-chart-kit';
import { MoodEntry } from '../types';
import { format, subDays, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns';

interface MoodTrendChartsProps {
  entries: MoodEntry[];
  isLoading: boolean;
}

type TimeRange = '7days' | '30days' | '90days' | 'all';
type ChartType = 'line' | 'bar';

const MoodTrendCharts: React.FC<MoodTrendChartsProps> = ({ entries, isLoading }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [chartData, setChartData] = useState<{
    labels: string[];
    datasets: { data: number[] }[];
    emotionFrequency: { [key: string]: number };
  }>({
    labels: [],
    datasets: [{ data: [] }],
    emotionFrequency: {},
  });

  const screenWidth = Dimensions.get('window').width - 60; // More conservative padding for mobile

  // Process data when entries or time range changes
  useEffect(() => {
    if (entries.length === 0) return;
    
    processChartData();
  }, [entries, timeRange]);

  // Process the chart data based on selected time range
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
      case '90days':
        startDate = subDays(endDate, 89); // Last 90 days including today
        break;
      case 'all':
      default:
        // Find the earliest entry date
        const timestamps = entries.map(entry => entry.timestamp);
        startDate = new Date(Math.min(...timestamps));
        break;
    }
    
    // Set start date to beginning of day
    startDate = startOfDay(startDate);
    
    // Generate all days in the range
    const daysInRange = eachDayOfInterval({ start: startDate, end: endDate });
    
    // Initialize data arrays
    const labels: string[] = [];
    const moodData: number[] = [];
    const emotionFrequency: { [key: string]: number } = {};
    
    // Process each day
    daysInRange.forEach(day => {
      // Format the label based on the time range
      let label: string;
      if (timeRange === '7days') {
        label = format(day, 'EEE'); // Mon, Tue, etc.
      } else {
        label = format(day, 'MMM d'); // Jan 1, Feb 2, etc.
      }
      labels.push(label);
      
      // Find entries for this day
      const dayStart = startOfDay(day).getTime();
      const dayEnd = endOfDay(day).getTime();
      
      const dayEntries = entries.filter(
        entry => entry.timestamp >= dayStart && entry.timestamp <= dayEnd
      );
      
      // Calculate average mood for the day
      if (dayEntries.length > 0) {
        const totalMood = dayEntries.reduce((sum, entry) => sum + entry.moodRating, 0);
        const avgMood = totalMood / dayEntries.length;
        moodData.push(avgMood);
        
        // Count emotions
        dayEntries.forEach(entry => {
          entry.emotionTags.forEach(emotion => {
            emotionFrequency[emotion] = (emotionFrequency[emotion] || 0) + 1;
          });
        });
      } else {
        // No entries for this day
        moodData.push(0); // Use 0 to indicate no data
      }
    });
    
    // Update chart data
    setChartData({
      labels,
      datasets: [{ data: moodData }],
      emotionFrequency,
    });
  };

  // Get top emotions
  const getTopEmotions = () => {
    return Object.entries(chartData.emotionFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // Get top 5 emotions
  };

  // Render the chart based on selected type
  const renderChart = () => {
    // Filter out days with no data (0 values)
    const filteredData = {
      labels: chartData.labels.filter((_, i) => chartData.datasets[0].data[i] !== 0),
      datasets: [
        {
          data: chartData.datasets[0].data.filter(value => value !== 0),
          color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
    
    // If no data after filtering, show empty state
    if (filteredData.labels.length === 0) {
      return (
        <View style={styles.emptyChartContainer}>
          <Text style={styles.emptyChartText}>No mood data available for this time range</Text>
        </View>
      );
    }
    
    const chartConfig = {
      backgroundGradientFrom: '#ffffff',
      backgroundGradientTo: '#ffffff',
      decimalPlaces: 1,
      color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
      style: {
        borderRadius: 16,
      },
      propsForDots: {
        r: '6',
        strokeWidth: '2',
        stroke: '#4a90e2',
      },
    };
    
    if (chartType === 'line') {
      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <LineChart
            data={filteredData}
            width={Math.max(screenWidth, filteredData.labels.length * 50)} // Ensure minimum width per data point
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            fromZero
            yAxisSuffix=""
            yAxisLabel=""
            yAxisInterval={1}
            segments={5}
          />
        </ScrollView>
      );
    } else {
      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <BarChart
            data={filteredData}
            width={Math.max(screenWidth, filteredData.labels.length * 50)} // Ensure minimum width per data point
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            fromZero
            yAxisSuffix=""
            yAxisLabel=""
            showBarTops={false}
          />
        </ScrollView>
      );
    }
  };

  // Render emotion frequency chart
  const renderEmotionFrequencyChart = () => {
    const topEmotions = getTopEmotions();
    
    if (topEmotions.length === 0) {
      return (
        <View style={styles.emptyChartContainer}>
          <Text style={styles.emptyChartText}>No emotion data available for this time range</Text>
        </View>
      );
    }
    
    const emotionData = {
      labels: topEmotions.map(([emotion]) => emotion),
      datasets: [
        {
          data: topEmotions.map(([_, count]) => count),
          color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
        },
      ],
    };
    
    const chartConfig = {
      backgroundGradientFrom: '#ffffff',
      backgroundGradientTo: '#ffffff',
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
      style: {
        borderRadius: 16,
      },
    };
    
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <BarChart
          data={emotionData}
          width={Math.max(screenWidth, topEmotions.length * 80)} // Ensure minimum width per emotion
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
          fromZero
          yAxisSuffix=""
          yAxisLabel=""
          showBarTops={false}
        />
      </ScrollView>
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
        
        <View style={styles.controlsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.timeRangeContainer}>
              <TouchableOpacity
                style={[styles.timeRangeButton, timeRange === '7days' && styles.activeButton]}
                onPress={() => setTimeRange('7days')}
              >
                <Text style={timeRange === '7days' ? styles.activeButtonText : styles.buttonText}>
                  7 Days
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timeRangeButton, timeRange === '30days' && styles.activeButton]}
                onPress={() => setTimeRange('30days')}
              >
                <Text style={timeRange === '30days' ? styles.activeButtonText : styles.buttonText}>
                  30 Days
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timeRangeButton, timeRange === '90days' && styles.activeButton]}
                onPress={() => setTimeRange('90days')}
              >
                <Text style={timeRange === '90days' ? styles.activeButtonText : styles.buttonText}>
                  90 Days
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timeRangeButton, timeRange === 'all' && styles.activeButton]}
                onPress={() => setTimeRange('all')}
              >
                <Text style={timeRange === 'all' ? styles.activeButtonText : styles.buttonText}>
                  All Time
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          
          <View style={styles.chartTypeContainer}>
            <TouchableOpacity
              style={[styles.chartTypeButton, chartType === 'line' && styles.activeButton]}
              onPress={() => setChartType('line')}
            >
              <Text style={chartType === 'line' ? styles.activeButtonText : styles.buttonText}>
                Line
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chartTypeButton, chartType === 'bar' && styles.activeButton]}
              onPress={() => setChartType('bar')}
            >
              <Text style={chartType === 'bar' ? styles.activeButtonText : styles.buttonText}>
                Bar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {renderChart()}
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {chartData.datasets[0].data.filter(v => v > 0).length}
            </Text>
            <Text style={styles.statLabel}>Days Logged</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {chartData.datasets[0].data.filter(v => v > 0).length > 0
                ? (
                    chartData.datasets[0].data.reduce((sum, val) => sum + (val > 0 ? val : 0), 0) /
                    chartData.datasets[0].data.filter(v => v > 0).length
                  ).toFixed(1)
                : 'N/A'}
            </Text>
            <Text style={styles.statLabel}>Avg Mood</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {Math.max(...chartData.datasets[0].data) > 0
                ? Math.max(...chartData.datasets[0].data).toFixed(1)
                : 'N/A'}
            </Text>
            <Text style={styles.statLabel}>Highest</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {Math.min(...chartData.datasets[0].data.filter(v => v > 0)) > 0
                ? Math.min(...chartData.datasets[0].data.filter(v => v > 0)).toFixed(1)
                : 'N/A'}
            </Text>
            <Text style={styles.statLabel}>Lowest</Text>
          </View>
        </View>
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
});

export default MoodTrendCharts;