import { useState } from "react";
import "./Header.css";
import Notifications from "./notifications/Notifications";
import {useNavigate} from "react-router-dom";

export default function Header({ isOpen, setIsOpen, darkmode, setDarkmode }) {

    const [isNotificationOpen, setIsNotificationOpen] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)
    const navigate=useNavigate();

    return (<>

        <Notifications isNotificationOpen={isNotificationOpen} setIsNotificationOpen={setIsNotificationOpen} darkmode={darkmode} onCountChange={setUnreadCount}/>
    
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

                        <i className="fa-solid fa-bars openButton" onClick={() => { setIsOpen(!isOpen) }}></i>
                </div>

                <div className="studio_content_header_section">
                    <form className="input_search" onSubmit={event=>{event.preventDefault();const query=new FormData(event.currentTarget).get("q")?.trim();if(query)navigate(`/studio/search?q=${encodeURIComponent(query)}`)}}>
                        <i className="fa-solid fa-magnifying-glass"></i>
                        <input name="q" type="search" placeholder="Search journeys, students or challenges" />
                        <button type="submit" className="search_btn">
                            Search
                        </button>
                    </form>
                </div>

                <div className="studio_content_header_section">
                    <i className="fa-regular fa-bell bell" quantity={unreadCount || undefined} onClick={() => setIsNotificationOpen(true)}></i>
                </div>
            </div>
        </div>
        </>
    )
}
