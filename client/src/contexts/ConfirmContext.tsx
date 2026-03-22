import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog/ConfirmDialog';

interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions>({ title: '', message: '' });
    const [resolver, setResolver] = useState<(value: boolean) => void>();

    const confirm = useCallback((opts: ConfirmOptions) => {
        setOptions(opts);
        setIsOpen(true);
        return new Promise<boolean>((resolve) => {
            setResolver(() => resolve);
        });
    }, []);

    const handleConfirm = () => {
        if (resolver) resolver(true);
        setIsOpen(false);
    };

    const handleCancel = () => {
        if (resolver) resolver(false);
        setIsOpen(false);
    };

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            <ConfirmDialog 
                isOpen={isOpen}
                title={options.title}
                message={options.message}
                confirmText={options.confirmText}
                cancelText={options.cancelText}
                isDestructive={options.isDestructive}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </ConfirmContext.Provider>
    );
};

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (context === undefined) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context;
};
