import { useAuth } from "../../../context/AuthContext";
import { apiRequest } from "../../../api/api";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import "./AccountRecovery.css";

export default function AccountRecovery() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);


function getTimeLeft(targetDate) {
    const difference = new Date(targetDate).getTime() - new Date().getTime();

    if (difference <= 0) {
        return {
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            expired: true,
        };
    }

    return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        expired: false,
    };
}

  async function restoreAccount() {
    try {
      setLoading(true);

      const data = await apiRequest(
        "/users/account/restore",
        {
          method: "POST",
        }
      );

      setUser(data.user);

      navigate("/studio", {
        replace: true,
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  const [timeLeft, setTimeLeft] = useState(
    getTimeLeft(user?.scheduled_deletion_at)
);

useEffect(() => {
    if (!user?.scheduled_deletion_at) return;

    const interval = setInterval(() => {
        setTimeLeft(getTimeLeft(user.scheduled_deletion_at));
    }, 1000);

    return () => clearInterval(interval);
}, [user?.scheduled_deletion_at]);

  return (
    <div className="account_recovery_page">

      <div className="account_recovery_card">
        <div className="recovery_icon">
          <i className="fa-regular fa-clock"></i>
        </div>

        <h1>Account scheduled for deletion</h1>

        <p>
          Your account will be permanently deleted on:
        </p>

        

                <div className="deletion_countdown">
    <div>
        <strong>{timeLeft.days}</strong>
        <span>Days</span>
    </div>

    <div>
        <strong>{timeLeft.hours}</strong>
        <span>Hours</span>
    </div>

    <div>
        <strong>{timeLeft.minutes}</strong>
        <span>Minutes</span>
    </div>

    <div>
        <strong>{timeLeft.seconds}</strong>
        <span>Seconds</span>
    </div>
</div>

        <p>
          You can restore your account at any
          time before this date.
        </p>
        <strong>
          {user?.scheduled_deletion_at
            ? new Date(
                user.scheduled_deletion_at
              ).toLocaleDateString()
            : "30 days from deletion"}
        </strong>



        <button
          onClick={restoreAccount}
          disabled={loading}
        >
          {loading
            ? "Restoring..."
            : "Restore account"}
        </button>

        <button
          className="secondary"
          onClick={logout}
        >
          Logout
        </button>
      </div>
    </div>
  );
}