import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './App.css'

// pages
import Home from './pages/Home/Home'
import Playground from './pages/Playground/Playground'
import DashboardLayout from './pages/Dashboard/DashboardLayout'
import Dashboard from './pages/Dashboard/Dashboard'
import WorkflowsList from './pages/Dashboard/WorkflowsList'
import Settings from './pages/Dashboard/Settings'
import ResetPassword from './pages/ResetPassword'
import ProtectedRoute from './components/ProtectedRoute'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />
  },
  {
    // Public: password reset page reached via email link
    path: '/reset-password',
    element: <ResetPassword />
  },
  {
    path: '/editor',
    element: <Playground mode="public" />
  },
  {
    path: '/editor/:id',
    element: <ProtectedRoute />,
    children: [
      {
        path: '',
        element: <Playground mode="private" />
      }
    ]
  },
  {
    path: '/playground',
    element: <ProtectedRoute />,
    children: [
      {
        path: '',
        element: <Playground mode="private" />
      }
    ]
  },
  {
    path: '/dashboard',
    element: <ProtectedRoute />,
    children: [
      {
        path: '',
        element: <DashboardLayout />,
        children: [
          {
            path: '',
            element: <Dashboard />
          },
          {
            path: 'workflows',
            element: <WorkflowsList />
          },
          {
            path: 'settings',
            element: <Settings />
          }
        ]
      }
    ]
  }
]);

import { Toaster } from 'react-hot-toast';

function App() {
	return (
		<div className="app">
			<RouterProvider router={router} />
			<Toaster 
				position="bottom-right"
				toastOptions={{
					style: {
						background: 'rgba(255, 255, 255, 0.95)',
						color: 'var(--color-text-dark)',
						backdropFilter: 'blur(10px)',
						border: '1px solid var(--color-border-grey)',
						fontFamily: '"Plus Jakarta Sans", sans-serif',
						boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
					},
				}}
			/>
		</div>
	)
}

export default App
