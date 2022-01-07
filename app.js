import { App, ExpressReceiver } from "@slack/bolt";
import dotenv from 'dotenv';
dotenv.config();
import expressRoutes from './routes/expressRoutes.js';
import slackRoutes from './routes/slackRoutes.js';
import userDB from "./util/firebaseAPI/users.js";

const expressReceiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

const authorizeFn = async ({ userId, teamId }) => {
  console.log('props ----> ', userId);
  let user = await userDB.getUser(userId);
  // const userObject = await dbConnector.getWorkspaceData(teamId);
  if (user) {
    return {
      // botToken: userObject.workspaceToken,
      // botId: userObject.botId,
      userToken: user.access_token,
      teamId: teamId
    };
  }
  throw new Error('No matching authorizations');
};

const slackApp = new App({
  // authorize: authorizeFn,
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
