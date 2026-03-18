import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute: React.FC = () => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: 'var(--color-bg-1)',
                fontFamily: '"Plus Jakarta Sans", sans-serif'
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid var(--color-border-grey)',
                    borderTopColor: 'var(--color-accent-1)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
                <p style={{ marginTop: '16px', fontWeight: 500, color: 'var(--color-text-grey)' }}>
                    Verifying session...
                </p>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;

