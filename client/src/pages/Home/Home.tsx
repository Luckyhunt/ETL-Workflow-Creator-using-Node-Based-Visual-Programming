import { Link } from "react-router"

import "./Home.css"

import Logo from "../../images/logo.svg"

const Home = () => {
    return (
        <div className="home">
            {/* Navbar */}
            <nav className="home-navbar">
                <div className="navbar-logo logo-container">
                    <img src={Logo} alt="" />
                    <span className="navbar-logo-name">NodeFlow</span>
                </div>
                <div className="navbar-right">
                    <ul className="navbar-right-links">
                        <li><Link to="#">Services</Link></li>
                        <li><Link to="#">Nodes</Link></li>
                        <li><Link to="#">Workflows</Link></li>
                    </ul>
                    <div className="navbar-right-btn">
                        <Link to="/playground">Launch Editor</Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <div className="home-hero">
                <h1 className="home-hero-title">
                    Orchestrate ETL Workflows<br /><span className="linear-gradient">Visually & Efforlessly</span>
                </h1>
                <p className="home-hero-subtitle">
                    Build complex ETL workflows, connect enterprise tools, and automate intelligent business logic with our intuitive drag-and-drop architect.
                </p>
                <div className="home-hero-btns">
                    <Link className="blue" to="#">Get Started</Link>
                    <Link className="light" to="#">Watch Demo</Link>
                </div>
            </div>
        </div>
    )
}

export default Home