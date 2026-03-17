import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import './App.css'

// pages
import Home from './pages/Home/Home'
import Playground from './pages/Playground/Playground'
import DashboardLayout from './pages/Dashboard/DashboardLayout'
import Dashboard from './pages/Dashboard/Dashboard'
import WorkflowsList from './pages/Dashboard/WorkflowsList'
import ProtectedRoute from './components/ProtectedRoute'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />
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
            // Settings placeholder
            element: <div>Settings (Coming Soon)</div>
          }
        ]
      }
    ]
  }
]);

function App() {
	return (
		<div className="app">
			<RouterProvider router={router} />
		</div>
	)
}

export default App
