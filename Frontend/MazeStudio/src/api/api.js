const API_URL = import.meta.env.VITE_API_URL;

export async function apiRequest(endpoint, options = {}) {
    const token =
        localStorage.getItem("token") ||
        sessionStorage.getItem("token");

    const headers = {
        ...(options.body instanceof FormData
            ? {}
            : { "Content-Type": "application/json" }),
        ...(token
            ? { Authorization: `Bearer ${token}` }
            : {}),
        ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
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
        console.error("API request failed:", {
            method: options.method || "GET",
            url: `${API_URL}${endpoint}`,
            status: response.status,
            statusText: response.statusText,
            response: data,
        });

        throw new Error(
            data.message ||
            data.error ||
            `Request failed with status ${response.status}`
        );
    }

    return data;
}