import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';
import { FaEye, FaEyeSlash, FaLock, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import './ResetPassword.css';

const MIN_PASSWORD_LENGTH = 8;

const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (password.length >= MIN_PASSWORD_LENGTH) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score, label: 'Weak', color: 'var(--color-delete-red-light)' };
    if (score === 2) return { score, label: 'Fair', color: '#f59e0b' };
    if (score === 3) return { score, label: 'Good', color: '#3b82f6' };
    return { score, label: 'Strong', color: '#10b981' };
};

const ResetPassword: React.FC = () => {
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [sessionReady, setSessionReady] = useState<boolean | null>(null); // null = checking

    // Supabase injects the session from the URL hash automatically via onAuthStateChange
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
                setSessionReady(true);
            } else if (event === 'SIGNED_OUT') {
                setSessionReady(false);
            }
        });

        // Also check if there's already a session (e.g. page reload)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setSessionReady(true);
            } else {
                // Allow a moment for the hash exchange before showing error
                setTimeout(() => {
                    setSessionReady((prev) => (prev === null ? false : prev));
                }, 2000);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const strength = getPasswordStrength(newPassword);
    const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            toast.success('Password updated successfully! Redirecting...');
            setTimeout(() => navigate('/dashboard'), 1500);
        } catch (error: any) {
            toast.error(error.message || 'Failed to update password. The link may have expired.');
        } finally {
            setLoading(false);
        }
    };

    // ── Loading State ──
    if (sessionReady === null) {
        return (
            <div className="reset-container">
                <div className="reset-card">
                    <div className="reset-spinner-large" />
                    <p className="reset-checking-text">Verifying your reset link...</p>
                </div>
            </div>
        );
    }

    // ── Invalid / Expired Link ──
    if (sessionReady === false) {
        return (
            <div className="reset-container">
                <div className="reset-card reset-error-card">
                    <div className="reset-error-icon">
                        <FaTimesCircle />
                    </div>
                    <h2>Invalid or Expired Link</h2>
                    <p>This password reset link is no longer valid. Please request a new one.</p>
                    <button className="reset-btn" onClick={() => navigate('/')}>
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="reset-container">
            <div className="reset-card">
                <div className="reset-icon-wrapper">
                    <FaLock />
                </div>
                <h2 className="reset-title">Set New Password</h2>
                <p className="reset-subtitle">Choose a strong password for your account.</p>

                <form className="reset-form" onSubmit={handleSubmit}>
                    <div className="reset-form-group">
                        <label>New Password</label>
                        <div className="reset-password-wrapper">
                            <input
                                type={showNew ? 'text' : 'password'}
                                placeholder="Min 8 characters"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={MIN_PASSWORD_LENGTH}
                            />
                            <button type="button" className="reset-toggle" onClick={() => setShowNew(!showNew)}>
                                {showNew ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                        {/* Password Strength Indicator */}
                        {newPassword.length > 0 && (
                            <div className="strength-bar-container">
                                <div className="strength-bars">
                                    {[1, 2, 3, 4].map((level) => (
                                        <div
                                            key={level}
                                            className="strength-bar-segment"
                                            style={{ background: strength.score >= level ? strength.color : 'var(--color-bg-3)' }}
                                        />
                                    ))}
                                </div>
                                <span className="strength-label" style={{ color: strength.color }}>
                                    {strength.label}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="reset-form-group">
                        <label>Confirm Password</label>
                        <div className="reset-password-wrapper">
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                placeholder="Repeat your password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                            <button type="button" className="reset-toggle" onClick={() => setShowConfirm(!showConfirm)}>
                                {showConfirm ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                        {confirmPassword.length > 0 && (
                            <div className={`password-match-indicator ${passwordsMatch ? 'match' : 'no-match'}`}>
                                {passwordsMatch
                                    ? <><FaCheckCircle /> Passwords match</>
                                    : <><FaTimesCircle /> Passwords do not match</>
                                }
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="reset-btn"
                        disabled={loading || !passwordsMatch || newPassword.length < MIN_PASSWORD_LENGTH}
                    >
                        {loading ? <span className="btn-spinner" /> : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
