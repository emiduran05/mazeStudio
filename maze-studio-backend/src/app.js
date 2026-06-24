const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/healthRoutes");
const authRoutes = require("./routes/authRoutes");
const errorHandler = require("./middlewares/errorHandler");
const profileRoutes = require("./routes/profileRoutes");
const accountRoutes = require("./routes/accountRoutes");


const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", profileRoutes);
app.use("/api/users", accountRoutes);

app.use(errorHandler);

module.exports = app;