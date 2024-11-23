// frontend/src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './modal.css'
import './player.css'
import './radio.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    
    <Route path="/callback" element={<Callback />} />
    <Route path="/" element={<App />} />
  </React.StrictMode>
)
