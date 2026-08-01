import { apiRequest } from "./api";

export function getLearningPathEditor(enrollmentId) {
    return apiRequest(`/enrollments/${enrollmentId}/learning-path`);
}

export function saveLearningPath(enrollmentId, payload) {
    return apiRequest(`/enrollments/${enrollmentId}/learning-path`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
}

export function removeLearningPath(enrollmentId) {
    return apiRequest(`/enrollments/${enrollmentId}/learning-path`, {
        method: "DELETE",
    });
}
