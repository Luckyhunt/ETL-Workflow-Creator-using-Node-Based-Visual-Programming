import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './AuthModal.css';
import { FaGoogle, FaTimes } from 'react-icons/fa';
import { supabase } from '../../services/supabaseClient';
import { useNavigate } from 'react-router-dom';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                onClose();
                navigate('/dashboard');
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                // Supabase might require email confirmation depending on settings
                setErrorMsg('Check your email for the confirmation link!');
            }
        } catch (error: any) {
            setErrorMsg(error.message);
        } finally {
            setLoading(false);
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
            setErrorMsg(error.message);
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
                        
                        <div className="auth-modal-header">
                            <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                            <p>{isLogin ? 'Sign in to orchestrate your data.' : 'Join to build powerful ETL workflows.'}</p>
                        </div>

                <div className="auth-modal-tabs">
                    <button 
                        className={`auth-modal-tab ${isLogin ? 'active' : ''}`}
                        onClick={() => { setIsLogin(true); setErrorMsg(''); }}
                    >
                        Login
                    </button>
                    <button 
                        className={`auth-modal-tab ${!isLogin ? 'active' : ''}`}
                        onClick={() => { setIsLogin(false); setErrorMsg(''); }}
                    >
                        Register
                    </button>
                </div>

                {errorMsg && <div className="auth-modal-error" style={{ color: 'var(--color-delete-red-light)', marginBottom: '16px', fontSize: '0.9rem', textAlign: 'center' }}>{errorMsg}</div>}

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
                        <input 
                            type="password" 
                            placeholder="••••••••" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="auth-modal-submit" disabled={loading}>
                        {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
                    </button>
                </form>

                <div className="auth-modal-divider">
                    <span>or continue with</span>
                </div>

                        <button className="auth-modal-google" onClick={handleGoogleLogin}>
                            <FaGoogle /> Google
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AuthModal;
