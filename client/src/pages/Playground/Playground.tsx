import "./Playground.css"

import Sidebar from "../../components/Sidebar/Sidebar"
import PlayCanvas from "../../components/PlayCanvas/PlayCanvas"
import Previewer from "../../components/Previewer/Previewer"
import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { workflowApi } from "../../services/workflowApi"
import { useWorkflow } from "../../contexts/useWorkflow"
import { useAuth } from "../../contexts/AuthContext"

const Playground = ({ mode = 'private' }: { mode?: 'public' | 'private' }) => {
  const [searchParams] = useSearchParams();
  const workflowId = searchParams.get('id');
  const { workflow, setWorkflowState, setWorkflowName, deleteDraft } = useWorkflow();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(mode === 'private' && !!workflowId);
  const [isOwner, setIsOwner] = useState(mode === 'private');

  useEffect(() => {
    const loadWorkflow = async () => {
      // ONLY load from backend if in private mode and we have an ID
      if (mode === 'private' && workflowId) {
        try {
          setIsLoading(true);
          const data = await workflowApi.getWorkflow(workflowId);
          setIsOwner(!user || data.user_id === user.id);
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
          alert("Failed to load workflow. It may have been deleted.");
        } finally {
          setIsLoading(false);
        }
      } else if (mode === 'private') {
        // Only delete draft in private mode when starting fresh
        deleteDraft();
        setIsLoading(false);
      } else {
        // Public mode: do nothing, keep existing in-memory state or blank
        setIsLoading(false);
      }
    };

    loadWorkflow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId, mode]);

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--color-text-grey)' }}>Loading Workflow...</div>;
  }

return (
  <div className='playground'>
    <div className="playground-container">
      {/* Sidebar */}
      <Sidebar mode={mode} />

      {/* Canvas Area */}
      {/* Canvas Area with Phase 17: Playground Mode Banner */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {mode === 'public' && (
          <div style={{
            background: 'linear-gradient(90deg, var(--color-accent-1), var(--color-accent-2))',
            color: 'white',
            padding: '10px 20px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '15px',
            fontSize: '0.9rem',
            fontWeight: '600',
            zIndex: 10,
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <span>⚡ Playground Mode — Changes won't be saved.</span>
            <button 
              onClick={() => window.location.href = '/'}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.4)',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: '700',
                transition: 'all 0.2s'
              }}
            >
                Login to Save
            </button>
          </div>
        )}
        <div style={{ flex: 1, position: 'relative' }}>
          <PlayCanvas />
        </div>
      </div>

      {/* Previewer */}
      <Previewer />
    </div>
  </div>
)
}

export default Playground