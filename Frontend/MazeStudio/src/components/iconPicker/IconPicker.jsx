import { contentIcons } from "../../data/contentIcons";
import "./IconPicker.css";

export default function IconPicker({
    value,
    onChange,
    color = "purple",
}) {
    return (
        <div className="icon_picker">
            {contentIcons.map((icon) => (
                <button
                    key={icon.value}
                    type="button"
                    className={
                        value === icon.value
                            ? "icon_picker_item selected"
                            : "icon_picker_item"
                    }
                    data-color={color}
                    onClick={() => onChange(icon.value)}
                    title={icon.label}
                    aria-label={icon.label}
                >
                    <i className={`fa-solid ${icon.value}`}></i>
                </button>
            ))}
        </div>
    );
}