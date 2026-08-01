import { apiRequest } from "./api";

export function getMyEnrollments() {
    return apiRequest("/learner/enrollments");
}

export function getLearnerJourney(journeyId) {
    return apiRequest(`/learner/journeys/${journeyId}`);
}

export function updateLearningPathGoal(journeyId, goal) {
    return apiRequest(`/learner/journeys/${journeyId}/learning-path/goal`, {
        method: "PUT",
        body: JSON.stringify({ goal }),
    });
}

export function getLearnerStep(journeyId, stepId) {
    return apiRequest(`/learner/journeys/${journeyId}/steps/${stepId}`);
}

export function updateStepProgress(stepId, status) {
    return apiRequest(`/learner/steps/${stepId}/progress`, {
        method: "PUT",
        body: JSON.stringify({ status }),
    });
}

export function submitChallengeAttempt(challengeId, answer) {
    return apiRequest(`/learner/challenges/${challengeId}/attempts`, {
        method: "POST",
        body: JSON.stringify({ answer }),
    });
}

export function getChallengeAttempts(challengeId) {
    return apiRequest(`/learner/challenges/${challengeId}/attempts`);
}

export function checkExerciseAnswer(blockId, answer) {
    return apiRequest(`/learner/blocks/${blockId}/check-answer`, {
        method: "POST",
        body: JSON.stringify({ answer }),
    });
}
