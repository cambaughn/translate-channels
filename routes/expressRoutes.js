// const stripeConnector = require('../stripe_engine/stripe_connector');
import bodyParser from 'body-parser';
import teamsDB from '../util/firebaseAPI/teams.js';
import userDB from '../util/firebaseAPI/users.js';
import { createCustomer, createCheckoutSession, createPortalSession } from '../util/stripe/stripe.js';
import Mixpanel from 'mixpanel';
// create an instance of the mixpanel client
const mixpanel = Mixpanel.init(process.env.MIXPANEL_API_KEY);


const expressRoutes = (app, slackApp, dbConnector) => {
  app.get('/direct_install', ({ query }, response) => {
    let redirect_url = process.env.REDIRECT_URL || 'https://translate-channels.herokuapp.com/auth_redirect';

    console.log('direct install ', redirect_url);

    response.redirect(`https://slack.com/oauth/v2/authorize?client_id=${process.env.CLIENT_ID}&scope=channels:read,commands,users:read,chat:write,im:history&user_scope=channels:history,chat:write&redirect_uri=${redirect_url}`);
  });

  // Handle authentication button press
  // Slack url redirects to here with a code that we then send in to oauth for an auth token
  // https://api.slack.com/authentication/oauth-v2#obtaining
  app.get('/auth_redirect', ({ query }, res) => {
    console.log('auth redirect =========');
    const code = query.code;
    const redirect_url = process.env.REDIRECT_URL || 'https://translate-channels.herokuapp.com/auth_redirect';

    let accessDetails = {
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      code: code,
      redirect_uri: redirect_url
    }

    console.log('auth redirect install ', redirect_url);

    return slackApp.client.oauth.v2.access(accessDetails)
    .then(async (result) => {
      console.log('got oauth back');
      let { team, authed_user, app_id } = result;
      let userInfo = {
        access_token: authed_user.access_token,
        team_id: team.id,
        app_id: app_id
      }

      console.log('got user ', authed_user.id, userInfo);
      // Create new user in firebase - this is the first time we're seeing them
      await userDB.updateUser(authed_user.id, userInfo);

      // Find team in firebase database
      let teamInFirebase = await teamsDB.getTeam(team.id);

      // If we're getting the team tokens from them as well, update/create the team in the database
      if (result.bot_user_id && result.access_token && !teamInFirebase?.team_access_token) { // if we have the bot_user_id, the access_token, and the team doesn't already exist, then create it
        console.log('creating new team =======');
        let teamUpdates = { 
          slack_team_id: team.id,
          bot_user_id: result.bot_user_id,
          team_access_token: result.access_token
        }
        
        await teamsDB.createNew(team.id, teamUpdates);
        console.log('created new team');
        
        mixpanel.track('Sign up', {
          distinct_id: team.id,
          "Team ID": team.id
        });
      }

      // Upon approval and new user creation, redirect back to app: https://api.slack.com/reference/deep-linking
      res.redirect(`https://slack.com/app_redirect?app=${process.env.APP_ID}&team=${team.id}`);
      // This version of the link works better in that it directs users back to the app's home page, but it leaves the auth request page hanging, which looks incorrect
      // res.redirect(`slack://app?team=${team.id}&id=${process.env.APP_ID}&tab=home`);
    }).catch((error) => {
      throw error;
    });
  });


  app.get('/portal', async ({ query }, res) => {
    const { teamId } = query;
    const redirect_url = `https://slack.com/app_redirect?app=${process.env.APP_ID}&team=${teamId}`;
    const isProd = process.env.ENVIRONMENT !== 'development';
    const team = await teamsDB.getTeam(teamId);
    let customerId = isProd ? team.stripe_customer_id : team.test_stripe_customer_id;

    console.log('launching portal');
    const portalSession = await createPortalSession(customerId, redirect_url);
    return res.redirect(portalSession.url);
  });

  // Checkout - when first signing up for a plan
  app.get('/checkout', async ({ query }, res) => {
    const { teamId, plan } = query;
    console.log('got plan: ', plan);
    const isProd = process.env.ENVIRONMENT !== 'development';
    const redirect_url = `https://slack.com/app_redirect?app=${process.env.APP_ID}&team=${teamId}`;
    // NOTE: Instead of creating StripeId earlier, we're going to create the Stripe customer just before starting the checkout session
    
    const team = await teamsDB.getTeam(teamId);
    let customerId = isProd ? team.stripe_customer_id : team.test_stripe_customer_id;

    if (!customerId) {
      const customer = await createCustomer(teamId);
      let teamUpdate = {};
      // if in prod, assign to stripe_customer_id
      // if development, assign to test_stripe_customer_id
      teamUpdate[isProd ? 'stripe_customer_id' : 'test_stripe_customer_id'] = customer.id;
      customerId = customer.id;
      // Update team in Firebase
      await teamsDB.updateTeam(teamId, teamUpdate);
    }

    const checkoutSession = await createCheckoutSession(customerId, redirect_url, plan);
    return res.redirect(checkoutSession.url);
  });

  
  app.get('/test', async (req, res) => {
    console.log('test received --------');
    res.send('app is up and running');
  });


  app.post('/stripe-webhook', bodyParser.raw({ type: 'application/json' }), (request, response) => {
    let event;
    try {
      event = JSON.parse(request.body);
    } catch (err) {
      response.status(400).send(`Webhook Error: ${err.message}`);
    }
    // Handle the events
    switch (event.type) {
      case 'customer.subscription.updated':
        dbConnector.updateSubscription(event.data.object);
        break;
      case 'customer.subscription.deleted':
        dbConnector.deleteSubscription(event.data.object);
        break;
      default:
        // Unexpected event type
        return response.status(400).end();
    }
    // Return a response to acknowledge receipt of the event
    response.json({ received: true });
  });
}

export default expressRoutes;