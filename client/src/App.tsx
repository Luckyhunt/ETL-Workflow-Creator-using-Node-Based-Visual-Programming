import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { FloatingJobWidget } from './components/FloatingJobWidget/FloatingJobWidget';
import './App.css'

// Lazy load pages for performance optimization
const Home = lazy(() => import('./pages/Home/Home'));
const Playground = lazy(() => import('./pages/Playground/Playground'));
const DashboardLayout = lazy(() => import('./pages/Dashboard/DashboardLayout'));
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const WorkflowsList = lazy(() => import('./pages/Dashboard/WorkflowsList'));
const Settings = lazy(() => import('./pages/Dashboard/Settings'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute'));

// Loading fallback
const PageLoader = () => (
    <div style={{ display: 'grid', placeItems: 'center', height: '100vh', width: '100vw', background: 'var(--bg-1)' }}>
        <div className="spinner" style={{ 
            width: '40px', height: '40px', border: '3px solid var(--color-border-grey)', 
            borderTopColor: 'var(--color-accent-1)', borderRadius: '50%', animation: 'spin 1s linear infinite' 
        }} />
    </div>
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <Suspense fallback={<PageLoader />}><Home /></Suspense>
  },
  {
    path: '/reset-password',
    element: <Suspense fallback={<PageLoader />}><ResetPassword /></Suspense>
  },
  {
    path: '/editor',
    element: <Suspense fallback={<PageLoader />}><Playground mode="public" /></Suspense>
  },
  {
    path: '/editor/:id',
    element: <Suspense fallback={<PageLoader />}><ProtectedRoute /></Suspense>,
    children: [
      {
        path: '',
        element: <Suspense fallback={<PageLoader />}><Playground mode="private" /></Suspense>
      }
    ]
  },
  {
    path: '/playground',
    element: <Suspense fallback={<PageLoader />}><ProtectedRoute /></Suspense>,
    children: [
      {
        path: '',
        element: <Suspense fallback={<PageLoader />}><Playground mode="private" /></Suspense>
      }
    ]
  },
  {
    path: '/dashboard',
    element: <Suspense fallback={<PageLoader />}><ProtectedRoute /></Suspense>,
    children: [
      {
        path: '',
        element: <Suspense fallback={<PageLoader />}><DashboardLayout /></Suspense>,
        children: [
          {
            path: '',
            element: <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>
          },
          {
            path: 'workflows',
            element: <Suspense fallback={<PageLoader />}><WorkflowsList /></Suspense>
          },
          {
            path: 'settings',
            element: <Suspense fallback={<PageLoader />}><Settings /></Suspense>
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
            <FloatingJobWidget />
		</div>
	)
}

export default App
