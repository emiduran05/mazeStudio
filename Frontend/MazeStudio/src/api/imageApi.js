const API_URL = import.meta.env.VITE_API_URL;


async function uploadImage(endpoint, file) {
    const token =
        localStorage.getItem("token") ||
        sessionStorage.getItem("token");

    if (!token) {
        throw new Error("Authentication token not found.");
    }

    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData,
    });

    const responseText = await response.text();

    let data = {};

    try {
        data = responseText
            ? JSON.parse(responseText)
            : {};
    } catch {
        data = {
            message: responseText,
        };
    }

    if (!response.ok) {
        console.error("Image upload failed:", {
            status: response.status,
            statusText: response.statusText,
            endpoint: `${API_URL}${endpoint}`,
            response: data,
        });

        throw new Error(
            data.message ||
            data.error ||
            `Image upload failed with status ${response.status}`
        );
    }

    return data;
}
async function deleteImage(endpoint) {
    const token = localStorage.getItem("token");

    if (!token) {
        throw new Error("Authentication token not found.");
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    let data = {};

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {
        throw new Error(
            data.message || "Could not remove the image."
        );
    }

    return data;
}

export function uploadJourneyCover(journeyId, file) {
    return uploadImage(
        `/learning-journeys/${journeyId}/cover`,
        file
    );
}

export function deleteJourneyCover(journeyId) {
    return deleteImage(
        `/learning-journeys/${journeyId}/cover`
    );
}

export function uploadStepImage(stepId, file) {
    return uploadImage(`/steps/${stepId}/image`, file);
}

export function deleteStepImage(stepId) {
    return deleteImage(`/steps/${stepId}/image`);
}