# Required Dependencies for Vector Import System

## Core Dependencies

```bash
# Install these packages for the vector import system to work:

# Zod for schema validation
npm install zod

# Fast XML Parser for SVG parsing
npm install fast-xml-parser

# React Native SVG for rendering
npm install react-native-svg

# Expo Document Picker (for Expo projects)
npm install expo-document-picker

# Expo File System (for Expo projects)
npm install expo-file-system
```

## Alternative for Bare React Native

If you're not using Expo, install these instead:

```bash
# React Native Document Picker
npm install react-native-document-picker

# React Native File System
npm install react-native-fs

# React Native SVG (same as above)
npm install react-native-svg
```

## TypeScript Dependencies

```bash
# TypeScript types (if not already installed)
npm install --save-dev @types/react @types/react-native
```

## Installation Notes

1. **For Expo projects**: Use the `expo-*` packages
2. **For bare React Native**: Use the `react-native-*` packages
3. **react-native-svg**: Required for both Expo and bare RN
4. **zod**: Required for strict validation
5. **fast-xml-parser**: Required for SVG parsing

## Platform-specific Setup

### iOS (Bare React Native)
```bash
cd ios && pod install
```

### Android (Bare React Native)
No additional setup required for the packages used.

### Expo
No additional setup required - Expo handles native dependencies automatically.

