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

    // Get a specific workflow by ID, including the current user's share role (if applicable)
    async getWorkflow(id: string): Promise<WorkflowData & { sharedRole?: 'editor' | 'viewer' | null }> {
        // 1. Fetch the workflow itself
        const { data, error } = await supabase
            .from('workflows')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // 2. Try to resolve the current user's share role (for editors/viewers)
        let sharedRole: 'editor' | 'viewer' | null = null;
        try {
            const { data: userData } = await supabase.auth.getUser();
            if (userData?.user?.email) {
                const { data: shareData } = await supabase
                    .from('workflow_shares')
                    .select('role')
                    .eq('workflow_id', id)
                    .eq('shared_with_email', userData.user.email)
                    .maybeSingle(); // returns null if no row found (not an error)

                sharedRole = shareData?.role ?? null;
            }
        } catch (shareErr) {
            // Non-fatal — if we can't fetch the share record, treat as no shared role
            console.warn('Could not fetch share role:', shareErr);
        }

        return { ...(data as WorkflowData), sharedRole };
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

    // Update an existing workflow (save changes)
    // Works for BOTH owners and editors — no pre-fetch SELECT required (which would fail for editors under RLS)
    async updateWorkflow(id: string, name: string, nodes: any[], edges: any[]): Promise<{ id: string }> {
        const updates: any = {
            nodes,
            edges,
            updated_at: new Date().toISOString(),
        };

        // Only update name if provided
        if (name) updates.name = name;

        const { data, error } = await supabase
            .from('workflows')
            .update(updates)
            .eq('id', id)
            .select('id');

        if (error) {
            // Provide a clear message if RLS blocked the update
            if (error.code === 'PGRST301' || error.message?.includes('row-level security')) {
                throw new Error('Permission denied: You do not have editor access to this workflow. Contact the owner.');
            }
            throw error;
        }

        if (!data || data.length === 0) {
            throw new Error('Save failed: No rows updated. Check your Supabase RLS policies for editor UPDATE access.');
        }

        console.log(`[workflowApi] updateWorkflow success for id=${id}`);
        return data[0] as { id: string };
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
