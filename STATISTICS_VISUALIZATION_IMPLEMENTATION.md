# Statistics Visualization Implementation

## Overview
Add interactive charts and graphs to display player, team, and tournament statistics.

## Library Choice: Recharts
We'll use **Recharts** - a composable charting library built on React components.

**Why Recharts?**
- Built specifically for React
- Responsive and mobile-friendly
- Easy to customize
- Good documentation
- Lightweight

## Installation

```bash
cd apps/frontend
npm install recharts
npm install --save-dev @types/recharts
```

## Chart Types to Implement

### 1. Player Statistics
- **Line Chart**: Performance trends over time
- **Radar Chart**: Multi-dimensional skill comparison
- **Bar Chart**: Statistics comparison across sports
- **Pie Chart**: Match outcomes (wins/losses/draws)

### 2. Team Statistics
- **Bar Chart**: Team performance comparison
- **Line Chart**: Points progression in tournaments
- **Area Chart**: Goals/points scored over time
- **Donut Chart**: Win/loss ratio

### 3. Tournament Statistics
- **Bar Chart**: Top performers
- **Line Chart**: Match scores progression
- **Scatter Plot**: Team performance distribution
- **Heatmap**: Match schedule/results

## Implementation Structure

```
apps/frontend/src/
├── components/
│   ├── charts/
│   │   ├── PlayerPerformanceChart.tsx
│   │   ├── PlayerSkillRadar.tsx
│   │   ├── TeamStatsChart.tsx
│   │   ├── TournamentStandingsChart.tsx
│   │   ├── MatchTrendsChart.tsx
│   │   └── StatsSummaryCards.tsx
│   └── stats/
│       ├── PlayerStatsView.tsx
│       ├── TeamStatsView.tsx
│       └── TournamentStatsView.tsx
└── pages/
    └── Stats.tsx (already exists, will enhance)
```

## Component Examples

### 1. Player Performance Line Chart

**File:** `apps/frontend/src/components/charts/PlayerPerformanceChart.tsx`

```typescript
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface PerformanceData {
  date: string;
  value: number;
  metric: string;
}

interface PlayerPerformanceChartProps {
  data: PerformanceData[];
  title: string;
  color?: string;
}

export const PlayerPerformanceChart: React.FC<PlayerPerformanceChartProps> = ({
  data,
  title,
  color = '#8884d8',
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
```

### 2. Player Skill Radar Chart

**File:** `apps/frontend/src/components/charts/PlayerSkillRadar.tsx`

```typescript
import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface SkillData {
  skill: string;
  value: number;
  fullMark: number;
}

interface PlayerSkillRadarProps {
  data: SkillData[];
  title: string;
  playerName: string;
}

export const PlayerSkillRadar: React.FC<PlayerSkillRadarProps> = ({
  data,
  title,
  playerName,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="skill" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} />
          <Radar
            name={playerName}
            dataKey="value"
            stroke="#8884d8"
            fill="#8884d8"
            fillOpacity={0.6}
          />
          <Tooltip />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
```

### 3. Team Statistics Bar Chart

**File:** `apps/frontend/src/components/charts/TeamStatsChart.tsx`

```typescript
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface TeamStatsData {
  name: string;
  wins: number;
  losses: number;
  draws: number;
}

interface TeamStatsChartProps {
  data: TeamStatsData[];
  title: string;
}

export const TeamStatsChart: React.FC<TeamStatsChartProps> = ({ data, title }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="wins" fill="#10b981" name="Wins" />
          <Bar dataKey="draws" fill="#f59e0b" name="Draws" />
          <Bar dataKey="losses" fill="#ef4444" name="Losses" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
```

### 4. Match Outcomes Pie Chart

**File:** `apps/frontend/src/components/charts/MatchOutcomesPie.tsx`

```typescript
import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

interface OutcomeData {
  name: string;
  value: number;
}

interface MatchOutcomesPieProps {
  data: OutcomeData[];
  title: string;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1'];

export const MatchOutcomesPie: React.FC<MatchOutcomesPieProps> = ({ data, title }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
```

### 5. Stats Summary Cards

**File:** `apps/frontend/src/components/charts/StatsSummaryCards.tsx`

```typescript
import React from 'react';

interface StatCard {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

interface StatsSummaryCardsProps {
  stats: StatCard[];
}

export const StatsSummaryCards: React.FC<StatsSummaryCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-white rounded-lg shadow-md p-6 border-l-4"
          style={{ borderLeftColor: stat.color }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              {stat.trend && (
                <p
                  className={`text-sm mt-1 ${
                    stat.trend.isPositive ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {stat.trend.isPositive ? '↑' : '↓'} {Math.abs(stat.trend.value)}%
                </p>
              )}
            </div>
            <div
              className="text-4xl"
              style={{ color: stat.color }}
            >
              {stat.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
```

## Enhanced Stats Page

**File:** `apps/frontend/src/pages/Stats.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import Navbar from '../components/Layout/Navbar';
import { PlayerPerformanceChart } from '../components/charts/PlayerPerformanceChart';
import { PlayerSkillRadar } from '../components/charts/PlayerSkillRadar';
import { TeamStatsChart } from '../components/charts/TeamStatsChart';
import { MatchOutcomesPie } from '../components/charts/MatchOutcomesPie';
import { StatsSummaryCards } from '../components/charts/StatsSummaryCards';

function Stats() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [skillData, setSkillData] = useState<any[]>([]);
  const [summaryStats, setSummaryStats] = useState<any[]>([]);
  const [outcomeData, setOutcomeData] = useState<any[]>([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const accessToken = localStorage.getItem('accessToken');
    
    if (!storedUser || !accessToken) {
      navigate('/login');
      return;
    }

    const userData = JSON.parse(storedUser);
    setUser(userData);
    fetchStats(userData);
  }, [navigate]);

  const fetchStats = async (userData: any) => {
    try {
      setLoading(true);

      // Fetch performance stats
      const statsResponse = await apiClient.get(`/users/${userData.id}/performance-stats`);
      const stats = statsResponse.data;

      // Transform data for charts
      if (stats.trends && stats.trends.length > 0) {
        const performanceChartData = stats.trends.map((trend: any) => ({
          date: new Date(trend.date).toLocaleDateString(),
          value: trend.value,
          metric: trend.metric,
        }));
        setPerformanceData(performanceChartData);
      }

      // Create skill radar data from aggregated stats
      if (stats.aggregated) {
        const skillRadarData = Object.entries(stats.aggregated).map(([key, value]) => ({
          skill: key.replace(/([A-Z])/g, ' $1').trim(),
          value: typeof value === 'number' ? value : 0,
          fullMark: 100,
        }));
        setSkillData(skillRadarData);
      }

      // Create summary cards
      const cards = [
        {
          label: 'Matches Played',
          value: stats.matchCount || 0,
          icon: '🏆',
          color: '#3b82f6',
        },
        {
          label: 'Average Performance',
          value: calculateAverage(stats.aggregated),
          icon: '📊',
          color: '#10b981',
        },
        {
          label: 'Sport',
          value: userData.sportProfiles?.[0]?.sport || 'N/A',
          icon: '⚽',
          color: '#f59e0b',
        },
        {
          label: 'Rank',
          value: 'Top 10%',
          icon: '🥇',
          color: '#8b5cf6',
        },
      ];
      setSummaryStats(cards);

      // Mock outcome data (replace with real data when available)
      setOutcomeData([
        { name: 'Wins', value: 15 },
        { name: 'Draws', value: 5 },
        { name: 'Losses', value: 10 },
      ]);

    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAverage = (stats: any) => {
    if (!stats) return 0;
    const values = Object.values(stats).filter(v => typeof v === 'number') as number[];
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return (sum / values.length).toFixed(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Performance Statistics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track your performance and progress over time
          </p>
        </div>

        {/* Summary Cards */}
        <StatsSummaryCards stats={summaryStats} />

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Performance Trend */}
          {performanceData.length > 0 && (
            <PlayerPerformanceChart
              data={performanceData}
              title="Performance Trend"
              color="#3b82f6"
            />
          )}

          {/* Match Outcomes */}
          <MatchOutcomesPie
            data={outcomeData}
            title="Match Outcomes"
          />
        </div>

        {/* Skill Radar - Full Width */}
        {skillData.length > 0 && (
          <div className="mb-6">
            <PlayerSkillRadar
              data={skillData}
              title="Skill Analysis"
              playerName={user?.profile?.name || 'Player'}
            />
          </div>
        )}

        {/* Additional Stats Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Detailed Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {user?.sportProfiles?.map((sp: any) => (
              <div key={sp.id} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">{sp.sport}</h4>
                <div className="space-y-2">
                  {Object.entries(sp.statistics || {}).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-gray-600 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}:
                      </span>
                      <span className="font-medium text-gray-900">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Stats;
```

## Data Transformation Utilities

**File:** `apps/frontend/src/utils/chartDataTransformers.ts`

```typescript
// Transform cricket stats for radar chart
export const transformCricketStatsToRadar = (stats: any) => {
  return [
    { skill: 'Runs', value: Math.min((stats.runs / 100) * 100, 100), fullMark: 100 },
    { skill: 'Wickets', value: Math.min((stats.wickets / 50) * 100, 100), fullMark: 100 },
    { skill: 'Batting Avg', value: Math.min((stats.battingAverage / 50) * 100, 100), fullMark: 100 },
    { skill: 'Strike Rate', value: Math.min(stats.strikeRate, 100), fullMark: 100 },
    { skill: 'Bowling Avg', value: Math.min((50 - stats.bowlingAverage) * 2, 100), fullMark: 100 },
  ];
};

// Transform football stats for radar chart
export const transformFootballStatsToRadar = (stats: any) => {
  return [
    { skill: 'Goals', value: Math.min((stats.goals / 20) * 100, 100), fullMark: 100 },
    { skill: 'Assists', value: Math.min((stats.assists / 15) * 100, 100), fullMark: 100 },
    { skill: 'Clean Sheets', value: Math.min((stats.cleanSheets / 10) * 100, 100), fullMark: 100 },
    { skill: 'Saves', value: Math.min((stats.saves / 50) * 100, 100), fullMark: 100 },
    { skill: 'Discipline', value: Math.min((10 - stats.yellowCards - stats.redCards * 2) * 10, 100), fullMark: 100 },
  ];
};

// Transform performance trends data
export const transformPerformanceTrends = (trends: any[]) => {
  return trends.map(trend => ({
    date: new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: trend.value,
    metric: trend.metric,
  }));
};

// Calculate win percentage
export const calculateWinPercentage = (wins: number, total: number) => {
  if (total === 0) return 0;
  return ((wins / total) * 100).toFixed(1);
};
```

## Styling Enhancements

Add to `apps/frontend/src/index.css`:

```css
/* Chart Container Styles */
.chart-container {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

/* Stat Card Animations */
.stat-card {
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

/* Chart Tooltip Custom Styles */
.recharts-tooltip-wrapper {
  outline: none;
}

.recharts-default-tooltip {
  background-color: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 0.375rem !important;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
}
```

## Implementation Steps

1. **Install Dependencies**
   ```bash
   cd apps/frontend
   npm install recharts
   npm install --save-dev @types/recharts
   ```

2. **Create Chart Components**
   - Create `apps/frontend/src/components/charts/` directory
   - Add all chart component files

3. **Create Utility Functions**
   - Create `apps/frontend/src/utils/chartDataTransformers.ts`

4. **Update Stats Page**
   - Replace existing Stats.tsx with enhanced version

5. **Test Charts**
   - Test with real data
   - Verify responsiveness
   - Check mobile view

## Features

✅ **Interactive Charts** - Hover tooltips, legends, responsive
✅ **Multiple Chart Types** - Line, Bar, Radar, Pie
✅ **Summary Cards** - Quick stats overview
✅ **Responsive Design** - Works on all screen sizes
✅ **Real-time Data** - Fetches from API
✅ **Sport-specific** - Different charts for different sports
✅ **Performance Trends** - Track progress over time
✅ **Skill Analysis** - Multi-dimensional comparison

## Future Enhancements

- Export charts as images
- Compare with other players
- Historical data filtering
- Custom date ranges
- Team comparison charts
- Tournament leaderboards
- Real-time updates via WebSocket
