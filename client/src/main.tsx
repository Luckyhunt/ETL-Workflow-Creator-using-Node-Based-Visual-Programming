import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { WorkflowProvider } from './contexts/WorkflowContext'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { JobProvider } from './contexts/JobContext'
import { ConfirmProvider } from './contexts/ConfirmContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <ConfirmProvider>
          <AuthProvider>
              <WorkflowProvider>
                  <JobProvider>
                      <App />
                  </JobProvider>
              </WorkflowProvider>
          </AuthProvider>
      </ConfirmProvider>
  </StrictMode>,
)
