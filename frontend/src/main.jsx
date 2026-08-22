import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initializeTheme } from './hooks/useTheme.js'

// Restore the saved preference before the first paint on every route.
initializeTheme()

createRoot(document.getElementById('root')).render(
  <App />
)
