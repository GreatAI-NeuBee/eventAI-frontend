import React from 'react';
import { AlertTriangle, Info, CheckCircle, Clock } from 'lucide-react';
import Card from '../common/Card';

interface Recommendation {
  id: string;
  type: 'warning' | 'info' | 'success';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action: string;
  location?: string;
  density?: number;
  timestamp?: string;
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  onActionClick?: (recommendation: Recommendation) => void;
  onLocationClick?: (location: string) => void;
  isHighlighted?: boolean;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  onActionClick,
  onLocationClick,
  isHighlighted = false,
}) => {
  const { type, title, description, priority, action, location, density, timestamp } = recommendation;

  // Get icon based on type
  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      case 'info':
        return <Info className="h-5 w-5" />;
      case 'success':
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  // Get colors based on type and priority
  const getTypeColors = () => {
    switch (type) {
      case 'warning':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-600',
          title: 'text-red-900',
          text: 'text-red-700',
          button: 'bg-red-600 hover:bg-red-700 text-white',
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-600',
          title: 'text-blue-900',
          text: 'text-blue-700',
          button: 'bg-blue-600 hover:bg-blue-700 text-white',
        };
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: 'text-green-600',
          title: 'text-green-900',
          text: 'text-green-700',
          button: 'bg-green-600 hover:bg-green-700 text-white',
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          icon: 'text-gray-600',
          title: 'text-gray-900',
          text: 'text-gray-700',
          button: 'bg-gray-600 hover:bg-gray-700 text-white',
        };
    }
  };

  // Get priority indicator
  const getPriorityBadge = () => {
    const priorityColors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800',
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${priorityColors[priority]}`}>
        <Clock className="w-3 h-3 mr-1" />
        {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
      </span>
    );
  };

  const colors = getTypeColors();

  return (
    <Card 
      className={`${colors.bg} ${colors.border} border transition-all hover:shadow-md ${
        isHighlighted ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
      }`}
      padding="md"
    >
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${colors.icon}`}>
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <h4 className={`text-sm font-semibold ${colors.title}`}>
              {title}
            </h4>
            {getPriorityBadge()}
          </div>

          {/* Description */}
          <p className={`text-sm ${colors.text} mb-3`}>
            {description}
          </p>

          {/* Additional Info */}
          {(location || density !== undefined || timestamp) && (
            <div className="flex flex-wrap gap-2 mb-3 text-xs text-gray-600">
              {location && (
                <span 
                  className="inline-flex items-center px-2 py-1 bg-gray-100 rounded cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => onLocationClick?.(location)}
                >
                  📍 {location}
                </span>
              )}
              {density !== undefined && (
                <span className="inline-flex items-center px-2 py-1 bg-gray-100 rounded">
                  📊 {Math.round(density * 100)}% density
                </span>
              )}
              {timestamp && (
                <span className="inline-flex items-center px-2 py-1 bg-gray-100 rounded">
                  🕒 {new Date(timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
          )}

          {/* Action Button */}
          {action && (
            <button
              onClick={() => onActionClick?.(recommendation)}
              className={`inline-flex items-center px-3 py-2 text-xs font-medium rounded-md transition-colors ${colors.button}`}
            >
              {action}
            </button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default RecommendationCard;
