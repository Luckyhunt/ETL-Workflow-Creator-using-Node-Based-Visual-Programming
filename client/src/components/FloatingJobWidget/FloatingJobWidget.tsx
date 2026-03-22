import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJob } from '../../contexts/JobContext';
import { FaSpinner, FaCheckCircle, FaExclamationCircle, FaTimes } from 'react-icons/fa';
import { useResponsive } from '../../hooks/useResponsive';
import './FloatingJobWidget.css';

export const FloatingJobWidget: React.FC = () => {
    const { jobState, clearJob } = useJob();
    const { isMobile } = useResponsive();

    if (jobState.status === 'idle') return null;

    const isRunning = jobState.status === 'running';
    const isSuccess = jobState.status === 'success';
    const isError = jobState.status === 'failed';

    const renderIcon = () => {
        if (isRunning) return <FaSpinner className="icon-spin text-accent" />;
        if (isSuccess) return <FaCheckCircle className="text-success" />;
        if (isError) return <FaExclamationCircle className="text-error" />;
        return null;
    };

    return (
        <AnimatePresence>
            <motion.div
                key="job-widget"
                className={`floating-widget ${isMobile ? 'mobile-sheet' : 'desktop-toast'} ${jobState.status}`}
                initial={isMobile ? { y: 100, opacity: 0 } : { x: 100, opacity: 0 }}
                animate={isMobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
                exit={isMobile ? { y: 100, opacity: 0 } : { x: 100, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
                <div className="widget-header">
                    <div className="widget-title">
                        {renderIcon()}
                        <span>ETL Job: {jobState.status.toUpperCase()}</span>
                    </div>
                    {!isRunning && (
                        <button className="widget-close" onClick={clearJob}>
                            <FaTimes />
                        </button>
                    )}
                </div>

                <div className="widget-body">
                    <div className="progress-container">
                        <div 
                            className={`progress-bar ${jobState.status}`} 
                            style={{ width: `${jobState.progress}%` }} 
                        />
                    </div>
                    <div className="progress-text">{jobState.progress}% Complete</div>
                    
                    {/* Only show latest log to save space */}
                    {jobState.logs.length > 0 && (
                        <div className="latest-log">
                            {jobState.logs[jobState.logs.length - 1]}
                        </div>
                    )}

                    {isError && jobState.error && (
                        <div className="error-log">{jobState.error}</div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
