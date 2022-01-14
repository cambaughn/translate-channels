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
    cancel_url: returnUrl,
  });

};

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
  createPortalSession,
  createCheckoutSession
}