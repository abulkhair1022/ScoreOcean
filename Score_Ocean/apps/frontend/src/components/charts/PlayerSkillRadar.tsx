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
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis 
            dataKey="skill" 
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
          />
          <Radar
            name={playerName}
            dataKey="value"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.6}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
