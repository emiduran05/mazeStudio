import "./Settings.css";
import { useEffect, useState } from "react";
import StudioLayout from "../../layouts/studioLayout/StudioLayout";
import AsideConfig from "./asideConfig/AsideConfig";
import SettingsContent from "./settingsContent/SettingsContent";

export default function Settings() {
    const [darkmode, setDarkmode] = useState(
        localStorage.getItem("darkmode") === "true"
    );

    useEffect(() => {
        const interval = setInterval(() => {
            const currentDarkmode =
                localStorage.getItem("darkmode") === "true";

            setDarkmode((prev) => {
                if (prev !== currentDarkmode) {
                    return currentDarkmode;
                }

                return prev;
            });
        }, 200);

        return () => clearInterval(interval);
    }, []);

    return (
        <StudioLayout>
            <div
                className={`settings_main ${
                    darkmode ? "settings-darkmode" : ""
                }`}
            >
                <div className="settings_main_container">
                    <div className="settings_main_container_intro">
                        <p className="settings_title">Settings</p>
                        <span>
                            Manage your account, preferences, and application
                            settings.
                        </span>
                    </div>

                    <div className="settings_main_container_grid">
                        <div className="settings_main_container_grid_element">
                            <AsideConfig />
                        </div>

                        <div className="settings_main_container_grid_element">
                            <SettingsContent />
                        </div>

                        
                    </div>
                </div>
            </div>
        </StudioLayout>
    );
}