import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FaEye, FaEyeSlash, FaCheckCircle, FaTimesCircle, FaShieldAlt, FaUser } from 'react-icons/fa';
import './Settings.css';

const MIN_PASSWORD_LENGTH = 8;

const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (password.length >= MIN_PASSWORD_LENGTH) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score, label: 'Weak', color: '#555555' };
    if (score === 2) return { score, label: 'Fair', color: '#888888' };
    if (score === 3) return { score, label: 'Good', color: '#bbbbbb' };
    return { score, label: 'Strong', color: '#ffffff' };
};

const Settings: React.FC = () => {
    const { user } = useAuth();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);

    const strength = getPasswordStrength(newPassword);
    const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

    const handleChangePassword = async (e: React.FormEvent) => {
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
            toast.success('Password changed successfully!');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            toast.error(error.message || 'Failed to change password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="settings-page">
            <div className="settings-header">
                <h2>Settings</h2>
                <p>Manage your account preferences and security.</p>
            </div>

            {/* ── Account Info ── */}
            <div className="settings-card">
                <div className="settings-card-header">
                    <FaUser className="settings-card-icon" />
                    <div>
                        <h3>Account</h3>
                        <p>Your account details.</p>
                    </div>
                </div>
                <div className="settings-field">
                    <label>Email Address</label>
                    <div className="settings-field-value">
                        {user?.email}
                        <span className="settings-badge">Verified</span>
                    </div>
                </div>
                <div className="settings-field">
                    <label>Account ID</label>
                    <div className="settings-field-value settings-field-mono">
                        {user?.id}
                    </div>
                </div>
            </div>

            {/* ── Security ── */}
            <div className="settings-card">
                <div className="settings-card-header">
                    <FaShieldAlt className="settings-card-icon" />
                    <div>
                        <h3>Security</h3>
                        <p>Update your password to keep your account safe.</p>
                    </div>
                </div>

                <form className="settings-password-form" onSubmit={handleChangePassword}>
                    <div className="settings-form-group">
                        <label>New Password</label>
                        <div className="settings-password-wrapper">
                            <input
                                type={showNew ? 'text' : 'password'}
                                placeholder={`Min ${MIN_PASSWORD_LENGTH} characters`}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={MIN_PASSWORD_LENGTH}
                            />
                            <button type="button" className="settings-password-toggle" onClick={() => setShowNew(!showNew)}>
                                {showNew ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
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

                    <div className="settings-form-group">
                        <label>Confirm New Password</label>
                        <div className="settings-password-wrapper">
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                placeholder="Repeat your new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                            <button type="button" className="settings-password-toggle" onClick={() => setShowConfirm(!showConfirm)}>
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
                        className="settings-save-btn"
                        disabled={loading || !passwordsMatch || newPassword.length < MIN_PASSWORD_LENGTH}
                    >
                        {loading ? <span className="btn-spinner btn-spinner--dark" /> : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Settings;
