import { BrowserRouter as Router, Routes, Route } from 'react-router'
import './App.css'

// pages
import Home from './pages/Home/Home'
import Playground from './pages/Playground/Playground'

function App() {
	return (
		<div className="app">
			<Router>
				<Routes>
					<Route path='/' element={<Home />} />
					<Route path='/playground' element={<Playground />} />
				</Routes>
			</Router>
		</div>
	)
}

export default App
