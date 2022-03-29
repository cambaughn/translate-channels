import initStripe from 'stripe';
const stripe = initStripe(process.env.STRIPE_SECRET_KEY);
import userDB from '../firebaseAPI/users.js'

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
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1
      }
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


// Report usage for subscription
const reportSubscriptionUsage = async (subscriptionData, user) => {
  const subscriptionItemId = subscriptionData?.items?.data[0].id;
  const lastActivityPeriod = user?.last_activity_period;
  const billingPeriod = subscriptionData.current_period_end;
  // Check user's last activity period and compare to current billing period to see if the user has been active during current billing period
  // These timestamps should be the same
  if (lastActivityPeriod !== billingPeriod) { // if they're not the same, then we need to update user in Firebase and record usage
    let userUpdates = {
      last_activity_period: billingPeriod
    }
    // Update user
    await userDB.updateUser(user.id, userUpdates);
    
    return await stripe.subscriptionItems.createUsageRecord(
      subscriptionItemId,
      {
        quantity: 1,
        action: 'increment',
      }
    );
  }

  return Promise.resolve(true);
}

export {
  createCustomer,
  createCheckoutSession,
  getSubscriptionData,
  createPortalSession,
  reportSubscriptionUsage
}