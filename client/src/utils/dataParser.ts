/**
 * Utility functions for parsing file content into tabular format (array of objects)
 */

/**
 * Parse CSV content into array of objects
 */
export function parseCSVToArray(csvContent: string): any[] {
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    const headers = parseCSVLine(lines[0]);
    const result: any[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row: any = {};

        for (let j = 0; j < headers.length; j++) {
            row[headers[j]] = values[j]?.trim() || '';
        }

        result.push(row);
    }

    return result;
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"' && !inQuotes) {
            inQuotes = true;
        } else if (char === '"' && inQuotes) {
            if (nextChar === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = false;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current);
    return result;
}

/**
 * Parse JSON content into array of objects
 * Handles nested structures by extracting the first array found
 */
export function parseJSONToArray(jsonContent: string): any[] {
    try {
        const parsed = JSON.parse(jsonContent);
        return extractArrayFromObject(parsed);
    } catch (error) {
        console.error('Failed to parse JSON:', error);
        return [];
    }
}

/**
 * Extract array of objects from a parsed JSON structure
 * - If root is an array, return it
 * - Otherwise, find the first nested array of objects
 * - Flatten nested objects if needed
 */
function extractArrayFromObject(obj: any): any[] {
    if (Array.isArray(obj)) {
        return obj.map(item => flattenObject(item));
    }

    if (obj && typeof obj === 'object') {
        // Look for arrays in the object values
        for (const key of Object.keys(obj)) {
            const value = obj[key];
            if (Array.isArray(value) && value.length > 0) {
                // Check if array contains objects
                if (typeof value[0] === 'object' && value[0] !== null) {
                    return value.map(item => flattenObject(item));
                }
            } else if (typeof value === 'object' && value !== null) {
                // Recursively search in nested objects
                const nested = extractArrayFromObject(value);
                if (nested.length > 0) {
                    return nested;
                }
            }
        }
    }

    // If no array found, wrap the single object in an array
    if (obj && typeof obj === 'object') {
        return [flattenObject(obj)];
    }

    return [];
}

/**
 * Flatten a nested object into a single-level object
 * Uses dot notation for nested keys (e.g., "address.city")
 */
function flattenObject(obj: any, prefix = ''): any {
    const result: any = {};

    for (const key of Object.keys(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];

        if (value && typeof value === 'object' && !Array.isArray(value)) {
            // Recursively flatten nested objects
            const flattened = flattenObject(value, newKey);
            Object.assign(result, flattened);
        } else if (Array.isArray(value)) {
            // Convert arrays to string representation for display
            result[newKey] = value.map(v =>
                typeof v === 'object' ? JSON.stringify(v) : String(v)
            ).join(', ');
        } else {
            result[newKey] = value;
        }
    }

    return result;
}

/**
 * Find actual data row elements in the XML
 * Looks for elements with leaf children, preferring shallower (parent) elements
 */
function findDataRows(root: Element): Element[] {
    const candidates: Map<Element, number> = new Map(); // element -> depth
    
    // Recursively search for elements with text content and no children
    function search(element: Element, depth: number = 0) {
        // Skip namespace declarations
        if (element.tagName.includes('xmlns') || element.tagName.startsWith('xml:')) {
            return;
        }
        
        // Check if this element has leaf children (children with no children)
        const leafChildren = Array.from(element.children).filter(child => 
            !child.tagName.includes('xmlns') && child.children.length === 0 && child.textContent?.trim()
        );
        
        // If this element has leaf children, it's a candidate data record
        if (leafChildren.length > 0) {
            // Only add if not already added, or if this is shallower (prefer parents)
            const existingDepth = candidates.get(element);
            if (existingDepth === undefined || depth < existingDepth) {
                candidates.set(element, depth);
            }
        }
        
        // Recurse into children that have their own children
        for (const child of Array.from(element.children)) {
            if (!child.tagName.includes('xmlns') && child.children.length > 0) {
                search(child, depth + 1);
            }
        }
    }
    
    search(root);
    
    // If we found candidates, filter to keep only the shallowest level
    // This ensures we prefer 'employee' over 'project'
    if (candidates.size > 0) {
        const minDepth = Math.min(...candidates.values());
        return Array.from(candidates.entries())
            .filter(([_, depth]) => depth === minDepth)
            .map(([el, _]) => el);
    }
    
    return [];
}

/**
 * Parse XML content into array of objects
 * Handles nested structures and extracts actual data rows
 */
export function parseXMLToArray(xmlContent: string): any[] {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            console.error('XML parsing error:', parserError.textContent);
            return [];
        }

        const root = xmlDoc.documentElement;
        console.log('XML Root tag:', root.tagName);
        console.log('XML Root children:', Array.from(root.children).map(c => c.tagName));

        const dataRows = findDataRows(root);

        
        console.log('Found data rows:', dataRows.length);
        console.log('Data row tag names:', dataRows.map(el => el.tagName));
        
        // Convert found elements to objects
        if (dataRows.length > 0) {
            const result = dataRows.map(el => elementToFlatObject(el));
            console.log('Parsed result:', result);
            return result;
        }
        
        // Fallback: extract from root's direct children
        return Array.from(root.children)
            .filter(child => !child.tagName.includes('xmlns'))
            .map(child => elementToFlatObject(child));
        
    } catch (error) {
        console.error('Failed to parse XML:', error);
        return [];
    }
}

/**
 * Convert XML element to a flat object, extracting only data fields
 * Filters out namespace attributes and complex nested objects
 */
function elementToFlatObject(element: Element): any {
    const result: any = {};
    
    function extractFields(el: Element, prefix = '') {
        for (const child of Array.from(el.children)) {
            // Skip namespace elements
            if (child.tagName.includes('xmlns') || child.tagName.startsWith('xml:')) {
                continue;
            }
            
            // Get clean tag name without namespace prefix
            const cleanTagName = child.tagName.replace(/^[^:]+:/, '');
            const fullKey = prefix ? `${prefix}.${cleanTagName}` : cleanTagName;
            
            // If child has no children, it's a simple text field
            if (child.children.length === 0) {
                result[fullKey] = child.textContent || '';
            }
            // If child has children, recurse into it
            else {
                extractFields(child, fullKey);
            }
        }
    }
    
    extractFields(element);
    return result;
}

/**
 * Main function to parse any file content based on format
 */
export function parseFileContentToArray(fileContent: string, fileFormat: string): any[] {
    const format = fileFormat.toLowerCase();

    switch (format) {
        case 'csv':
            return parseCSVToArray(fileContent);
        case 'json':
            return parseJSONToArray(fileContent);
        case 'xml':
            return parseXMLToArray(fileContent);
        default:
            // Auto-detect
            const trimmed = fileContent.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                return parseJSONToArray(fileContent);
            }
            if (trimmed.startsWith('<')) {
                return parseXMLToArray(fileContent);
            }
            return parseCSVToArray(fileContent);
    }
}
