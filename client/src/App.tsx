import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './App.css'

// pages
import Home from './pages/Home/Home'
import Playground from './pages/Playground/Playground'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />
  },
  {
    path: '/playground',
    element: <Playground />
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
