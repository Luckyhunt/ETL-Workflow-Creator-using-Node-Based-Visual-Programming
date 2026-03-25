import React from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer/Footer';
import './PrivacyPolicy.css';
import Logo from '../../images/logo.svg';

const PrivacyPolicy: React.FC = () => {
    return (
        <div className="privacy-page">
            <nav className="privacy-navbar">
                <Link to="/" className="navbar-logo logo-container">
                    <img src={Logo} alt="" />
                    <span className="navbar-logo-name">NodeFlow</span>
                </Link>
                <Link to="/" className="back-link">Back to Home</Link>
            </nav>
            
            <main className="privacy-content">
                <h1>Privacy Policy</h1>
                <p className="last-updated">Last Updated: {new Date().toLocaleDateString()}</p>

                <div className="privacy-section">
                    <h2>1. Authentication & Security</h2>
                    <p>
                        NodeFlow utilizes enterprise-grade authentication securely handled by <strong>Google OAuth</strong> and <strong>Supabase</strong>. 
                        We employ strict security measures and <strong>do not harvest, store, or have access to your raw passwords</strong>. All credential management is securely delegated to these trusted identity providers.
                    </p>
                </div>

                <div className="privacy-section">
                    <h2>2. Information We Collect</h2>
                    <p>When you use NodeFlow, we collect:</p>
                    <ul>
                        <li><strong>Account Information:</strong> Your email address and basic profile information provided by Google OAuth or Supabase.</li>
                        <li><strong>Workflow Data:</strong> The structure of your ETL pipelines (nodes, edges, and configurations) created in the visual builder to provide the service.</li>
                    </ul>
                </div>

                <div className="privacy-section">
                    <h2>3. How We Use Your Data</h2>
                    <p>Your data is exclusively used to:</p>
                    <ul>
                        <li>Authenticate your secure access to the platform.</li>
                        <li>Allow you to save, orchestrate, and retrieve your ETL workflows.</li>
                    </ul>
                    <p>We <strong>do not</strong> sell, rent, or share your personal data with third parties. Your workflow data remains private to your account.</p>
                </div>

                <div className="privacy-section">
                    <h2>4. Data Storage</h2>
                    <p>
                        Your data is encrypted at rest and in transit using industry-standard protocols. 
                        We strictly adhere to secure storage practices; specifically, no credentials or sensitive access tokens are stored in insecure local browser storage.
                    </p>
                </div>

                <div className="privacy-section">
                    <h2>5. Contact</h2>
                    <p>
                        For any privacy-related questions or data deletion requests, please contact our security team.
                    </p>
                </div>
            </main>
            
            <Footer />
        </div>
    );
};

export default PrivacyPolicy;
