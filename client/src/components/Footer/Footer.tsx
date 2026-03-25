import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';
import Logo from '../../images/logo.svg';
import { FaLock } from 'react-icons/fa';

const Footer: React.FC = () => {
    return (
        <footer className="site-footer">
            <div className="footer-content">
                <div className="footer-brand">
                    <img src={Logo} alt="NodeFlow Logo" className="footer-logo" />
                    <span className="footer-brand-name">NodeFlow</span>
                    <p className="footer-description">Modern ETL Workflow Orchestration.</p>
                </div>
                
                <div className="footer-links">
                    <div className="footer-section">
                        <h4>Legal</h4>
                        <ul>
                            <li><Link to="/privacy">Privacy Policy</Link></li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <div className="footer-bottom">
                <div className="footer-disclaimer" style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', padding: '0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <FaLock /> <strong>Secure authentication powered by Google OAuth & Supabase</strong><br/>
                    We prioritize your security. No raw passwords are ever stored on our servers.
                </div>
                <div className="footer-copyright">
                    &copy; {new Date().getFullYear()} ETL Workflow Creator. All rights reserved.
                </div>
            </div>
        </footer>
    );
};

export default Footer;
