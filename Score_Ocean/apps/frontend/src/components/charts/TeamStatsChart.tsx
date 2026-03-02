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
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12, fill: '#6b7280' }}
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
          <Bar dataKey="wins" fill="#10b981" name="Wins" />
          <Bar dataKey="draws" fill="#f59e0b" name="Draws" />
          <Bar dataKey="losses" fill="#ef4444" name="Losses" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
