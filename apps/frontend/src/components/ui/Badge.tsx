import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'player' | 'team' | 'org' | 'admin' | 'success' | 'warning' | 'error' | 'default';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  className?: string;
}

export default function Badge({ 
  children, 
  variant = 'default', 
  size = 'md',
  icon,
  className = '' 
}: BadgeProps) {
  const variantClasses = {
    player: 'badge-player',
    team: 'badge-team',
    org: 'badge-org',
    admin: 'badge-admin',
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
    default: 'badge bg-gray-100 text-gray-700 border-gray-200',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: '',
    lg: 'badge-lg',
  };

  return (
    <span className={`${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {icon && <span>{icon}</span>}
      {children}
    </span>
  );
}
