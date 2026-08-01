const express = require("express");
const cors = require("cors");

const webhookRoutes = require("./routes/webhookRoutes");
const healthRoutes = require("./routes/healthRoutes");
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const accountRoutes = require("./routes/accountRoutes");
const securityRoutes = require("./routes/securityRoutes");
const billingRoutes = require("./routes/billingRoutes");
const learningJourneyRoutes = require("./routes/learningJourneyRoutes");
const stageRoutes = require("./routes/stageRoutes");
const stepRoutes = require("./routes/stepRoutes");
const errorHandler = require("./middlewares/errorHandler");
const blockRoutes = require(
  "./routes/blockRoutes"
);
const enrollmentRoutes = require(
  "./routes/enrollmentRoutes"
);
const learnerRoutes = require(
  "./routes/learnerRoutes"
);
const challengeRoutes = require("./routes/challengeRoutes");
const publicChallengeRoutes = require("./routes/publicChallengeRoutes");
const learnerProfileRoutes = require("./routes/learnerProfileRoutes");
const privateStepRoutes = require("./routes/privateStepRoutes");
const learningPathRoutes = require("./routes/learningPathRoutes");
const collaboratorRoutes = require("./routes/collaboratorRoutes");
const insightsRoutes = require("./routes/insightsRoutes");
const calendarRoutes = require("./routes/calendarRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const offeringRoutes = require("./routes/offeringRoutes");
const cohortRoutes = require("./routes/cohortRoutes");
const sessionSeriesRoutes = require("./routes/sessionSeriesRoutes");
const marketplaceRoutes = require("./routes/marketplaceRoutes");
const connectRoutes = require("./routes/connectRoutes");
const refundRoutes = require("./routes/refundRoutes");
const educatorProfileRoutes = require("./routes/educatorProfileRoutes");

const app = express();

app.use(cors());

app.use("/api/webhooks", webhookRoutes);

app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", profileRoutes);
app.use("/api/users", accountRoutes);
app.use("/api/users", securityRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/learning-journeys", learningJourneyRoutes);
app.use("/api", stageRoutes);
app.use("/api", stepRoutes);
app.use("/api", blockRoutes);
app.use("/api", enrollmentRoutes);
app.use("/api/learner", learnerRoutes);
app.use("/api", challengeRoutes);
app.use("/api", learnerProfileRoutes);
app.use("/api", privateStepRoutes);
app.use("/api", learningPathRoutes);
app.use("/api", collaboratorRoutes);
app.use("/api", insightsRoutes);
app.use("/api", calendarRoutes);
app.use("/api", notificationRoutes);
app.use("/api", offeringRoutes);
app.use("/api", cohortRoutes);
app.use("/api", sessionSeriesRoutes);
app.use("/api", marketplaceRoutes);
app.use("/api", connectRoutes);
app.use("/api", refundRoutes);
app.use("/api", educatorProfileRoutes);
app.use("/api/public", publicChallengeRoutes);

app.use(errorHandler);

module.exports = app;
