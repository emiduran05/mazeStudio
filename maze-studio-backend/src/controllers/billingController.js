const billingService = require("../services/billingService");

async function getCheckoutSession(req, res, next) {
  try {
    const result = await billingService.getCheckoutSessionStatus(
      req.params.sessionId
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
}


async function getMyBilling(req, res, next) {
  try {
    const billing = await billingService.getUserBilling(
      req.user.id
    );

    res.json({
      billing,
    });
  } catch (error) {
    next(error);
  }
}

async function createPortal(req, res, next) {
  try {
    const result = await billingService.createCustomerPortal(
      req.user.id
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCheckoutSession,
  getMyBilling,
  createPortal
};