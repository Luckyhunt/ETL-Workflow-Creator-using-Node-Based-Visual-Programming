import { type FC, useState, useMemo, useRef, useEffect } from "react";
import type { NodeProps } from "../../types";
import { MdDownload } from "react-icons/md";
import "./OutputNode.css"

type DownloadFormat = 'json' | 'csv' | 'xml';

const API_BASE_URL = 'https://etl-workflow-creator-using-node-based.onrender.com';

const OutputNode: FC<NodeProps> = ({ node }) => {
    // Use props to satisfy linter
    useMemo(() => node, [node]);
    
    // Type guard to ensure we're accessing file property safely
    const outputData = node.data as any;
    const fileName = outputData.file?.filename || node.name || "output";
    const processedData = outputData.file?.processedData || [];
    const content = outputData.file?.content || "";
    
    const hasData = (content && content.trim() !== '') || (processedData && processedData.length > 0);
    
    const [showDropdown, setShowDropdown] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    
    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        
        if (showDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDropdown]);
    
    // Get base filename without extension
    const baseFileName = fileName.replace(/\.[^/.]+$/, "");
    
    // Get data to export - prefer processedData, fall back to parsing content
    const getExportData = (): any[] => {
        if (processedData && processedData.length > 0) {
            console.log("Using processedData:", processedData.length, "items");
            return processedData;
        }
        if (content && content.trim() !== '') {
            try {
                const parsed = JSON.parse(content);
                console.log("Parsed content:", parsed);
                if (Array.isArray(parsed)) {
                    console.log("Using parsed content:", parsed.length, "items");
                    return parsed;
                }
            } catch {
                console.error("Failed to parse content as JSON array");
            }
        }
        console.log("No data found, returning empty array");
        return [];
    };
    
    const downloadFile = async (format: DownloadFormat) => {
        console.log("=== DOWNLOAD START ===");
        console.log("downloadFile called with format:", format);
        console.log("hasData:", hasData);
        console.log("API_BASE_URL:", API_BASE_URL);
        
        if (!hasData) {
            console.log("No data available, returning");
            return;
        }
        
        const dataToExport = getExportData();
        console.log("dataToExport length:", dataToExport.length);
        console.log("dataToExport sample:", dataToExport.slice(0, 2));
        
        if (dataToExport.length === 0) {
            console.error("No data available to export");
            return;
        }
        
        setIsLoading(true);
        
        try {
            console.log("Calling backend export API...");
            console.log("Request URL:", `${API_BASE_URL}/api/export`);
            
            // Test backend connection first
            try {
                const testResponse = await fetch(`${API_BASE_URL}/health`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
                console.log("Backend health check status:", testResponse.status);
                if (!testResponse.ok) {
                    console.warn("Backend not accessible, using fallback");
                    // Fallback: simple JSON download
                    const jsonContent = JSON.stringify(dataToExport, null, 2);
                    const blob = new Blob([jsonContent], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${baseFileName}.json`;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => {
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    }, 100);
                    console.log("Fallback JSON download completed");
                    return;
                }
            } catch (healthError) {
                console.warn("Backend health check failed:", healthError);
            }
            
            console.log("Request body:", JSON.stringify({
                data: dataToExport,
                format: format,
                filename: baseFileName
            }));
            
            // Call backend export endpoint
            const response = await fetch(`${API_BASE_URL}/api/export`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data: dataToExport,
                    format: format,
                    filename: baseFileName
                })
            });
            
            console.log("Response status:", response.status);
            console.log("Response headers:", response.headers);
            
            if (!response.ok) {
                console.error("HTTP error:", response.status, response.statusText);
                return;
            }
            
            const result = await response.json();
            console.log("Response result:", result);
            
            if (!result.success) {
                console.error("Export failed:", result.error);
                return;
            }
            
            console.log("Creating blob with content type:", result.mimeType);
            console.log("Content length:", result.content.length);
            
            // Download the file content returned from backend
            const blob = new Blob([result.content], { type: result.mimeType });
            const url = URL.createObjectURL(blob);
            console.log("Created blob URL:", url);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = result.filename;
            console.log("Download filename:", result.filename);
            
            document.body.appendChild(a);
            console.log("Added to DOM, clicking...");
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                console.log("Cleaned up DOM and URL");
            }, 100);
            
            console.log("File download initiated successfully");
            
        } catch (error) {
            console.error("Download error:", error);
            console.error("Error stack:", (error as Error).stack);
        } finally {
            setIsLoading(false);
            setShowDropdown(false);
            console.log("=== DOWNLOAD END ===");
        }
    };
    
    return (
        <div className="common-node-body outputnode-body">
            <div className="common-node-output-file-container">
                <span className="common-node-output-file">{ fileName }</span>
                <div ref={dropdownRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <button
                        className="common-node-button" 
                        onClick={() => {
                            console.log("Download button clicked, hasData:", hasData, "isLoading:", isLoading);
                            setShowDropdown(!showDropdown);
                            console.log("showDropdown set to:", !showDropdown);
                        }}
                        disabled={!hasData || isLoading}
                        style={{ position: 'relative' }}
                        title={hasData ? "Download file (JSON, CSV, XML)" : "No data to download"}
                    >
                        {isLoading ? (
                            <span style={{ fontSize: '12px' }}>...</span>
                        ) : (
                            <MdDownload />
                        )}
                    </button>
                    {showDropdown && hasData && !isLoading && (
                        <div style={{
                            position: 'fixed',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                            zIndex: 99999,
                            minWidth: '150px',
                            padding: '4px 0'
                        }}>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#6b7280', marginBottom: '8px', padding: '0 8px' }}>
                                Download Format:
                            </div>
                            <button
                                onClick={() => {
                                    console.log("JSON format button clicked");
                                    downloadFile('json');
                                }}
                                disabled={isLoading}
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: 'none',
                                    background: 'none',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    color: '#374151',
                                    borderBottom: '1px solid #f3f4f6'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                JSON
                            </button>
                            <button
                                onClick={() => {
                                    console.log("CSV format button clicked");
                                    downloadFile('csv');
                                }}
                                disabled={isLoading}
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: 'none',
                                    background: 'none',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    color: '#374151',
                                    borderBottom: '1px solid #f3f4f6'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                CSV
                            </button>
                            <button
                                onClick={() => {
                                    console.log("XML format button clicked");
                                    downloadFile('xml');
                                }}
                                disabled={isLoading}
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: 'none',
                                    background: 'none',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    color: '#374151'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                XML
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Force refresh
export default OutputNode;