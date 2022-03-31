import initStripe from 'stripe';
const stripe = initStripe(process.env.STRIPE_SECRET_KEY);
import userDB from '../firebaseAPI/users.js';

const pricesToTiers = process.env.ENVIRONMENT === 'development' ? { // development
  'price_1Kid6yIEl24u0zqNNqoL8gMY': 'small',
  'price_1KidBQIEl24u0zqNxyIKHEGe': 'medium',
  'price_1KidBzIEl24u0zqNoy0jqflM': 'large',
  'price_1KidCSIEl24u0zqNrmkdUpXO': 'unlimited',
  'small': 'price_1Kid6yIEl24u0zqNNqoL8gMY',
  'medium': 'price_1KidBQIEl24u0zqNxyIKHEGe',
  'large': 'price_1KidBzIEl24u0zqNoy0jqflM',
  'unlimited': 'price_1KidCSIEl24u0zqNrmkdUpXO'
} : { // production

}

const subscriptionTierDetails = {
  small: {
    maxUsers: 5
  },
  medium: {
    maxUsers: 20
  },
  large: {
    maxUsers: 80
  },
  unlimited: {
    unlimited: true
  }
}

const getSubscriptionTierDetails = (pricing_id) => {
  const size = pricesToTiers[pricing_id];
  return subscriptionTierDetails[size];
}

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


const createCheckoutSession = async (stripeId, returnUrl, plan) => {
  const priceId =  process.env[`STRIPE_PRICE_ID_${plan.toUpperCase()}`];
  console.log('got price : ', priceId);

  return await stripe.checkout.sessions.create({
    line_items: [
      {
        // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
        price: priceId,
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
  reportSubscriptionUsage,
  getSubscriptionTierDetails
}