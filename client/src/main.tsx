import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { WorkflowProvider } from './contexts/WorkflowContext'
import { AuthProvider } from './contexts/AuthContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <AuthProvider>
          <WorkflowProvider>
              <App />
          </WorkflowProvider>
      </AuthProvider>
  </StrictMode>,
)
