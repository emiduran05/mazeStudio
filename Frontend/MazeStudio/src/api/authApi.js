import { apiRequest } from "./api";

export function forgotPassword(email) {
    return apiRequest("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
    });
}

export function resetPassword(token, newPassword) {
    return apiRequest("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword }),
    });
}


export function registerAccount(form) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify(form),
  });
}