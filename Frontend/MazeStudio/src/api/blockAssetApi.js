const API_URL = import.meta.env.VITE_API_URL;

function getToken() {
    return (
        localStorage.getItem("token") ||
        sessionStorage.getItem("token")
    );
}

async function parseResponse(response) {
    const text = await response.text();

    let data = {};

    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = { message: text };
    }

    if (!response.ok) {
        throw new Error(
            data.message ||
            data.error ||
            `Request failed with status ${response.status}`
        );
    }

    return data;
}

export async function uploadBlockAsset(
    blockId,
    file
) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
        `${API_URL}/blocks/${blockId}/asset`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${getToken()}`,
            },
            body: formData,
        }
    );

    return parseResponse(response);
}

export async function deleteBlockAsset(blockId) {
    const response = await fetch(
        `${API_URL}/blocks/${blockId}/asset`,
        {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${getToken()}`,
            },
        }
    );

    return parseResponse(response);
}