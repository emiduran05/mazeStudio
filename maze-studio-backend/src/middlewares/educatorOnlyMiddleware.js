const billingModel = require("../models/billingModel");

module.exports = async function educatorOnlyMiddleware(req, res, next) {
  try {
    if (req.user?.role !== "EDUCATOR") {
      const error = new Error("An active Educator subscription is required");
      error.statusCode = 403;
      return next(error);
    }

    const billing = await billingModel.getUserBillingDetails(req.user.id);
    const subscriptionStatus = String(
      billing?.subscription_status || ""
    ).toUpperCase();

    if (!["ACTIVE", "TRIALING"].includes(subscriptionStatus)) {
      const error = new Error("An active Educator subscription is required");
      error.statusCode = 403;
      return next(error);
    }

    return next();
  } catch (error) {
    return next(error);
  }
};
