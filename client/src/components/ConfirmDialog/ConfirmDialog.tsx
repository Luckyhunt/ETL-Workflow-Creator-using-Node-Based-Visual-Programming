import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResponsive } from '../../hooks/useResponsive';
import './ConfirmDialog.css';

export interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDestructive = true,
    onConfirm,
    onCancel
}) => {
    const { isMobile } = useResponsive();

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="confirm-scrim" onClick={onCancel}>
                <motion.div 
                    className={`confirm-dialog ${isMobile ? 'mobile' : 'desktop'}`}
                    onClick={(e) => e.stopPropagation()}
                    initial={isMobile ? { y: '100%' } : { scale: 0.9, opacity: 0, y: '-50%', x: '-50%' }}
                    animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1, y: '-50%', x: '-50%' }}
                    exit={isMobile ? { y: '100%' } : { scale: 0.9, opacity: 0, y: '-50%', x: '-50%' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                    <div className="confirm-header">
                        <h3>{title}</h3>
                    </div>
                    <div className="confirm-body">
                        <p>{message}</p>
                    </div>
                    <div className="confirm-actions">
                        <button className="btn-cancel" onClick={onCancel}>
                            {cancelText}
                        </button>
                        <button 
                            className={`btn-confirm ${isDestructive ? 'destructive' : 'primary'}`} 
                            onClick={() => {
                                onConfirm();
                                onCancel();
                            }}
                        >
                            {confirmText}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
