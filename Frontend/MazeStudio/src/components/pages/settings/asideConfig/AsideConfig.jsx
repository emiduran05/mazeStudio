
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

                <NavLink to="/my-settings/notifications"
                    className={({ isActive }) =>
                        isActive ? "setting-link setting-active" : "setting-link"
                    }>
                    <i class="fa-solid fa-bell"></i>
                    <div className="setting-link-div">
                        <span className="span_title">Notifications</span>
                        <span>Email and in-app preferences</span>
                    </div>

                </NavLink>


                <NavLink to="/my-settings/appearance"
                    className={({ isActive }) =>
                        isActive ? "setting-link setting-active" : "setting-link"
                    }>
                    <i class="fa-solid fa-paintbrush"></i>
                    <div className="setting-link-div">
                        <span className="span_title">Appearance</span>
                        <span>Theme preferences</span>
                    </div>

                </NavLink>

                <NavLink to="/my-settings/lang"
                    className={({ isActive }) =>
                        isActive ? "setting-link setting-active" : "setting-link"
                    }>
                    <i class="fa-solid fa-earth-americas"></i>
                    <div className="setting-link-div">
                        <span className="span_title">Language & Region</span>
                        <span>Language and Timezone</span>
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


                <NavLink to="/my-settings/integrations"
                    className={({ isActive }) =>
                        isActive ? "setting-link setting-active" : "setting-link"
                    }>
                    <i class="fa-solid fa-screwdriver-wrench"></i>
                    <div className="setting-link-div">
                        <span className="span_title">Integrations</span>
                        <span>Connected apps and services</span>
                    </div>

                </NavLink>

                <NavLink to="/my-settings/privacy"
                    className={({ isActive }) =>
                        isActive ? "setting-link setting-active" : "setting-link"
                    }>
                    <i class="fa-solid fa-lock"></i>
                    <div className="setting-link-div">
                        <span className="span_title">Privacy</span>
                        <span>Privacy and data settings</span>
                    </div>

                </NavLink>
            </div>
        </>
    )
}
