import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './DashboardLayout.css';
import Logo from '../../images/logo.svg';

import { FaHome, FaPlus, FaFolderOpen, FaCog, FaSignOutAlt, FaBars } from 'react-icons/fa';
import { useResponsive } from '../../hooks/useResponsive';

const DashboardLayout: React.FC = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const { isMobile } = useResponsive();

    // Close drawer when route changes
    React.useEffect(() => {
        setDrawerOpen(false);
    }, [window.location.pathname]);

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    return (
        <div className="dashboard-layout">
            {/* Mobile Drawer Scrim */}
            {isMobile && drawerOpen && (
                <div className="drawer-scrim" onClick={() => setDrawerOpen(false)} />
            )}

            {/* Sidebar Navigation */}
            <aside className={`dashboard-sidebar ${isMobile && drawerOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <img src={Logo} alt="Logo" className="sidebar-logo" />
                    <h2>NodeFlow</h2>
                </div>

                <nav className="sidebar-nav">
                    <NavLink to="/dashboard" end className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                        <FaHome /> <span>Home</span>
                    </NavLink>
                    <button className="nav-item create-btn" onClick={() => navigate('/playground')}>
                        <FaPlus /> <span>New Workflow</span>
                    </button>
                    <NavLink to="/dashboard/workflows" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                        <FaFolderOpen /> <span>My Workflows</span>
                    </NavLink>
                    <NavLink to="/dashboard/settings" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
                        <FaCog /> <span>Settings</span>
                    </NavLink>
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">{user?.email?.charAt(0).toUpperCase() || 'U'}</div>
                        <span className="user-email">{user?.email}</span>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>
                        <FaSignOutAlt /> <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="dashboard-main">
                <header className="dashboard-topbar">
                    {isMobile && (
                        <button
                            className="hamburger-btn"
                            aria-label="Open menu"
                            onClick={() => setDrawerOpen(true)}
                        >
                            <FaBars />
                        </button>
                    )}
                    <h1>Dashboard</h1>
                    {/* Add global search or notifications here later */}
                </header>
                <div className="dashboard-content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
