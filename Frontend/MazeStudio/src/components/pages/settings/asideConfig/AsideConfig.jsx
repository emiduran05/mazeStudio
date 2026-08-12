
import { NavLink } from "react-router-dom";
import "./AsideConfig.css";

export default function AsideConfig() {
    return (
        <>
            <div className="settings_main_container_grid_element_container">
                <NavLink to="/my-settings/educator-profile"
                    className={({ isActive }) => isActive ? "setting-link setting-active" : "setting-link"}>
                    <i className="fa-solid fa-address-card"></i>
                    <div className="setting-link-div"><span className="span_title">Public educator profile</span><span>Presentation, content and courses</span></div>
                </NavLink>
                <NavLink to="/my-settings/account"
                    className={({ isActive }) =>
                        isActive ? "setting-link setting-active" : "setting-link"
                    }>
                    <i class="fa-solid fa-user"></i>
                    <div className="setting-link-div">
                        <span className="span_title">Account</span>
                        <span>Profile and user information</span>
                    </div>

                </NavLink>

                <NavLink to="/my-settings/security"
                    className={({ isActive }) =>
                        isActive ? "setting-link setting-active" : "setting-link"
                    }>
                    <i class="fa-solid fa-shield-halved"></i>
                    <div className="setting-link-div">
                        <span className="span_title">Security</span>
                        <span>Password and 2FA</span>
                    </div>

                </NavLink>

                <NavLink to="/student/notifications"
                    className={({ isActive }) =>
                        isActive ? "setting-link setting-active" : "setting-link"
                    }>
                    <i class="fa-solid fa-bell"></i>
                    <div className="setting-link-div">
                        <span className="span_title">Notifications</span>
                        <span>Email and in-app preferences</span>
                    </div>

                </NavLink>


                <NavLink to="/my-settings/billing"
                    className={({ isActive }) =>
                        isActive ? "setting-link setting-active" : "setting-link"
                    }>
                    <i class="fa-solid fa-credit-card"></i>
                    <div className="setting-link-div">
                        <span className="span_title">Billing</span>
                        <span>Suscription and payment</span>
                    </div>

                </NavLink>


            </div>
        </>
    )
}
