const stripe = require("../config/stripe");
const webhookModel = require("../models/webhookModel");


async function getEffectivePaymentMethod(subscription) {
  if (!subscription) return null;

  // 1. Primero revisa si la suscripción tiene un método propio
  if (subscription.default_payment_method) {
    return typeof subscription.default_payment_method === "string"
      ? await stripe.paymentMethods.retrieve(
          subscription.default_payment_method
        )
      : subscription.default_payment_method;
  }

  // 2. Si no, usa el método predeterminado del Customer
  const customer =
    typeof subscription.customer === "string"
      ? await stripe.customers.retrieve(subscription.customer)
      : subscription.customer;

  const customerPaymentMethodId =
    customer?.invoice_settings?.default_payment_method;

  if (!customerPaymentMethodId) return null;

  return typeof customerPaymentMethodId === "string"
    ? await stripe.paymentMethods.retrieve(customerPaymentMethodId)
    : customerPaymentMethodId;
}
function unixToDate(timestamp) {
  return timestamp ? new Date(timestamp * 1000) : null;
}

async function handleCheckoutCompleted(session) {
  if (["OFFERING_PURCHASE","OFFERING_WEEKLY_SUBSCRIPTION"].includes(session.metadata?.mazeStudioCheckoutKind)) {
    const marketplaceModel = require("../models/marketplaceModel");
    if(session.customer)await marketplaceModel.saveCustomer(session.metadata.mazeStudioUserId,typeof session.customer==="string"?session.customer:session.customer.id);
    await marketplaceModel.fulfillOrder(
      session.metadata.mazeStudioOrderId,
      session.payment_intent || null,
      false,
      session.subscription || null
    );
    return;
  }
  const userId =
    session.metadata?.mazeStudioUserId ||
    session.client_reference_id;

  if (!userId) {
    throw new Error(
      `Checkout Session ${session.id} has no Maze Studio user ID`
    );
  }

  const subscription = await stripe.subscriptions.retrieve(
    session.subscription,
    {
      expand: ["default_payment_method"],
    }
  );

  // 👇 AQUÍ
  console.log(
    "Subscription payment method:",
    subscription.default_payment_method
  );

  const priceId =
    subscription.items.data[0]?.price?.id || null;

  await webhookModel.activateEducator({
    userId,
    stripeCustomerId: session.customer,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    subscriptionStatus: subscription.status,
    currentPeriodStart: unixToDate(
      subscription.current_period_start
    ),
    currentPeriodEnd: unixToDate(
      subscription.current_period_end
    ),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });

  let paymentMethod = subscription.default_payment_method;

  if (paymentMethod && typeof paymentMethod === "string") {
    paymentMethod = await stripe.paymentMethods.retrieve(paymentMethod);
  }

  if (paymentMethod?.id && paymentMethod?.card) {
    await webhookModel.upsertPaymentMethod({
      userId,
      stripePaymentMethodId: paymentMethod.id,
      brand: paymentMethod.card.brand,
      last4: paymentMethod.card.last4,
      expMonth: paymentMethod.card.exp_month,
      expYear: paymentMethod.card.exp_year,
    });
  }
}

async function processStripeEvent(event) {
  switch (event.type) {
    case "account.updated": {
      const connectService=require("./connectService");await connectService.syncAccount(event.data.object);break;
    }
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object);
      break;

    case "customer.updated":
      await handleCustomerUpdated(event.data.object);
      break;

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await handleSubscriptionUpdated(event.data.object);
      break;

    case "payment_method.attached":
    case "payment_method.updated":
      console.log(
        `Payment method event received: ${event.type}`
      );
      break;

    case "invoice.payment_failed":
      console.log(
        `Invoice payment failed: ${event.data.object.id}`
      );
      break;

    case "invoice.paid": {
      const invoice=event.data.object;
      if(invoice.subscription){
        const subscription=await stripe.subscriptions.retrieve(invoice.subscription);
        if(subscription.metadata?.mazeStudioCheckoutKind==="OFFERING_WEEKLY_SUBSCRIPTION"){
          const marketplaceModel=require("../models/marketplaceModel");
          await marketplaceModel.extendWeeklySchedule(subscription.metadata.mazeStudioOrderId,4);
          if(invoice.billing_reason!=="subscription_create"){
            await marketplaceModel.recordSubscriptionRenewal(subscription.metadata.mazeStudioOrderId,invoice);
          }
        }
      }
      break;
    }

    default:
      console.log(`Unhandled Stripe event: ${event.type}`);
  }
}
async function savePaymentMethodForUser(
  userId,
  paymentMethodId
) {
  if (!userId || !paymentMethodId) {
    return;
  }

  const paymentMethod =
    typeof paymentMethodId === "string"
      ? await stripe.paymentMethods.retrieve(paymentMethodId)
      : paymentMethodId;

  if (!paymentMethod?.id) {
    return;
  }

  if (paymentMethod.type !== "card" || !paymentMethod.card) {
    console.log(
      `Payment method ${paymentMethod.id} is not a card`
    );
    return;
  }

  await webhookModel.upsertPaymentMethod({
    userId,
    stripePaymentMethodId: paymentMethod.id,
    brand: paymentMethod.card.brand,
    last4: paymentMethod.card.last4,
    expMonth: paymentMethod.card.exp_month,
    expYear: paymentMethod.card.exp_year,
  });
}

async function handleCustomerUpdated(customerEvent) {
  console.log("========== CUSTOMER UPDATED ==========");
  console.log("Customer ID:", customerEvent.id);

  const user =
    await webhookModel.findUserByStripeCustomerId(
      customerEvent.id
    );

  if (!user) {
    console.log(
      `No Maze Studio user found for Stripe customer ${customerEvent.id}`
    );
    return;
  }

  // Recuperamos la versión más reciente directamente de Stripe
  const customer = await stripe.customers.retrieve(
    customerEvent.id,
    {
      expand: ["invoice_settings.default_payment_method"],
    }
  );

  const paymentMethod =
    customer.invoice_settings?.default_payment_method;

  console.log(
    "Default payment method:",
    paymentMethod?.id || paymentMethod
  );

  if (!paymentMethod) {
    console.log(
      `Customer ${customer.id} has no default payment method`
    );
    return;
  }

  const resolvedPaymentMethod =
    typeof paymentMethod === "string"
      ? await stripe.paymentMethods.retrieve(paymentMethod)
      : paymentMethod;

  if (
    !resolvedPaymentMethod?.id ||
    !resolvedPaymentMethod?.card
  ) {
    console.log(
      "The default payment method is not a card"
    );
    return;
  }

  console.log("Saving card:", {
    id: resolvedPaymentMethod.id,
    brand: resolvedPaymentMethod.card.brand,
    last4: resolvedPaymentMethod.card.last4,
    expMonth: resolvedPaymentMethod.card.exp_month,
    expYear: resolvedPaymentMethod.card.exp_year,
  });

  await webhookModel.upsertPaymentMethod({
    userId: user.id,
    stripePaymentMethodId: resolvedPaymentMethod.id,
    brand: resolvedPaymentMethod.card.brand,
    last4: resolvedPaymentMethod.card.last4,
    expMonth: resolvedPaymentMethod.card.exp_month,
    expYear: resolvedPaymentMethod.card.exp_year,
  });
}
async function handleSubscriptionUpdated(subscription) {
  if (subscription.metadata?.mazeStudioCheckoutKind === "OFFERING_WEEKLY_SUBSCRIPTION") {
    await webhookModel.updateOfferingSubscription(
      subscription.id,
      subscription.status,
      subscription.cancel_at_period_end,
      unixToDate(subscription.current_period_end)
    );
    return;
  }
  await webhookModel.updateSubscription({
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodStart: unixToDate(
      subscription.current_period_start
    ),
    currentPeriodEnd: unixToDate(
      subscription.current_period_end
    ),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });

  const userId =
    subscription.metadata?.mazeStudioUserId;

  if (userId) {
    let paymentMethodId =
      subscription.default_payment_method;

    if (!paymentMethodId && subscription.customer) {
      const customer = await stripe.customers.retrieve(
        subscription.customer
      );

      paymentMethodId =
        customer.invoice_settings?.default_payment_method;
    }

    if (paymentMethodId) {
      await savePaymentMethodForUser(
        userId,
        paymentMethodId
      );
    }
  }

  if (
    ["canceled", "unpaid", "incomplete_expired"].includes(
      subscription.status
    )
  ) {
    await webhookModel.deactivateEducatorBySubscription(
      subscription.id
    );
  }
}

module.exports = {
  processStripeEvent,
};
