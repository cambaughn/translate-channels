import initStripe from 'stripe';
const stripe = initStripe(process.env.STRIPE_SECRET_KEY);

const createCustomer = async (teamId) => {
  const id = await stripe.customers.create(
    {
      name: teamId,
      metadata: {
        slackWorkspaceId: teamId
      },
      description: teamId
    }
  );
  return id;
};


const createCheckoutSession = async (stripeId, returnUrl) => {
  return await stripe.checkout.sessions.create({
    line_items: [
      {
        // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
        price: process.env.STRIPE_PRICE_ID
      },
    ],
    mode: 'subscription',
    success_url: returnUrl,
    customer: stripeId,
    cancel_url: returnUrl,
    subscription_data: {
      trial_period_days: 7
    }
  });

};

const getSubscriptionData = async (stripeId) => {
  const subscription = await stripe.subscriptions.list(
    {
      customer: stripeId,
      limit: 1
    }
  );

  console.log('subscription ', subscription);
  return Promise.resolve(subscription.data[0]);
};


// Portal doesn't work for metered billing
const createPortalSession = async (stripeId, returnUrl) => {
  return await stripe.billingPortal.sessions.create(
    {
      customer: stripeId,
      return_url: returnUrl
    }
  );
};

export {
  createCustomer,
  createCheckoutSession,
  getSubscriptionData
}