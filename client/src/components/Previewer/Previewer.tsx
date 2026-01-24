import { useState, useRef, useEffect } from "react"
import "./Previewer.css"

const Previewer = () => {
    const [open, setOpen] = useState(true)
    const [width, setWidth] = useState(250) // default width
    const isResizing = useRef(false)

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing.current) return
            const newWidth = window.innerWidth - e.clientX
            if (newWidth > 120 && newWidth < 600) {   // min/max width
                setWidth(newWidth)
            }
        }

        const handleMouseUp = () => {
            isResizing.current = false
        }

        window.addEventListener("mousemove", handleMouseMove)
        window.addEventListener("mouseup", handleMouseUp)

        return () => {
            window.removeEventListener("mousemove", handleMouseMove)
            window.removeEventListener("mouseup", handleMouseUp)
        }
    }, [])

    return (
        <div 
            className={open ? "previewer" : "previewer close"}
            style={{ width: open ? `${width}px` : "0px" }}
        >
            {/* Resize Handle */}
            {open && (
                <div
                    className="previewer-resizer"
                    onMouseDown={() => (isResizing.current = true)}
                />
            )}

            <div className="previewer-btn">
                <button
                    className="toggle-btn"
                    onClick={() => setOpen(!open)} 
                >
                    { open ? ">>" : "<<"}
                </button>
            </div>

            <div className="previewer-title">Previewer</div>

            <div className="previewer-body">
                <p className="previewer-guide">Select a Node to preview</p>
            </div>
        </div>
    )
}

export default Previewer
