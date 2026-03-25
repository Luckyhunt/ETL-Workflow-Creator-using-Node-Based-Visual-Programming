import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
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
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy/PrivacyPolicy'));
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute'));

// Loading fallback
const PageLoader = () => (
    <div style={{ display: 'grid', placeItems: 'center', height: '100vh', width: '100vw', background: 'var(--color-bg-1)' }}>
        <div className="spinner" style={{ 
            width: '40px', height: '40px', border: '3px solid var(--color-border-grey)', 
            borderTopColor: 'var(--color-text-dark)', borderRadius: '50%', animation: 'spin 1s linear infinite' 
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
    path: '/privacy',
    element: <Suspense fallback={<PageLoader />}><PrivacyPolicy /></Suspense>
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
	useEffect(() => {
		const loader = document.getElementById('initial-loader');
		if (loader) {
			const startTime = (window as any).loaderStartTime || Date.now();
			const elapsed = Date.now() - startTime;
			const minDuration = 500; // Ensure loader shows for a minimum time
			const timeToWait = Math.max(0, minDuration - elapsed);

			setTimeout(() => {
				loader.classList.add('fade-out');
				setTimeout(() => {
					loader.remove();
				}, 500); // 500ms for transition duration
			}, timeToWait);
		}
	}, []);

	return (
		<div className="app">
			<RouterProvider router={router} />
			<Toaster 
				position="bottom-right"
				toastOptions={{
					style: {
						background: 'var(--color-bg-2)',
						color: 'var(--color-text-dark)',
						border: '1px solid var(--color-border-grey)',
						fontFamily: '"Plus Jakarta Sans", sans-serif',
						borderRadius: '4px',
						boxShadow: 'none'
					},
				}}
			/>
            <FloatingJobWidget />
		</div>
	)
}

export default App
