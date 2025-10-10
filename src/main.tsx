import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './utils/debugWeather.ts'
import { weatherService } from './services/weatherService'
import { registerSW } from 'virtual:pwa-register'

// Make weatherService available globally for debugging
declare global {
  interface Window {
    weatherService: typeof weatherService;
  }
}

window.weatherService = weatherService;

// Register service worker for PWA
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('🔄 New content available, please refresh.');
    // You can show a toast notification here
    if (confirm('New version available! Click OK to update.')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('✅ App ready to work offline');
    // You can show a notification that the app is ready to work offline
  },
  onRegistered(registration) {
    console.log('✅ Service Worker registered:', registration);
    
    // Check for updates every hour
    if (registration) {
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000); // 1 hour
    }
  },
  onRegisterError(error) {
    console.error('❌ Service Worker registration error:', error);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)