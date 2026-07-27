import "./StudioLayout.css";
import Aside from "../aside/Aside";
import Header from "../header/Header";
import { useState } from "react";
import AccountStatusWarning from "../accountWarning/AccountStatusWarning";

export default function DashboardLayout({children}){

    const [isOpen, setIsOpen] = useState(false);
    const [darkmode, setDarkmode] = useState(() => {
    return localStorage.getItem("darkmode") === "true";
    });

    return(
        <>


        
        <div className="grid_content">


            <div onClick={() => {setIsOpen(!isOpen)}} className={isOpen ? "bg-cover-active" : "bg-cover"}></div>


            <Aside isOpen={isOpen} darkmode={darkmode} setDarkmode={setDarkmode}/>

           



            <main className={`studio_content ${darkmode ? "dark_studio " : ""}`}>


                <Header isOpen={isOpen} setIsOpen={setIsOpen} darkmode={darkmode} setDarkmode={setDarkmode}/>
        <AccountStatusWarning />




                {children}
                
            </main>

        </div>
        
        </>


    )
}