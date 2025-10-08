/**
 * Layout Preview Component using react-native-svg
 * Renders stadium layout with zones, exits, and toilets
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView
} from 'react-native';
import Svg, {
  Circle,
  Polygon,
  Text as SvgText,
  G,
  Defs,
  ClipPath,
  Rect
} from 'react-native-svg';
import { StadiumMapJSON } from '../types/stadium';

interface LayoutPreviewProps {
  plan: StadiumMapJSON;
}

// ViewBox dimensions (matches VenueLayoutCard)
const VB_W = 100;
const VB_H = 62.5;
const STADIUM_CX = 50;
const STADIUM_CY = 31.25;
const STADIUM_R = Math.min(VB_W/2 - 3, VB_H/2 - 3);

export const LayoutPreview: React.FC<LayoutPreviewProps> = ({ plan }) => {
  const screenWidth = Dimensions.get('window').width;
  const svgSize = Math.min(screenWidth - 40, 400);
  const scale = svgSize / VB_W;

  // Generate colors for zones
  const getZoneColor = (index: number) => {
    const colors = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
      '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43'
    ];
    return colors[index % colors.length];
  };

  // Generate congestion level for zones (mock data)
  const getZoneCongestion = (index: number) => {
    return Math.min(100, Math.max(0, (index * 15) % 100));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Layout Preview</Text>
        <Text style={styles.subtitle}>
          {plan.zones.length} zones, {plan.exitsList?.length || 0} exits, {plan.toiletsList?.length || 0} toilets
        </Text>
      </View>

      <View style={styles.svgContainer}>
        <Svg
          width={svgSize}
          height={svgSize * (VB_H / VB_W)}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          style={styles.svg}
        >
          <Defs>
            <ClipPath id="stadiumClip">
              <Circle cx={STADIUM_CX} cy={STADIUM_CY} r={STADIUM_R} />
            </ClipPath>
          </Defs>

          {/* Stadium background */}
          <Circle
            cx={STADIUM_CX}
            cy={STADIUM_CY}
            r={STADIUM_R}
            fill="#ffffff"
            stroke="#e5e7eb"
            strokeWidth={0.8}
          />

          <G clipPath="url(#stadiumClip)">
            {/* Zones (polygons) */}
            {plan.zones.map((zone, index) => {
              const color = getZoneColor(index);
              const congestion = getZoneCongestion(index);
              const opacity = 0.3 + (congestion / 100) * 0.4;
              
              const points = zone.points
                .map(([x, y]) => `${x},${y}`)
                .join(' ');

              return (
                <G key={zone.id}>
                  <Polygon
                    points={points}
                    fill={color}
                    fillOpacity={opacity}
                    stroke="#0b1220"
                    strokeOpacity={0.25}
                    strokeWidth={0.25}
                  />
                  {/* Zone label */}
                  {zone.points.length > 0 && (
                    <SvgText
                      x={zone.points[0][0]}
                      y={zone.points[0][1]}
                      fontSize="2"
                      fill="#333"
                      textAnchor="middle"
                    >
                      {zone.name}
                    </SvgText>
                  )}
                </G>
              );
            })}

            {/* Exits */}
            {plan.exitsList?.map((exit, index) => (
              <G key={exit.id}>
                <Circle
                  cx={exit.position[0]}
                  cy={exit.position[1]}
                  r="1.5"
                  fill="#22c55e"
                  stroke="#16a34a"
                  strokeWidth="0.3"
                />
                <SvgText
                  x={exit.position[0]}
                  y={exit.position[1] - 2.5}
                  fontSize="1.8"
                  fill="#16a34a"
                  textAnchor="middle"
                >
                  {exit.name}
                </SvgText>
                {exit.capacity && (
                  <SvgText
                    x={exit.position[0]}
                    y={exit.position[1] + 1}
                    fontSize="1.2"
                    fill="#16a34a"
                    textAnchor="middle"
                  >
                    {exit.capacity}
                  </SvgText>
                )}
              </G>
            ))}

            {/* Toilets */}
            {plan.toiletsList?.map((toilet, index) => (
              <G key={toilet.id}>
                <Circle
                  cx={toilet.position[0]}
                  cy={toilet.position[1]}
                  r="1.2"
                  fill="#3b82f6"
                  stroke="#2563eb"
                  strokeWidth="0.3"
                />
                <SvgText
                  x={toilet.position[0]}
                  y={toilet.position[1] - 2}
                  fontSize="1.5"
                  fill="#2563eb"
                  textAnchor="middle"
                >
                  {toilet.label || `WC ${index + 1}`}
                </SvgText>
                {toilet.fixtures && (
                  <SvgText
                    x={toilet.position[0]}
                    y={toilet.position[1] + 1}
                    fontSize="1"
                    fill="#2563eb"
                    textAnchor="middle"
                  >
                    {toilet.fixtures}
                  </SvgText>
                )}
              </G>
            ))}
          </G>
        </Svg>
      </View>

      {/* Layout info */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Layout Details</Text>
        <Text style={styles.infoText}>Sections: {plan.sections}</Text>
        <Text style={styles.infoText}>Layers: {plan.layers}</Text>
        <Text style={styles.infoText}>Exits: {plan.exitsList?.length || 0}</Text>
        <Text style={styles.infoText}>Toilets: {plan.toiletsList?.length || 0}</Text>
        
        {plan.zones.length > 0 && (
          <View style={styles.zonesContainer}>
            <Text style={styles.zonesTitle}>Zones by Layer:</Text>
            {Array.from({ length: plan.layers }, (_, layer) => {
              const layerZones = plan.zones.filter(z => z.layer === layer + 1);
              return (
                <Text key={layer} style={styles.zonesText}>
                  Layer {layer + 1}: {layerZones.length} zones
                </Text>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  svgContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  svg: {
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 4,
  },
  infoContainer: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  zonesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
  },
  zonesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  zonesText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
});

