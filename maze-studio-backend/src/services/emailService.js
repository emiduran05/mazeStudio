const transporter = require(
 "../config/mailer"
);

async function sendJourneyInvitation({
  recipientEmail,
  invitationUrl,
  journeyTitle,
  educatorName,
}) {
  const senderAddress =
    process.env.EMAIL_FROM_ADDRESS ||
    process.env.EMAIL_USER;

  if (!senderAddress) {
    throw new Error(
      "EMAIL_FROM_ADDRESS or EMAIL_USER is missing"
    );
  }

  const safeJourneyTitle =
    journeyTitle || "a Learning Journey";

  const safeEducatorName =
    educatorName || "An educator";

  const info = await transporter.sendMail({
    from: {
      name:
        process.env.EMAIL_FROM_NAME ||
        "Maze Studio",
      address: senderAddress,
    },

    to: recipientEmail,

    subject:
      `Invitation to ${safeJourneyTitle}`,

    text: [
      `${safeEducatorName} invited you to join ${safeJourneyTitle} on Maze Studio.`,
      "",
      "Accept the invitation using this link:",
      invitationUrl,
      "",
      "This invitation expires in 7 days.",
    ].join("\n"),

    html: `
      <!DOCTYPE html>
      <html lang="en">
        <body style="
          margin:0;
          padding:32px;
          background:#f5f6ff;
          font-family:Arial,sans-serif;
          color:#111827;
        ">
          <div style="
            max-width:600px;
            margin:0 auto;
            padding:32px;
            background:#ffffff;
            border:1px solid #e7e7f5;
            border-radius:22px;
          ">
            <div style="
              margin-bottom:24px;
              color:#4642ff;
              font-size:18px;
              font-weight:800;
            ">
              Maze Studio
            </div>

            <h1 style="
              margin:0 0 16px;
              font-size:28px;
            ">
              You have been invited
            </h1>

            <p style="
              margin:0 0 12px;
              color:#4b5563;
              line-height:1.7;
            ">
              <strong>${escapeHtml(
                safeEducatorName
              )}</strong>
              invited you to join
              <strong>${escapeHtml(
                safeJourneyTitle
              )}</strong>.
            </p>

            <p style="
              margin:0 0 24px;
              color:#4b5563;
              line-height:1.7;
            ">
              Create your Maze Studio account or
              sign in to access the Learning Journey.
            </p>

            <a
              href="${escapeHtml(invitationUrl)}"
              style="
                display:inline-block;
                padding:13px 20px;
                border-radius:13px;
                background:#4642ff;
                color:#ffffff;
                text-decoration:none;
                font-weight:800;
              "
            >
              Accept invitation
            </a>

            <p style="
              margin:24px 0 0;
              color:#9ca3af;
              font-size:13px;
              line-height:1.6;
            ">
              This invitation expires in 7 days.
              If you did not expect this message,
              you can ignore it.
            </p>
          </div>
        </body>
      </html>
    `,
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
  };
}

async function sendLearnerProfileLink({
  recipientEmail,
  invitationUrl,
  learnerName,
}) {
  const senderAddress =
    process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER;
  if (!senderAddress) throw new Error("EMAIL_FROM_ADDRESS or EMAIL_USER is missing");
  const safeName = learnerName || "your learner profile";
  const info = await transporter.sendMail({
    from: {
      name: process.env.EMAIL_FROM_NAME || "Maze Studio",
      address: senderAddress,
    },
    to: recipientEmail,
    subject: "Connect your Maze Studio learning progress",
    text: [
      `An educator has been tracking progress for ${safeName} on Maze Studio.`,
      "Sign in or create an account with this email, then connect the profile:",
      invitationUrl,
      "",
      "This secure link expires in 7 days.",
    ].join("\n"),
    html: `<div style="max-width:600px;margin:32px auto;padding:32px;border:1px solid #e7e7f5;border-radius:22px;font-family:Arial,sans-serif;color:#111827">
      <strong style="color:#4642ff">Maze Studio</strong>
      <h1>Connect your learning progress</h1>
      <p style="color:#4b5563;line-height:1.7">An educator created an academic profile for <strong>${escapeHtml(safeName)}</strong>. Connect it to your account to access its Journeys, Challenges and progress.</p>
      <a href="${escapeHtml(invitationUrl)}" style="display:inline-block;padding:13px 20px;border-radius:13px;background:#4642ff;color:#fff;text-decoration:none;font-weight:800">Connect my profile</a>
      <p style="color:#9ca3af;font-size:13px">Sign in using this email. This link expires in 7 days.</p>
    </div>`,
  });
  return { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

module.exports = {
  sendJourneyInvitation,
  sendLearnerProfileLink,
};
