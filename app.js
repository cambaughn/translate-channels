import { App, ExpressReceiver } from "@slack/bolt";
import dotenv from 'dotenv';
dotenv.config();
import expressRoutes from './routes/expressRoutes.js';
import slackRoutes from './routes/slackRoutes.js';
import teamsDB from "./util/firebaseAPI/teams.js";

console.log('---running app---');

const expressReceiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

const authorizeFn = async ({ teamId }) => {
  // console.log('authorizing for team: ', teamId);
  let team = await teamsDB.getTeam(teamId);

  if (team.team_access_token && team.bot_user_id && team.id) {
    // console.log('team has access tokens: ', teamId, team);
    return {
      botToken: team.team_access_token,
      botId: team.bot_user_id,
      // userToken: user.access_token,
      teamId: team.slack_team_id
    };
  }

  throw new Error('No matching authorizations');
};

const slackApp = new App({
  authorize: authorizeFn,
  // token: process.env.SLACK_BOT_TOKEN,
  // signingSecret: process.env.SLACK_SIGNING_SECRET,
  receiver: expressReceiver
});

const expressApp = expressReceiver.app;

expressRoutes(expressApp, slackApp);
slackRoutes(slackApp);

(async () => {
  await slackApp.start(process.env.PORT || 3000);
  if (process.env.ENVIRONMENT === 'development') {
    console.log('⚡️ Bolt app is running!');
  }
})();
