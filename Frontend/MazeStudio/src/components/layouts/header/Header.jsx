import { useState } from "react";
import "./Header.css";
import Notifications from "./notifications/Notifications";

export default function Header({ isOpen, setIsOpen, darkmode, setDarkmode }) {

    const [isNotificationOpen, setIsNotificationOpen] = useState(false)

    return (<>

        <Notifications isNotificationOpen={isNotificationOpen} setIsNotificationOpen={setIsNotificationOpen} darkmode={darkmode}/>
    
            <div className={`studio_content_header ${darkmode ? "header_dark" : ""}`}>            
                
                <div className="studio_content_header_container">
                    <div className="studio_content_header_section">
                    <button
                        className={darkmode ? "light" : "darkmode"}
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

                        <i class="fa-solid fa-bars openButton" onClick={() => { setIsOpen(!isOpen) }}></i>
                </div>

                <div className="studio_content_header_section">
                    <div className="input_search">
                        <i class="fa-solid fa-magnifying-glass"></i>
                        <input type="text" placeholder="Search for learning journeys, students etc..." />
                        <button className="search_btn">
                            Search
                        </button>
                    </div>
                </div>

                <div className="studio_content_header_section">
                    <i class="fa-regular fa-bell bell" quantity="12" onClick={() => setIsNotificationOpen(true)}></i>
                </div>
            </div>
        </div>
        </>
    )
}