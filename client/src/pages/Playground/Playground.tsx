import "./Playground.css"

import Sidebar from "../../components/Sidebar/Sidebar";
import PlayCanvas from "../../components/PlayCanvas/PlayCanvas";
import MobileDagLayout from "../../components/MobileDagLayout/MobileDagLayout";
import Previewer from "../../components/Previewer/Previewer";
import { useEffect, useState } from "react"
import { useResponsive } from "../../hooks/useResponsive"
import toast from 'react-hot-toast'
import { useSearchParams } from "react-router-dom"
import { workflowApi } from "../../services/workflowApi"
import { useWorkflow } from "../../contexts/useWorkflow"
import { useAuth } from "../../contexts/AuthContext"
import { getWorkflowRole } from "../../utils/workflowPermissions"
import type { WorkflowRole } from "../../utils/workflowPermissions"
import { FaBolt } from "react-icons/fa"

const Playground = ({ mode = 'private' }: { mode?: 'public' | 'private' }) => {
  const [searchParams] = useSearchParams();
  const workflowId = searchParams.get('id');
  const { workflow, setWorkflowState, deleteDraft } = useWorkflow();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(mode === 'private' && !!workflowId);
  // RBAC: resolved role for current user
  // Default to 'owner' if logged in with no workflowId (brand new workflow being created)
  const [role, setRole] = useState<WorkflowRole>(
    mode === 'private' && !workflowId ? 'owner' : 'viewer'
  );
  
  const { isMobile } = useResponsive();

  // ─── Core Fetch Logic ─────────────────────────────────────────
  const loadWorkflow = async (skipIfLoaded = true) => {
    if (mode !== 'private' || !workflowId) {
      if (mode === 'private' && !workflowId && workflow._id) deleteDraft();
      // No URL ID = brand new workflow → user is the owner if logged in
      if (user) setRole('owner');
      setIsLoading(false);
      return;
    }

    // PERFORMANCE FIX: Skip if data already in memory (e.g. after a save)
    if (skipIfLoaded && workflow._id === workflowId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await workflowApi.getWorkflow(workflowId);

      // RBAC: Resolve the user's role based on ownership vs shared access
      const resolvedRole = getWorkflowRole(
        { user_id: data.user_id, sharedRole: (data as any).sharedRole ?? null },
        user
      );
      setRole(resolvedRole);

      setWorkflowState({
        _id: data.id,
        user_id: data.user_id,
        name: data.name,
        activeSourceNode: null,
        selectedNode: null,
        definition: {
          nodes: data.nodes as any,
          edges: data.edges as any
        }
      });
    } catch (error) {
      console.error("Failed to load workflow:", error);
      toast.error("Failed to load workflow. It may have been deleted or you don't have access.");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Load on URL / mode change ────────────────────────────────
  useEffect(() => {
    loadWorkflow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId, mode]);

  // ─── ISSUE 4: Re-resolve role when user logs in/out ───────────
  useEffect(() => {
    if (mode === 'public') return;
    if (workflowId) {
      // Force fresh load so permissions are re-evaluated for the new user session
      loadWorkflow(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ─── Loading Spinner ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center', height: '100vh', color: 'var(--color-text-grey)',
        fontFamily: '"Plus Jakarta Sans", sans-serif', gap: '12px'
      }}>
        <div style={{
          width: '36px', height: '36px', border: '3px solid var(--color-border-grey)',
          borderTopColor: 'var(--color-accent-1)', borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <span>Loading Workflow...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className='playground'>
      <div className="playground-container">
        {/* Sidebar — receives RBAC role for permission gating */}
        <Sidebar mode={mode} role={role} />

        {/* Canvas Area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {mode === 'public' && (
            <div style={{
              background: 'var(--color-bg-2)',
              borderBottom: '1px solid var(--color-border-grey)',
              color: 'var(--color-text-dark)', padding: '10px 20px', display: 'flex',
              justifyContent: 'center', alignItems: 'center', gap: '15px',
              fontSize: '0.9rem', fontWeight: '600', zIndex: 10,
              boxShadow: '0 2px 10px rgba(0,0,0,0.5)'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaBolt /> Playground Mode — Changes won't be saved.
              </span>
              <button
                onClick={() => window.location.href = '/'}
                style={{
                  background: 'var(--color-bg-1)', border: '1px solid var(--color-border-grey)',
                  color: 'var(--color-text-dark)', padding: '4px 12px', borderRadius: '6px',
                  cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', transition: 'all 0.2s'
                }}
              >Login to Save</button>
            </div>
          )}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {isMobile ? (
                <MobileDagLayout />
            ) : (
                <PlayCanvas canEdit={mode === 'public' || role !== 'viewer'} />
            )}
          </div>
        </div>

        {/* Previewer */}
        <Previewer />
      </div>
    </div>
  )
}

export default Playground