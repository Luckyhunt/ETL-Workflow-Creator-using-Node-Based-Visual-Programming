import "./Playground.css"

import Sidebar from "../../components/Sidebar/Sidebar"
import PlayCanvas from "../../components/PlayCanvas/PlayCanvas"
import Previewer from "../../components/Previewer/Previewer"
import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { workflowApi } from "../../services/workflowApi"
import { useWorkflow } from "../../contexts/useWorkflow"
import { useAuth } from "../../contexts/AuthContext"

const Playground = () => {
  const [searchParams] = useSearchParams();
  const workflowId = searchParams.get('id');
  const { workflow, setWorkflowState, setWorkflowName, deleteDraft } = useWorkflow();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(!!workflowId);
  const [isOwner, setIsOwner] = useState(true);

  useEffect(() => {
    const loadWorkflow = async () => {
      if (workflowId) {
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
      } else {
        // Only delete draft if we actually just arrived on a blank page from somewhere else
        // (prevents deleting right after saving a new workflow)
        deleteDraft();
        setIsLoading(false);
      }
    };

    loadWorkflow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId]);

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--color-text-grey)' }}>Loading Workflow...</div>;
  }

return (
  <div className='playground'>
    <div className="playground-container">
      {/* Sidebar */}
      <Sidebar />

      {/* Canvas Area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <PlayCanvas />
      </div>

      {/* Previewer */}
      <Previewer />
    </div>
  </div>
)
}

export default Playground