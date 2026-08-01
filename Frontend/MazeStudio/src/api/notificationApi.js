import { apiRequest } from "./api";
export const getNotifications=(unread=false)=>apiRequest(`/notifications${unread?"?unread=true":""}`);
export const markNotificationRead=(id)=>apiRequest(`/notifications/${id}/read`,{method:"PATCH"});
export const markAllNotificationsRead=()=>apiRequest("/notifications/read-all",{method:"PATCH"});
export const getNotificationPreferences=()=>apiRequest("/notification-preferences");
export const updateNotificationPreferences=(preferences)=>apiRequest("/notification-preferences",{method:"PUT",body:JSON.stringify(preferences)});
