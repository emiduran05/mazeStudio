import "./Aside.css";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { OrbitProgress } from "react-loading-indicators";
import { useState } from "react";

export default function Aside({ isOpen, darkmode, setDarkmode }) {

    const { user, authLoading, logout } = useAuth();
    const fullName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
    const [quickOptions, setQuickOptions] = useState(false)



    return (<>

        <div className={isOpen ? "aside open" : "aside"}>

            <div className={`aside_component ${darkmode ? "aside_dark" : ""}`}>
                <div className="top_content">



                    <header className="aside_header">
                        <div className="aside_header_content">

                            <div className="logo">
                                <img src="/logo.png" alt="Maze Studio Logo" />
                            </div>

                            <div className="aside_header_content_title">
                                <p>Maze Studio</p>
                            </div>

                        </div>
                    </header>

                    <nav className="aside_nav">
                        <div className="aside_nav_container">

                            <NavLink to="/studio"
                                className={({ isActive }) =>
                                    isActive ? "link active" : "link"
                                }>
                                <i class="fa-solid fa-pen"></i>

                                <span>Studio</span>
                            </NavLink>

                            <NavLink to="/learning-journeys"
                                className={({ isActive }) =>
                                    isActive ? "link active" : "link"
                                }>
                                <i class="fa-solid fa-chalkboard-user"></i>

                                <span>Learning Journeys</span>
                            </NavLink>

                            <NavLink to="/insights"
                                className={({ isActive }) =>
                                    isActive ? "link active" : "link"
                                }>
                                <i class="fa-solid fa-chart-bar"></i>

                                <span>Insights</span>
                            </NavLink>

                            <NavLink to="/my-settings/account"
                                className={({ isActive }) =>
                                    isActive ? "link active" : "link"
                                }>
                                <i class="fa-solid fa-gear"></i>

                                <span>Settings</span>
                            </NavLink>




                        </div>
                    </nav>

                </div>


                <div className="bottom_content">
                    <button
                        className={darkmode ? "light_btn" : "darkmode_btn"}
                        onClick={() => {
                            const newMode = !darkmode;
                            setDarkmode(newMode);
                            localStorage.setItem("darkmode", newMode);
                        }}
                    >
                        {darkmode ? (
                            <>
                                <i className="fa-solid fa-sun"></i>
                                <span>Light Mode</span>
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-moon"></i>
                                <span>Dark Mode</span>
                            </>
                        )}
                    </button>

                    <div className="user_profile">
                        <i className="fa-solid fa-ellipsis-vertical" onClick={() => setQuickOptions(!quickOptions)}></i>
                        <div className={`quickOptions ${quickOptions ? "quickActive " : ""}`}>
                            <span>Quick Options</span>
                            <button onClick={() => {logout()}} >Logout</button>
                        </div>


                        <div className="user_img">
                            <img
                                src={
                                    user?.avatar_url ||
                                    "https://freesvg.org/img/abstract-user-flat-4.png"
                                }
                                alt={fullName || "Profile avatar"}
                            />                    </div>

                        <div className="user_info">
                            {

                                authLoading ? <OrbitProgress color="#4040FB" size="medium" /> : <> <p>{fullName}</p>
                                    <span>{user?.email} </span></>

                            }

                        </div>
                    </div>


                </div>
            </div>
        </div>
    </>)

}