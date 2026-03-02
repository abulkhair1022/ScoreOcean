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
  metric?: string;
}

interface PlayerPerformanceChartProps {
  data: PerformanceData[];
  title: string;
  color?: string;
}

export const PlayerPerformanceChart: React.FC<PlayerPerformanceChartProps> = ({
  data,
  title,
  color = '#3b82f6',
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ r: 4, fill: color }}
            activeDot={{ r: 6, fill: color }}
            name="Performance"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
