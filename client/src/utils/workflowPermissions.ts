import type { Workflow } from '../types';
import type { User } from '@supabase/supabase-js';

// ============================================================
// ROLE TYPES
// ============================================================
export type WorkflowRole = 'owner' | 'editor' | 'viewer' | 'none';

// ============================================================
// ROLE RESOLVER
// ============================================================
/**
 * Determines the role of the current user relative to a workflow.
 * Priority: owner > editor (via share) > viewer (via share) > none
 */
export function getWorkflowRole(
    workflow: Partial<Workflow> & { user_id?: string; sharedRole?: 'editor' | 'viewer' | null },
    user: User | null
): WorkflowRole {
    if (!user) return 'viewer'; // unauthenticated = read-only

    // If the user owns the workflow
    if (workflow.user_id && workflow.user_id === user.id) {
        return 'owner';
    }

    // If there's an explicit shared role attached (loaded via join)
    if (workflow.sharedRole === 'editor') return 'editor';
    if (workflow.sharedRole === 'viewer') return 'viewer';

    return 'none';
}

// ============================================================
// PERMISSION HELPERS (derived from role)
// ============================================================
export const rolePermissions = {
    canEditGraph: (role: WorkflowRole): boolean =>
        role === 'owner' || role === 'editor',

    canSave: (role: WorkflowRole): boolean =>
        role === 'owner' || role === 'editor',

    canRename: (role: WorkflowRole): boolean =>
        role === 'owner',

    canShare: (role: WorkflowRole): boolean =>
        role === 'owner',

    canDelete: (role: WorkflowRole): boolean =>
        role === 'owner',
};
