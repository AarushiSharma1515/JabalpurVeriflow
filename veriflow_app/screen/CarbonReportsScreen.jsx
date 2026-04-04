import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Path,
  Circle,
  Text as SvgText,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop
} from 'react-native-svg';
import { Platform } from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

// --- Mock Data ---
const monthlyData = [
  { month: 'Jan', issued: 450, retired: 300 },
  { month: 'Feb', issued: 520, retired: 380 },
  { month: 'Mar', issued: 480, retired: 420 },
  { month: 'Apr', issued: 680, retired: 580 },
  { month: 'May', issued: 750, retired: 650 },
  { month: 'Jun', issued: 900, retired: 720 },
];

const distributionData = [
  { label: 'Mangrove', percentage: 45, color: '#4A90E2' },
  { label: 'Seagrass', percentage: 30, color: '#5FA3E8' },
  { label: 'Wetland', percentage: 20, color: '#7B68EE' },
  { label: 'Salt Marsh', percentage: 5, color: '#9180EE' },
];

const MAX_Y = 1000;
const CHART_HEIGHT = 240;
const BAR_HEIGHT_SCALE = CHART_HEIGHT / MAX_Y;

// ========================= BAR CHART =========================
const BarChart = () => {
  const [selectedBar, setSelectedBar] = useState(null);
  const groupCount = monthlyData.length;
  const availableWidth = CARD_WIDTH - 80;
  const totalBarWidth = availableWidth / groupCount;
  const barWidth = totalBarWidth / 2 - 8;

  return (
    <View style={barStyles.chartContainer}>
      {/* Y-Axis */}
      <View style={barStyles.yAxis}>
        {[1000, 750, 500, 250, 0].map((label, index) => (
          <Text key={index} style={barStyles.yAxisLabel}>{label}</Text>
        ))}
      </View>

      {/* Bars */}
      <View style={barStyles.gridAndBars}>
        {/* Grid Lines */}
        {[0, 25, 50, 75].map((top, index) => (
          <View key={index} style={[barStyles.gridLine, { top: `${top}%` }]} />
        ))}

        {monthlyData.map((data, index) => (
          <View key={index} style={[barStyles.barGroup, { width: totalBarWidth }]}>
            {/* Issued */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSelectedBar(`issued-${index}`)}
              style={barStyles.barWrapper}
            >
              <LinearGradient
                colors={
                  selectedBar === `issued-${index}`
                    ? ['#5FA3E8', '#4A90E2']
                    : ['#4A90E2', '#3A7FD5']
                }
                style={[
                  barStyles.bar,
                  {
                    height: Math.max(4, data.issued * BAR_HEIGHT_SCALE),
                    width: barWidth,
                  },
                ]}
              >
                {selectedBar === `issued-${index}` && (
                  <View style={barStyles.tooltip}>
                    <Text style={barStyles.tooltipText}>{data.issued}</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Retired */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSelectedBar(`retired-${index}`)}
              style={barStyles.barWrapper}
            >
              <LinearGradient
                colors={
                  selectedBar === `retired-${index}`
                    ? ['#9180EE', '#7B68EE']
                    : ['#7B68EE', '#6A58DD']
                }
                style={[
                  barStyles.bar,
                  {
                    height: Math.max(4, data.retired * BAR_HEIGHT_SCALE),
                    width: barWidth,
                  },
                ]}
              >
                {selectedBar === `retired-${index}` && (
                  <View style={barStyles.tooltip}>
                    <Text style={barStyles.tooltipText}>{data.retired}</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* X-Axis */}
      <View style={barStyles.xAxis}>
        {monthlyData.map((item, i) => (
          <View key={i} style={{ width: totalBarWidth, alignItems: 'center' }}>
            <Text style={barStyles.xAxisLabel}>{item.month}</Text>
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={barStyles.legend}>
        <View style={barStyles.legendItem}>
          <View style={[barStyles.legendDot, { backgroundColor: '#4A90E2' }]} />
          <Text style={barStyles.legendText}>Issued</Text>
        </View>
        <View style={barStyles.legendItem}>
          <View style={[barStyles.legendDot, { backgroundColor: '#7B68EE' }]} />
          <Text style={barStyles.legendText}>Retired</Text>
        </View>
      </View>
    </View>
  );
};

// ========================= PIE CHART =========================
const PieChart = () => {
  let cumulative = 0;
  const R = 45;
  const labelR = R + 20;
  const size = 100;
  const CX = size / 2;
  const CY = size / 2;

  const getCoord = (percent, radius) => {
    const angle = (percent / 100) * 2 * Math.PI - Math.PI / 2;
    return {
      x: CX + radius * Math.cos(angle),
      y: CY + radius * Math.sin(angle),
    };
  };

  const slices = distributionData.map((item) => {
    const start = cumulative;
    cumulative += item.percentage;

    const startCoord = getCoord(start, R);
    const endCoord = getCoord(cumulative, R);
    const mid = start + item.percentage / 2;
    const labelCoord = getCoord(mid, labelR);

    const largeArc = item.percentage > 50 ? 1 : 0;

    const d = `M ${CX} ${CY} L ${startCoord.x} ${startCoord.y} A ${R} ${R} 0 ${largeArc} 1 ${endCoord.x} ${endCoord.y} Z`;

    return { ...item, d, labelCoord };
  });

  return (
    <View style={pieStyles.chartContainer}>
      <View style={pieStyles.pieChartVisual}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            {slices.map((slice, idx) => (
              <SvgLinearGradient key={`g-${idx}`} id={`grad-${idx}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={slice.color} stopOpacity="1" />
                <Stop offset="100%" stopColor={slice.color} stopOpacity="0.7" />
              </SvgLinearGradient>
            ))}
          </Defs>

          {slices.map((slice, idx) => (
            <Path key={idx} d={slice.d} fill={`url(#grad-${idx})`} stroke="#fff" strokeWidth={1} />
          ))}

          {/* Center Bubble */}
          <Circle cx={CX} cy={CY} r={15} fill="#FFF" />
          <SvgText x={CX} y={CY - 2} fontSize={8} textAnchor="middle" fontWeight="bold" fill="#4A90E2">
            4
          </SvgText>
          <SvgText x={CX} y={CY + 7} fontSize={4} textAnchor="middle" fill="#444">
            Projects
          </SvgText>
        </Svg>
      </View>

      {/* Legend */}
      <View style={pieStyles.legendContainer}>
        {distributionData.map((item, idx) => (
          <View key={idx} style={pieStyles.legendItem}>
            <View style={[pieStyles.legendColorBox, { backgroundColor: item.color }]} />
            <Text style={pieStyles.legendLabel}>{item.label}</Text>
            <Text style={pieStyles.legendPercentage}>{item.percentage}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// ========================= STATS CARDS =========================
const StatsCards = () => {
  const stats = [
    { label: 'Total Credits', value: '4,780', change: '+12.5%', color: '#4A90E2' },
    { label: 'Active Projects', value: '24', change: '+3', color: '#7B68EE' },
    { label: 'Retired Credits', value: '3,050', change: '+8.3%', color: '#5FA3E8' },
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={mainStyles.statsContainer}>
      {stats.map((stat, index) => (
        <LinearGradient key={index} colors={['#fff', '#F8FFFE']} style={mainStyles.statCard}>
          <View style={mainStyles.statHeader}>
            <View />
            <View style={[mainStyles.changeBadge, { backgroundColor: `${stat.color}20` }]}>
              <Text style={[mainStyles.changeText, { color: stat.color }]}>{stat.change}</Text>
            </View>
          </View>
          <Text style={mainStyles.statValue}>{stat.value}</Text>
          <Text style={mainStyles.statLabel}>{stat.label}</Text>
        </LinearGradient>
      ))}
    </ScrollView>
  );
};

// ========================= MAIN SCREEN =========================
export default function CarbonReportsScreen() {
  return (
    <View style={{ flex: 1 }}>
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#4A90E2', '#7B68EE']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Safe Area (mobile) */}
      <SafeAreaView style={{ flex: 1 }} edges={Platform.OS === 'web' ? [] : ['top']}>
        
        {/* MAIN SCROLL — THIS MUST BE FLEX:1 + contentContainer */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: 24,
            paddingBottom: 200,
            minHeight: '100%',
          }}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}  // Web fix
        >

          {/* EVERYTHING INSIDE HERE SCROLLS */}
          <View style={{ flex: 1 }}>
            <View style={mainStyles.header}>
              <Text style={mainStyles.title}>Carbon Reports</Text>
              <Text style={mainStyles.subtitle}>Blue Carbon Credit Analytics</Text>
            </View>

            <StatsCards />

            <View style={mainStyles.chartCard}>
              <Text style={mainStyles.chartTitle}>Monthly Credits Overview</Text>
              <Text style={mainStyles.chartSubtitle}>Issued vs Retired Credits</Text>
              <BarChart />
            </View>

            <View style={mainStyles.chartCard}>
              <Text style={mainStyles.chartTitle}>Project Distribution</Text>
              <Text style={mainStyles.chartSubtitle}>By Ecosystem Type</Text>
              <PieChart />
            </View>

          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}



// ========================= STYLES =========================
const mainStyles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingVertical: 24, paddingBottom: 50 },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#FFFFFF', opacity: 0.9 },
  statsContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  statCard: {
    width: 170,
    padding: 20,
    marginRight: 16,
    borderRadius: 16,
    elevation: 4,
  },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  changeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  changeText: { fontSize: 12, fontWeight: '600' },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#4A90E2' },
  statLabel: { fontSize: 14, color: '#444' },
  chartCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 20,
    marginBottom: 25,
    elevation: 4,
  },
  chartTitle: { fontSize: 20, fontWeight: 'bold', color: '#4A90E2' },
  chartSubtitle: { fontSize: 14, color: '#555', marginBottom: 20 },
});

// BAR CHART styles
const barStyles = StyleSheet.create({
  chartContainer: { flexDirection: 'row', minHeight: CHART_HEIGHT + 150, marginBottom: 60 },
  yAxis: { width: 35, justifyContent: 'space-between' },
  yAxisLabel: { fontSize: 12, color: '#777', textAlign: 'right' },
  gridAndBars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', position: 'relative' },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#e5e5e5' },
  barGroup: { flexDirection: 'row', alignItems: 'flex-end' },
  barWrapper: { alignItems: 'center' },
  bar: { borderRadius: 4, justifyContent: 'flex-start', alignItems: 'center' },
  tooltip: { backgroundColor: 'black', padding: 4, borderRadius: 4, marginBottom: 4 },
  tooltipText: { color: 'white', fontSize: 10 },
  xAxis: { position: 'absolute', bottom: -25, width: '100%', flexDirection: 'row', justifyContent: 'space-around' },
  xAxisLabel: { fontSize: 12, color: '#777' },
  legend: { position: 'absolute', bottom: -50, width: '100%', flexDirection: 'row', justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { marginLeft: 6, fontSize: 12 },
});

// PIE STYLES
const pieStyles = StyleSheet.create({
  chartContainer: { alignItems: 'center', paddingVertical: 20 },
  pieChartVisual: { width: 200, height: 200 },
  legendContainer: { marginTop: 20, width: '100%' },
  legendItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10, marginBottom: 10 },
  legendColorBox: { width: 16, height: 16, borderRadius: 4, marginRight: 10 },
  legendLabel: { flex: 1, fontSize: 14 },
  legendPercentage: { fontSize: 14, fontWeight: 'bold' },
});
