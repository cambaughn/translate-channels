import { App, ExpressReceiver } from "@slack/bolt";
import dotenv from 'dotenv';
dotenv.config();
import { updateMessage } from './util/slackHelpers.js';
import userDB from './util/firebaseAPI/users.js';
import expressRoutes from './routes/expressRoutes.js';
import slackRoutes from './routes/slackRoutes.js';


const expressReceiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET
});


const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  receiver: expressReceiver
});

const expressApp = expressReceiver.app;

expressRoutes(expressApp, slackApp);
slackRoutes(slackApp);

(async () => {
  await slackApp.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();
