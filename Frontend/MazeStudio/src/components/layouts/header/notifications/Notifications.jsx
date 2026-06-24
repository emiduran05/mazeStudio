import { useMemo, useState } from "react";
import "./Notifications.css";

export default function Notifications({
  isNotificationOpen,
  setIsNotificationOpen,
  darkmode
}) {
  const [activeTab, setActiveTab] = useState("all");

  const notifications = [
    {
      icon: "fa-user-plus",
      color: "purple",
      title: "New student joined",
      description: "Sarah Johnson joined your journey Spanish A1 Basics.",
      time: "2m ago",
      unread: true,
      type: "general",
    },
    {
      icon: "fa-check",
      color: "green",
      title: "Step completed",
      description: "Mike Chen completed Step 3: Present Simple.",
      time: "15m ago",
      unread: true,
      type: "general",
    },
    {
      icon: "fa-star",
      color: "orange",
      title: "Challenge submitted",
      description: 'Emma Wilson submitted the challenge "Vocabulary Practice".',
      time: "1h ago",
      unread: true,
      type: "general",
    },
    {
      icon: "fa-comment",
      color: "blue",
      title: "New mention",
      description: "David Brown mentioned you on Step 2: Personal Introductions.",
      time: "2h ago",
      unread: false,
      type: "mention",
    },
    {
      icon: "fa-calendar",
      color: "purple",
      title: "Live class reminder",
      description: 'Your live class "Conversation Practice" starts in 30 minutes.',
      time: "3h ago",
      unread: false,
      type: "general",
    },
    {
      icon: "fa-file-lines",
      color: "red",
      title: "Assignment due soon",
      description: 'The assignment "Write a short paragraph" is due tomorrow.',
      time: "5h ago",
      unread: false,
      type: "general",
    },
    {
      icon: "fa-chart-column",
      color: "green",
      title: "Weekly insights ready",
      description: "Your weekly insights report is ready to view.",
      time: "1d ago",
      unread: false,
      type: "general",
    },
    {
      icon: "fa-gift",
      color: "orange",
      title: "New achievement",
      description: 'James Lee earned a new badge "Consistent Learner".',
      time: "2d ago",
      unread: false,
      type: "general",
    },
  ];

  const filteredNotifications = useMemo(() => {
    if (activeTab === "unread") {
      return notifications.filter((notification) => notification.unread);
    }

    if (activeTab === "mentions") {
      return notifications.filter((notification) => notification.type === "mention");
    }

    return notifications;
  }, [activeTab]);

  const unreadCount = notifications.filter((notification) => notification.unread).length;
  const mentionsCount = notifications.filter((notification) => notification.type === "mention").length;

  return (
    <div className={`notifications ${isNotificationOpen ? "open_notif" : ""} ${darkmode ? "dark_notif" : ""}`}>
      <div className="notifications_first">
        <p>My Notifications</p>

        <i
          className="fa-solid fa-x"
          onClick={() => setIsNotificationOpen(false)}
        ></i>
      </div>

      <div className="notifications_tabs">
        <button
          className={activeTab === "all" ? "active" : ""}
          onClick={() => setActiveTab("all")}
        >
          All <span>{notifications.length}</span>
        </button>

        <button
          className={activeTab === "unread" ? "active" : ""}
          onClick={() => setActiveTab("unread")}
        >
          Unread <span>{unreadCount}</span>
        </button>

        <button
          className={activeTab === "mentions" ? "active" : ""}
          onClick={() => setActiveTab("mentions")}
        >
          Mentions <span>{mentionsCount}</span>
        </button>
      </div>

      <div className="notifications_list">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification, index) => (
            <div className="notification_card" key={`${notification.title}-${index}`}>
              <div className={`notification_icon ${notification.color}`}>
                <i className={`fa-solid ${notification.icon}`}></i>
              </div>

              <div className="notification_content">
                <strong>{notification.title}</strong>
                <span>{notification.description}</span>
              </div>

              <div className="notification_meta">
                <small>{notification.time}</small>

                {notification.unread && <div className="notification_dot"></div>}
              </div>
            </div>
          ))
        ) : (
          <div className="notifications_empty">
            <i className="fa-regular fa-bell"></i>
            <strong>No notifications here</strong>
            <span>You're all caught up.</span>
          </div>
        )}
      </div>

      <div className="notifications_footer">
        <button>
          <i className="fa-solid fa-gear"></i>
          Notification Settings
        </button>

        <button className="mark_read">Mark all as read</button>
      </div>
    </div>
  );
}