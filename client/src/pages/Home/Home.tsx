import { Link } from "react-router"
import { useState } from "react"

import "./Home.css"
import AuthModal from "../../components/AuthModal/AuthModal"

import Logo from "../../images/logo.svg"

import { FaCheck, FaArrowRight } from "react-icons/fa6";
import { FaUserCircle } from "react-icons/fa";
import { FaGear } from "react-icons/fa6";
import { FaRobot } from "react-icons/fa";
import { useAuth } from "../../contexts/AuthContext";
import { Navigate } from "react-router-dom";

const Home = () => {
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const { user } = useAuth();

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

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
                        <li><a href="#node-section">Nodes</a></li>
                        <li><Link to="#">Workflows</Link></li>
                    </ul>
                    <div className="navbar-right-btn">
                        <button className="light login-nav-btn" onClick={() => setIsAuthModalOpen(true)}>
                            Login
                        </button>

                        <Link to="/editor" className="blue launch-btn">Launch Editor</Link>
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
                    <button className="launch-btn" onClick={() => setIsAuthModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', border: 'none' }}>
                        Get Started <FaArrowRight />
                    </button>
                </div>
            </div>

            {/* Node Info */}
            <div id="node-section" className="home-node-info">
                <div className="home-node-info-left">
                    <h3 className="home-node-info-left-title">
                        Master your Data Manipulation sense with <span className="special">Atomic Nodes</span>
                    </h3>
                    <div className="home-node-info-container">
                        <div className="home-node-info-part">
                            <FaCheck className="home-node-info-check-icon" />
                            <div className="home-node-info-content">
                                <div className="home-node-info-content-title">Stateful Memory</div>
                                Context nodes that persist conversation state across complex branching paths.
                            </div>
                        </div>
                        <div className="home-node-info-part">
                            <FaCheck className="home-node-info-check-icon" />
                            <div className="home-node-info-content">
                                <div className="home-node-info-content-title">Edge Routing</div>
                                Semantic Routing Automatically direct flow based on intent, sentiment, or data classification.
                            </div>
                        </div>
                        <div className="home-node-info-part">
                            <FaCheck className="home-node-info-check-icon" />
                            <div className="home-node-info-content">
                                <div className="home-node-info-content-title">Live Peek</div>
                                Instantly have a peek inside your transformed file before having to download.
                            </div>
                        </div>
                    </div>
                </div>
                <div className="home-node-info-right">
                    <div className="home-node-info-right-flow">
                        <div className="home-node-info-flow-node user">
                            <FaUserCircle className="home-node-info-flow-icon" /> User Control
                        </div>
                        <div className="line"></div>
                        <div className="home-node-info-flow-node config">
                            <FaGear className="home-node-info-flow-icon" /> Config
                        </div>
                        <div className="line"></div>
                        <div className="home-node-info-flow-node config">
                            <FaRobot className="home-node-info-flow-icon" /> Output
                        </div>
                    </div>
                </div>
            </div>

            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        </div>
    )
}

export default Home