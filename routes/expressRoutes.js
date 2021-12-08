// const stripeConnector = require('../stripe_engine/stripe_connector');
import bodyParser from 'body-parser';

const expressRoutes = (app, slackApp, dbConnector) => {
  app.get('/direct_install', ({ query }, res) => {
    res.redirect(process.env.DIRECT_INSTALL_SLACK_URI);
  });

  // Handle authentication button press
  // Slack url redirects to here with a code that we then send in to oauth for an auth token
  // https://api.slack.com/authentication/oauth-v2#obtaining
  app.get('/auth_redirect', ({ query }, res) => {
    const code = query.code;
    console.log('got code for auth ', code);
    // need to add <state> to make secure
    // return slackApp.client.oauth.v2.access({
    //   client_id: process.env.CLIENT_ID,
    //   client_secret: process.env.SLACK_SIGNING_SECRET,
    //   code: code,
    //   redirect_uri: process.env.REDIRECT_URI
    // }).then(async (result) => {
    //   const enrich = await dbConnector.createNewWorkspace(result);
    //   if (enrich) { await dbConnector.createStripeCustomer(result.team.id); }
    //   res.redirect(`https://slack.com/app_redirect?app=${process.env.APP_ID}&team=${result.team.id}`);
    // }).catch((error) => {
    //   throw error;
    // });
  });

  app.get('/usages', async (req, res) => {
    const token = req.header('Token');
    if (token !== process.env.UKHIRED_TOKEN) { res.sendStatus(401); return; }
    const result = await dbConnector.getUsageData();
    res.json(result);
  });

  // app.get('/portal', async ({ query }, res) => {
  //   const teamId = query.teamId;
  //   const stripeId = await dbConnector.getStripeId(teamId);
  //   const portalSession = await stripeConnector.createPortalSession(stripeId, teamId);
  //   return res.redirect(portalSession.url);
  // });

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