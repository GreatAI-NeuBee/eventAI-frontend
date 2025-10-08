import React, { useContext } from 'react';
import { TrendingUp, Zap, Calendar, UserCheck } from 'lucide-react';
import GlassCard from '../common/GlassCard';
import { WeatherContext } from '../common/WeatherBackground';
import type { PopularityContent } from '../../types/simulation';

interface PopularityInsightsProps {
  popularityContent: PopularityContent;
}

const PopularityInsights: React.FC<PopularityInsightsProps> = ({ popularityContent }) => {
  const { isDarkBackground, isRainBackground } = useContext(WeatherContext);
  
  const getTextColor = () => (isDarkBackground || isRainBackground) ? 'text-white' : 'text-gray-900';
  const getSecondaryTextColor = () => (isDarkBackground || isRainBackground) ? 'text-white/80' : 'text-gray-700';
  const getMutedTextColor = () => (isDarkBackground || isRainBackground) ? 'text-white/60' : 'text-gray-500';
  const getBorderColor = () => (isDarkBackground || isRainBackground) ? 'border-white/20' : 'border-gray-200';
  
  // Special background for sections in rain
  const getSectionBgColor = () => {
    if (isDarkBackground) return 'bg-white/5'; // Storm - light
    if (isRainBackground) return 'bg-gray-800/40'; // Rain - darker
    return 'bg-gray-50'; // Clear/Sunny
  };
  
  const getHighlightBgColor = () => {
    if (isDarkBackground) return 'bg-orange-500/10'; // Storm
    if (isRainBackground) return 'bg-orange-900/30'; // Rain - darker orange
    return 'bg-orange-50'; // Clear/Sunny
  };

  const {
    popularityScore,
    historicalIncidents,
    audienceDemographics,
    operationalRecommendations,
    metadata
  } = popularityContent;

  return (
    <GlassCard intensity="medium" blur="md">
      {/* Header Section */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <TrendingUp className={`h-6 w-6 ${isDarkBackground ? 'text-purple-300' : 'text-purple-600'}`} />
          </div>
          <div>
            <h2 className={`text-2xl font-bold ${getTextColor()}`}>AI Popularity Analysis</h2>
            <p className={`text-sm ${getMutedTextColor()} mt-1`}>
              Powered by {metadata?.modelVersion || 'AI'}  
            </p>
          </div>
        </div>
     
      </div>

      {/* Popularity Score */}
      {popularityScore !== undefined && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${getSecondaryTextColor()}`}>Popularity Score</span>
            <span className={`text-2xl font-bold ${getTextColor()}`}>{popularityScore}/100</span>
          </div>
          <div className={`w-full h-3 rounded-full overflow-hidden ${isDarkBackground ? 'bg-white/10' : 'bg-gray-200'}`}>
            <div 
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500"
              style={{ width: `${popularityScore}%` }}
            />
          </div>
        </div>
      )}

      {/* Event Type Info */}
      {metadata?.inputData && (
        <div className={`mb-6 p-3 rounded-lg border ${getBorderColor()} ${getSectionBgColor()}`}>
          <div className="flex flex-wrap gap-4">
            {metadata.inputData.type && (
              <div className="flex items-center gap-2">
                <Zap className={`h-4 w-4 ${getMutedTextColor()}`} />
                <span className={`text-sm ${getSecondaryTextColor()}`}>
                  <span className={getMutedTextColor()}>Type:</span> <span className="font-medium capitalize">{metadata.inputData.type}</span>
                </span>
              </div>
            )}
            {metadata.inputData.feat && (
              <div className="flex items-center gap-2">
                <UserCheck className={`h-4 w-4 ${getMutedTextColor()}`} />
                <span className={`text-sm ${getSecondaryTextColor()}`}>
                  <span className={getMutedTextColor()}>Featured:</span> <span className="font-medium">{metadata.inputData.feat}</span>
                </span>
              </div>
            )}
            {metadata.inputData.location && (
              <div className="flex items-center gap-2">
                <Calendar className={`h-4 w-4 ${getMutedTextColor()}`} />
                <span className={`text-sm ${getSecondaryTextColor()}`}>
                  <span className={getMutedTextColor()}>Location:</span> <span className="font-medium">{metadata.inputData.location}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audience Demographics */}
      {audienceDemographics && (
        <div className="mb-6">
          <h3 className={`text-lg font-semibold ${getTextColor()} mb-4`}>Audience Demographics</h3>
          
          {/* Age Groups Chart */}
          {audienceDemographics.ageGroups && (
            <div className="mb-4">
              <h4 className={`text-sm font-medium ${getSecondaryTextColor()} mb-3`}>Age Distribution</h4>
              <div className="space-y-2">
                {Object.entries(audienceDemographics.ageGroups).map(([group, percentage]) => (
                  <div key={group}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm ${getSecondaryTextColor()} capitalize`}>{group.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className={`text-sm font-medium ${getTextColor()}`}>{percentage}%</span>
                    </div>
                    <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkBackground ? 'bg-white/10' : 'bg-gray-200'}`}>
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-600 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Behavior Profile */}
          {(audienceDemographics.behaviorProfile || audienceDemographics.primaryAgeRange || audienceDemographics.mobilityConsiderations) && (
            <div className="space-y-2">
              {audienceDemographics.behaviorProfile && (
                <div className={`p-3 rounded-lg border ${getBorderColor()} ${getSectionBgColor()}`}>
                  <span className={`text-xs font-medium ${getMutedTextColor()}`}>Behavior Profile</span>
                  <p className={`text-sm ${getSecondaryTextColor()} mt-1`}>{audienceDemographics.behaviorProfile}</p>
                </div>
              )}
              {audienceDemographics.primaryAgeRange && (
                <div className={`p-3 rounded-lg border ${getBorderColor()} ${getSectionBgColor()}`}>
                  <span className={`text-xs font-medium ${getMutedTextColor()}`}>Primary Age Range</span>
                  <p className={`text-sm ${getSecondaryTextColor()} mt-1`}>{audienceDemographics.primaryAgeRange}</p>
                </div>
              )}
              {audienceDemographics.mobilityConsiderations && (
                <div className={`p-3 rounded-lg border ${getBorderColor()} ${getSectionBgColor()}`}>
                  <span className={`text-xs font-medium ${getMutedTextColor()}`}>Mobility Considerations</span>
                  <p className={`text-sm ${getSecondaryTextColor()} mt-1`}>{audienceDemographics.mobilityConsiderations}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Historical Incidents */}
      {historicalIncidents && historicalIncidents.length > 0 && (
        <div className="mb-6">
          <h3 className={`text-lg font-semibold ${getTextColor()} mb-4`}>Historical Incidents</h3>
          <div className="space-y-3">
            {historicalIncidents.map((incident, index) => (
              <div key={index} className={`p-4 rounded-lg border ${getBorderColor()} ${getHighlightBgColor()}`}>
                <div className="flex items-start justify-between mb-2">
                  <span className={`text-sm font-medium ${getTextColor()}`}>{incident.incident}</span>
                  {incident.date && (
                    <span className={`text-xs ${getMutedTextColor()}`}>{new Date(incident.date).toLocaleDateString()}</span>
                  )}
                </div>
                {incident.cause && (
                  <p className={`text-sm ${getSecondaryTextColor()} mb-1`}>
                    <span className="font-medium">Cause:</span> {incident.cause}
                  </p>
                )}
                {incident.casualties && (
                  <p className={`text-sm ${getSecondaryTextColor()}`}>
                    <span className="font-medium">Impact:</span> {incident.casualties}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operational Recommendations */}
      {operationalRecommendations && (
        <div>
          <h3 className={`text-lg font-semibold ${getTextColor()} mb-4`}>Operational Recommendations</h3>

          <div className="space-y-4">
            {/* Entrance Management */}
            {operationalRecommendations.entranceManagement && operationalRecommendations.entranceManagement.length > 0 && (
              <div>
                <h4 className={`text-sm font-semibold ${getTextColor()} mb-2`}>Entrance Management</h4>
                <ul className="space-y-2">
                  {operationalRecommendations.entranceManagement.map((item, index) => (
                    <li key={index} className={`flex items-start gap-2 text-sm ${getSecondaryTextColor()}`}>
                      <span className="text-green-500 mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Emergency Preparedness */}
            {operationalRecommendations.emergencyPreparedness && operationalRecommendations.emergencyPreparedness.length > 0 && (
              <div>
                <h4 className={`text-sm font-semibold ${getTextColor()} mb-2`}>Emergency Preparedness</h4>
                <ul className="space-y-2">
                  {operationalRecommendations.emergencyPreparedness.map((item, index) => (
                    <li key={index} className={`flex items-start gap-2 text-sm ${getSecondaryTextColor()}`}>
                      <span className="text-red-500 mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Special Considerations */}
            {operationalRecommendations.specialConsiderations && operationalRecommendations.specialConsiderations.length > 0 && (
              <div>
                <h4 className={`text-sm font-semibold ${getTextColor()} mb-2`}>Special Considerations</h4>
                <ul className="space-y-2">
                  {operationalRecommendations.specialConsiderations.map((item, index) => (
                    <li key={index} className={`flex items-start gap-2 text-sm ${getSecondaryTextColor()}`}>
                      <span className="text-purple-500 mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </GlassCard>
  );
};

export default PopularityInsights;

