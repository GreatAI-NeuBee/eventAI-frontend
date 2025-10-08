import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './utils/debugWeather.ts'
import { weatherService } from './services/weatherService'

// Make weatherService available globally for debugging
declare global {
  interface Window {
    weatherService: typeof weatherService;
  }
}

window.weatherService = weatherService;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)