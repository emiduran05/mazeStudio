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

app.use(errorHandler);

module.exports = app;