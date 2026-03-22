import React, { useRef, useEffect } from 'react';
import { useJob } from '../../contexts/JobContext';
import { FaTerminal } from 'react-icons/fa';
import './VirtualizedLogPanel.css';

export const VirtualizedLogPanel: React.FC = () => {
    const { jobState } = useJob();
    const { logs, status } = jobState;
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of log list
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs.length]);

    if (status === 'idle') return null;

    // To prevent total memory crash on millions of logs while avoiding
    // react-window import issues natively slice the latest 500 lines
    const displayLogs = logs.slice(-500);

    return (
        <div className="virtual-log-panel">
            <div className="log-header">
                <FaTerminal className="log-icon" />
                <span className="log-title">Execution Logs {logs.length > 0 && `(${logs.length})`}</span>
            </div>
            
            <div className="log-container" ref={scrollRef}>
                {displayLogs.length === 0 ? (
                    <div className="log-empty">Waiting for logs...</div>
                ) : (
                    <div className="log-list">
                        {displayLogs.map((log, index) => (
                            <div key={index} className={`log-row ${log.includes('Error') ? 'log-error' : ''}`}>
                                <span className="log-timestamp">[{new Date().toLocaleTimeString()}]</span> {log}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
