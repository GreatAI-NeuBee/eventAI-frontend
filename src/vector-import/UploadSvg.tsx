/**
 * SVG Upload Component for React Native (Expo)
 * Handles file picking, reading, and parsing with user feedback
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { StadiumMapJSON } from '../types/stadium';
import { svgStringToPlan, validateSvgString } from './svgToPlan';

// For bare React Native (non-Expo), use these alternatives:
// import DocumentPicker from 'react-native-document-picker';
// import RNFS from 'react-native-fs';

interface UploadSvgProps {
  onPlan: (plan: StadiumMapJSON) => void;
  onError?: (error: string) => void;
}

export const UploadSvg: React.FC<UploadSvgProps> = ({ onPlan, onError }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const handleFilePick = async () => {
    try {
      setIsLoading(true);
      setLastError(null);

      // Pick SVG file
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/svg+xml', 'image/*', 'application/*'], // Accept various MIME types
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      if (!file) {
        throw new Error('No file selected');
      }

      // Read file content
      const content = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (!content || content.trim().length === 0) {
        throw new Error('File is empty or could not be read');
      }

      // Validate SVG structure
      if (!validateSvgString(content)) {
        throw new Error('Invalid SVG file. Must have viewBox attribute and proper SVG structure.');
      }

      // Parse SVG to stadium plan
      const plan = svgStringToPlan(content);

      // Success - pass plan to parent
      onPlan(plan);
      
      Alert.alert(
        'Success!',
        `Imported layout with ${plan.zones.length} zones, ${plan.exitsList?.length || 0} exits, and ${plan.toiletsList?.length || 0} toilets.`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setLastError(errorMessage);
      
      if (onError) {
        onError(errorMessage);
      }
      
      Alert.alert(
        'Import Failed',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Import Stadium Layout</Text>
        <Text style={styles.subtitle}>Upload an SVG file to create a stadium layout</Text>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleFilePick}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Choose SVG File</Text>
          )}
        </TouchableOpacity>

        {lastError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{lastError}</Text>
          </View>
        )}

        <View style={styles.helpContainer}>
          <Text style={styles.helpTitle}>How to export SVG from Figma/Illustrator:</Text>
          <Text style={styles.helpText}>
            • Export with viewBox="minx miny width height" (required)
          </Text>
          <Text style={styles.helpText}>
            • Zones: Use &lt;polygon class="zone" data-id="z-101" data-name="North A" data-layer="1" points="x1,y1 x2,y2 ..."/&gt;
          </Text>
          <Text style={styles.helpText}>
            • Exits: Use &lt;circle class="exit" data-id="exit-1" data-name="Exit 1" cx="..." cy="..." r="..."/&gt;
          </Text>
          <Text style={styles.helpText}>
            • Toilets: Use &lt;circle class="toilet" data-id="wc-1" data-label="WC 1" cx="..." cy="..." r="..."/&gt;
          </Text>
          <Text style={styles.helpText}>
            • Optional: Add &lt;g id="meta" data-layers="3" data-sections="12"&gt;&lt;/g&gt; for metadata
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#fee',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  errorText: {
    color: '#c33',
    fontSize: 14,
  },
  helpContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
});

// Bare React Native alternative implementation:
/*
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';

const handleFilePickBareRN = async () => {
  try {
    const result = await DocumentPicker.pick({
      type: [DocumentPicker.types.allFiles],
    });

    if (result.length === 0) return;

    const file = result[0];
    const content = await RNFS.readFile(file.uri, 'utf8');
    
    // Rest of the parsing logic remains the same
    const plan = svgStringToPlan(content);
    onPlan(plan);
  } catch (error) {
    // Handle error
  }
};
*/

