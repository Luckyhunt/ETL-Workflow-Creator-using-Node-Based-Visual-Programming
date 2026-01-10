
import "./Playground.css"

import Sidebar from "../../components/Sidebar/Sidebar"
import PlayCanvas from "../../components/PlayCanvas/PlayCanvas"
import Previewer from "../../components/Previewer/Previewer"

const Playground = () => {
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