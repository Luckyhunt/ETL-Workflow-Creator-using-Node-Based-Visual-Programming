import { useState } from "react"
import Logo from "../../images/logo.svg"

import "./Sidebar.css"

import { LuFileInput } from "react-icons/lu"
import { IoSettingsOutline } from "react-icons/io5"
import { HiLightningBolt } from "react-icons/hi";

const Sidebar = () => {

    const [ open, setOpen ] = useState<boolean>(true)

    return (
        <div className={ open ? "sidebar" : "sidebar close"}>
            {/* <div className="sidebar-btn">
                <button
                    className="toggle-btn"
                    onClick={() => setOpen(!open)} 
                >
                    {
                        open ? "<<" : ">>" 
                    }
                </button>
            </div> */}
            <div className="sidebar-logo logo-container">
                <img src={Logo} alt="" />
                <span className="navbar-logo-name">NodeFlow</span> <br />
            </div>
            <div className="sidebar-contents">
                <div className="sidebar-part">
                    <div className="sidebar-part-title">
                        Input
                    </div>
                    <ul className="sidebar-part-nodes">
                        <li className="sidebar-part-node-item">
                            <button>
                                <span className="icon"><LuFileInput /></span> File Input Node
                            </button>
                        </li>
                    </ul>
                </div>

                <div className="sidebar-part">
                    <div className="sidebar-part-title">
                        Transformation
                    </div>
                    <ul className="sidebar-part-nodes">
                        <li className="sidebar-part-node-item">
                            <button>
                                <span className="icon"><IoSettingsOutline /></span> Normalization
                            </button>
                        </li>
                    </ul>
                </div>

                <div className="sidebar-part">
                    <div className="sidebar-part-title">
                        Output
                    </div>
                    <ul className="sidebar-part-nodes">
                        <li className="sidebar-part-node-item">
                            <button>
                                <span className="icon"><HiLightningBolt /></span> Result
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default Sidebar