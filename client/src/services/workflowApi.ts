import { supabase } from './supabaseClient';


export interface WorkflowData {
    id: string;
    user_id: string;
    name: string;
    nodes: any[];
    edges: any[];
    created_at: string;
    updated_at: string;
}

export const workflowApi = {
    // Get all workflows for the logged in user
    async getUserWorkflows(): Promise<WorkflowData[]> {
        const { data, error } = await supabase
            .from('workflows')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return data as WorkflowData[];
    },

    // PHASE 17: Get only metadata (no nodes/edges) for fast dashboard loading
    async getUserWorkflowsMetadata(): Promise<Partial<WorkflowData>[]> {
        const { data, error } = await supabase
            .from('workflows')
            .select('id, name, updated_at, user_id')
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return data as Partial<WorkflowData>[];
    },

    // Find the next available "Untitled X" name for the current user
    async generateNextUntitledName(): Promise<string> {
        const { data: workflows, error } = await supabase
            .from('workflows')
            .select('name')
            .like('name', 'Untitled %');

        if (error) throw error;

        const numbers = workflows
            .map(w => {
                const match = w.name.match(/Untitled (\d+)/);
                return match ? parseInt(match[1]) : 0;
            })
            .filter(n => n > 0);

        const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
        return `Untitled ${nextNum}`;
    },

    // Check if a workflow name is unique for the current user
    async checkNameUniqueness(name: string, excludeId?: string): Promise<boolean> {
        let query = supabase
            .from('workflows')
            .select('id')
            .eq('name', name);
            
        if (excludeId) {
            query = query.neq('id', excludeId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data.length === 0;
    },

    // Get workflows shared with the logged in user
    async getSharedWorkflows(): Promise<(WorkflowData & { role: 'viewer' | 'editor'; owner_email?: string })[]> {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!userData.user || !userData.user.email) return [];

        const { data, error } = await supabase
            .from('workflow_shares')
            .select(`
                role,
                workflow:workflows(*)
            `)
            .eq('shared_with_email', userData.user.email);

        if (error) throw error;
        
        // Supabase returns the joined data as an object inside 'workflow'. Process it to a flat structure.
        return data
            .filter((item: any) => item.workflow !== null) // Ignore orphaned shares
            .map((item: any) => ({
                ...item.workflow,
                role: item.role
            }));
    },

    // PHASE 17: Get shared metadata only
    async getSharedWorkflowsMetadata(): Promise<(Partial<WorkflowData> & { role: 'viewer' | 'editor' })[]> {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!userData.user || !userData.user.email) return [];

        const { data, error } = await supabase
            .from('workflow_shares')
            .select(`
                role,
                workflow:workflows(id, name, updated_at, user_id)
            `)
            .eq('shared_with_email', userData.user.email);

        if (error) throw error;
        
        return data
            .filter((item: any) => item.workflow !== null)
            .map((item: any) => ({
                ...item.workflow,
                role: item.role
            }));
    },

    // Get a specific workflow by ID
    async getWorkflow(id: string): Promise<WorkflowData> {
        const { data, error } = await supabase
            .from('workflows')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as WorkflowData;
    },

    // Create a new workflow
    async createWorkflow(name?: string, nodes: any[] = [], edges: any[] = []): Promise<WorkflowData> {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        let finalName = name;
        if (!finalName) {
            finalName = await this.generateNextUntitledName();
        }

        const { data, error } = await supabase
            .from('workflows')
            .insert([
                { 
                    name: finalName, 
                    nodes, 
                    edges,
                    user_id: userData.user.id
                }
            ])
            .select()
            .single();

        if (error) throw error;
        return data as WorkflowData;
    },

    // Update an existing workflow (save changes) - Partial Update Logic
    async updateWorkflow(id: string, name: string, nodes: any[], edges: any[]): Promise<WorkflowData> {
        // 1. Fetch current database state to merge and diff safely
        const { data: current, error: fetchError } = await supabase
            .from('workflows')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        const updates: any = {};
        
        if (name && name !== current.name) updates.name = name;
        
        // 2. Diff detection (only update elements that actually changed)
        const currentNodesStr = JSON.stringify(current.nodes || []);
        const newNodesStr = JSON.stringify(nodes || []);
        if (currentNodesStr !== newNodesStr) {
            updates.nodes = nodes;
        }

        const currentEdgesStr = JSON.stringify(current.edges || []);
        const newEdgesStr = JSON.stringify(edges || []);
        if (currentEdgesStr !== newEdgesStr) {
            updates.edges = edges;
        }

        // 3. Prevent unnecessary database hits if no changes detected
        if (Object.keys(updates).length === 0) {
            return current as WorkflowData;
        }

        updates.updated_at = new Date().toISOString();

        // 4. Safe Merge
        const { data, error } = await supabase
            .from('workflows')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) throw error;
        
        // If RLS blocked the update or it returned 0 rows, return current state
        if (!data || data.length === 0) {
            console.warn("Update returned 0 rows. This might be due to RLS permissions.");
            return current as WorkflowData;
        }

        return data[0] as WorkflowData;
    },

    // Delete a workflow
    async deleteWorkflow(id: string): Promise<void> {
        const { error } = await supabase
            .from('workflows')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Share workflow with another user
    async shareWorkflow(workflowId: string, email: string, role: 'viewer' | 'editor'): Promise<void> {
        const { error } = await supabase
            .from('workflow_shares')
            .upsert({
                workflow_id: workflowId,
                shared_with_email: email,
                role: role
            }, { onConflict: 'workflow_id, shared_with_email' });

        if (error) throw error;
    },

    // Get users shared on a workflow
    async getWorkflowShares(workflowId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('workflow_shares')
            .select('*')
            .eq('workflow_id', workflowId);

        if (error) throw error;
        return data as any[];
    },

    // Remove a share
    async removeShare(shareId: string): Promise<void> {
        const { error } = await supabase
            .from('workflow_shares')
            .delete()
            .eq('id', shareId);

        if (error) throw error;
    }
};
