import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './AuthModal.css';
import { FaGoogle, FaTimes, FaEye, FaEyeSlash } from 'react-icons/fa';
import { supabase } from '../../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Logo from '../../images/logo.svg';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type AuthView = 'login' | 'register' | 'forgot-password';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const [view, setView] = useState<AuthView>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setShowPassword(false);
    };

    const switchView = (nextView: AuthView) => {
        resetForm();
        setView(nextView);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (view === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                toast.success('Welcome back!');
                onClose();
                navigate('/dashboard');
            } else if (view === 'register') {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                toast.success('Check your email for the confirmation link!');
                switchView('login');
            }
        } catch (error: any) {
            toast.error(error.message || 'An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Always call the API, but show same message regardless of result
            // to avoid email enumeration attacks.
            await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
        } catch {
            // Silently fail - do not reveal if email exists
        } finally {
            setLoading(false);
            // Always show the same success message
            toast.success('If that email is registered, a reset link has been sent.');
            switchView('login');
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/dashboard`,
                },
            });
            if (error) throw error;
        } catch (error: any) {
            toast.error(error.message || 'Google sign-in failed.');
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="auth-modal-overlay"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="auth-modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button className="auth-modal-close" onClick={onClose}>
                            <FaTimes />
                        </button>

                        <AnimatePresence mode="wait">
                            {/* ======================== FORGOT PASSWORD VIEW ======================== */}
                            {view === 'forgot-password' && (
                                <motion.div
                                    key="forgot"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="auth-modal-header">
                                        <h2>Forgot Password</h2>
                                        <p>Enter your email and we'll send you a reset link.</p>
                                    </div>
                                    <form className="auth-modal-form" onSubmit={handleForgotPassword}>
                                        <div className="form-group">
                                            <label>Email</label>
                                            <input
                                                type="email"
                                                placeholder="you@company.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                autoFocus
                                            />
                                        </div>
                                        <button type="submit" className="auth-modal-submit" disabled={loading}>
                                            {loading ? <span className="btn-spinner" /> : 'Send Reset Link'}
                                        </button>
                                    </form>
                                    <button className="auth-modal-back-link" onClick={() => switchView('login')}>
                                        ← Back to Login
                                    </button>
                                </motion.div>
                            )}

                            {/* ======================== LOGIN / REGISTER VIEW ======================== */}
                            {(view === 'login' || view === 'register') && (
                                <motion.div
                                    key="auth"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="auth-modal-header">
                                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                                            <img src={Logo} alt="NodeFlow Logo" style={{ width: '48px', height: '48px' }} />
                                        </div>
                                        <h2>{view === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
                                        <p>{view === 'login' ? 'Sign in to orchestrate your data.' : 'Join to build powerful ETL workflows.'}</p>
                                        <div className="trust-badge" style={{
                                            marginTop: '15px',
                                            padding: '12px',
                                            backgroundColor: 'rgba(79, 70, 229, 0.05)',
                                            border: '1px solid rgba(79, 70, 229, 0.2)',
                                            borderRadius: '8px',
                                            textAlign: 'left'
                                        }}>
                                            <div style={{ color: '#4f46e5', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                                                🔒 Secure authentication powered by Supabase
                                            </div>
                                            <ul style={{ margin: 0, paddingLeft: '20px', color: '#94a3b8', fontSize: '12px', lineHeight: 1.5 }}>
                                                <li>Data is protected by enterprise-grade security.</li>
                                                <li>Authentication is securely handled via Google OAuth & Supabase.</li>
                                                <li>We do not harvest, store, or access your raw passwords.</li>
                                            </ul>
                                        </div>
                                    </div>

                                    <div className="auth-modal-tabs">
                                        <button
                                            className={`auth-modal-tab ${view === 'login' ? 'active' : ''}`}
                                            onClick={() => switchView('login')}
                                        >
                                            Login
                                        </button>
                                        <button
                                            className={`auth-modal-tab ${view === 'register' ? 'active' : ''}`}
                                            onClick={() => switchView('register')}
                                        >
                                            Register
                                        </button>
                                    </div>

                                    <form className="auth-modal-form" onSubmit={handleSubmit}>
                                        <div className="form-group">
                                            <label>Email</label>
                                            <input
                                                type="email"
                                                placeholder="you@company.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Password</label>
                                            <div className="password-input-wrapper">
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    placeholder="••••••••"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    required
                                                    minLength={6}
                                                />
                                                <button
                                                    type="button"
                                                    className="password-toggle"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    aria-label="Toggle password visibility"
                                                >
                                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                                </button>
                                            </div>
                                        </div>
                                        {view === 'login' && (
                                            <button
                                                type="button"
                                                className="auth-forgot-link"
                                                onClick={() => switchView('forgot-password')}
                                            >
                                                Forgot Password?
                                            </button>
                                        )}
                                        <button type="submit" className="auth-modal-submit" disabled={loading}>
                                            {loading ? <span className="btn-spinner" /> : (view === 'login' ? 'Sign In' : 'Sign Up')}
                                        </button>
                                    </form>

                                    <div className="auth-modal-divider">
                                        <span>or continue with</span>
                                    </div>

                                    <button className="auth-modal-google" onClick={handleGoogleLogin}>
                                        <FaGoogle /> Continue with Google
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AuthModal;
