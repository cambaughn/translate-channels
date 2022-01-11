import initStripe from 'stripe';
const stripe = initStripe(process.env.STRIPE_SECRET_KEY);

const createCustomer = async () => {

}

const createPortalSession = async (stripeId) => {
  return await stripe.billingPortal.sessions.create(
    {
      customer: stripeId
    }
  );
};

export {
  createCustomer,
  createPortalSession
}