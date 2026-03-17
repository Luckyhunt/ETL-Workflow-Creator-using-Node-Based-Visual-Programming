import "./Playground.css"

import Sidebar from "../../components/Sidebar/Sidebar"
import PlayCanvas from "../../components/PlayCanvas/PlayCanvas"
import Previewer from "../../components/Previewer/Previewer"
import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { workflowApi } from "../../services/workflowApi"
import { useWorkflow } from "../../contexts/useWorkflow"

const Playground = () => {
  const [searchParams] = useSearchParams();
  const workflowId = searchParams.get('id');
  const { setWorkflowState, deleteDraft } = useWorkflow();
  const [isLoading, setIsLoading] = useState(!!workflowId);

  useEffect(() => {
    const loadWorkflow = async () => {
      if (workflowId) {
        try {
          setIsLoading(true);
          const data = await workflowApi.getWorkflow(workflowId);
          setWorkflowState({
            _id: data.id,
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

      {/* Canvas */}
      <PlayCanvas />

      {/* Previewer */}
      <Previewer />
    </div>
  </div>
)
}

export default Playground