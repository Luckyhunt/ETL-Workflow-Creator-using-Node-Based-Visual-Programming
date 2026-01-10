import { useState } from "react"

import "./PlayCanvas.css"

const PlayCanvas = () => {

    const [ isGrabbing, setGrabbing ] = useState<boolean>(false)

    const handleMouseDown = () => {
        setGrabbing(true)
    }

    const handleMouseMove = (e) => {
        if (isGrabbing) {
            const board = e.target
            const docWidth = document.documentElement.clientWidth
            const docHeight = document.documentElement.clientHeight

            // A very complicated logic to prevent the board from being dragged out of the viewport
            if (board.offsetLeft <= 0) {
                board.style.left = `${e.movementX + board.offsetLeft}px`
            }
            else {
                board.style.left = "0px"
            }

            if (board.offsetLeft >= docWidth - 2000) {
                board.style.left = `${e.movementX + board.offsetLeft}px`
            }
            else {
                board.style.left = `${docWidth - 2000}px`
            }


            if (board.offsetTop <= 0) {
                board.style.top = `${e.movementY + board.offsetTop}px` 
            }
            else {
                board.style.top = "0px"
            }

            if (board.offsetTop > docHeight - 2000) {
                board.style.top = `${e.movementY + board.offsetTop}px`
            }
            else {
                board.style.top = `${docHeight - 2000}px`
            }


        }
    }

    const handleMouseUp = () => {
        setGrabbing(false)
    }

    return (
        <div className="playcanvas-container">
            <div
                className={ isGrabbing ? "playcanvas grabbing" : "playcanvas"}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            >

            </div>
        </div>
    )
}

export default PlayCanvas