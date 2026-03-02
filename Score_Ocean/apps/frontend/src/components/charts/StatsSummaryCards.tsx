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
          className="bg-white rounded-lg shadow-md p-6 border-l-4 hover:shadow-lg transition-shadow"
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
