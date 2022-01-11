// const stripeConnector = require('../stripe_engine/stripe_connector');
import bodyParser from 'body-parser';
import teamsDB from '../util/firebaseAPI/teams.js';
import userDB from '../util/firebaseAPI/users.js';
import { createCustomer, createPortalSession } from '../util/stripe/stripe.js';


const expressRoutes = (app, slackApp, dbConnector) => {
  app.get('/direct_install', ({ query }, res) => {
    res.redirect(`https://slack.com/oauth/v2/authorize?client_id=${process.env.CLIENT_ID}&scope=channels:read,commands,users:read,chat:write,im:history&user_scope=channels:history,chat:write`);
  });

  // Handle authentication button press
  // Slack url redirects to here with a code that we then send in to oauth for an auth token
  // https://api.slack.com/authentication/oauth-v2#obtaining
  app.get('/auth_redirect', ({ query }, res) => {
    console.log('auth redirect =========');
    const code = query.code;
    let accessDetails = {
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      code: code,
      redirect_uri: process.env.REDIRECT_URL
    }

    return slackApp.client.oauth.v2.access(accessDetails)
    .then(async (result) => {
      let { team, authed_user, app_id } = result;
      let userInfo = {
        access_token: authed_user.access_token,
        team_id: team.id,
        app_id: app_id
      }

      // console.log('result ===> ', result);
      console.log('testing ', result.bot_user_id, result.access_token);
      // Create new user in firebase - this is the first time we're seeing them
      await userDB.createUser(authed_user.id, userInfo);

      // If we're getting the team tokens from them as well, update/create the team in the database
      if (result.bot_user_id && result.access_token) {
        let teamUpdates = { 
          slack_team_id: team.id,
          bot_user_id: result.bot_user_id,
          team_access_token: result.access_token
        }
        
        await teamsDB.updateTeam(team.id, teamUpdates);
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
    // NOTE: Instead of creating StripeId earlier, we're going to create the Stripe customer just before starting the portal
    // TODO: If no customer id, then create a new one
    const customer = await createCustomer(teamId);
    const stripeId = customer.id;
    console.log('stripeId ', stripeId);

    const portalSession = await createPortalSession(stripeId, redirect_url);
    return res.redirect(portalSession.url);
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