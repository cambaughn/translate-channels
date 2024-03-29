// Import required libraries
import { App, ExpressReceiver } from "@slack/bolt";
import dotenv from 'dotenv';
dotenv.config();

// Import routes
import expressRoutes from './routes/expressRoutes.js';
import slackRoutes from './routes/slackRoutes.js';

// Import teams database
import teamsDB from "./util/firebaseAPI/teams.js";

// Create a new Express Receiver
const expressReceiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

/**
 * This function is used to authorize the slack app for a specific team.
 * It fetches the team from the database using the provided team ID, and
 * throws an error if the team does not have valid access tokens.
 *
 * @param {Object} param0 - An object.
 * @param {string} param0.teamId - The team ID.
 *
 * @returns {Object} Returns an object containing botToken, botId, and teamId if authorization is successful.
 *
 * @throws {Error} Throws an error if the team does not have valid access tokens.
 */
const authorizeFn = async ({ teamId }) => {
  try {
    if (!teamId) {
      throw new Error('Team ID is undefined');
    }

    const team = await teamsDB.getTeam(teamId);
    if (!team || !team.team_access_token || !team.bot_user_id) {
      console.error(`Incomplete authorization data for team: ${teamId}`);
      // Return empty but valid data
      return { botToken: '', botId: '', teamId: teamId || '' };
    }

    return {
      botToken: team.team_access_token,
      botId: team.bot_user_id,
      teamId: team.id
    };

  } catch (error) {
    console.error('Authorization error for team:', teamId, error);
    // Return empty but valid data
    return { botToken: '', botId: '', teamId: teamId || '' };
  }
};



// Create a new Slack App with the custom authorize function and express receiver
const slackApp = new App({
  authorize: authorizeFn,
  receiver: expressReceiver
});

// Express App instance
const expressApp = expressReceiver.app;

// Set up routes for the express and slack apps
expressRoutes(expressApp, slackApp);
slackRoutes(slackApp);

// Start the slack app
(async () => {
  await slackApp.start(process.env.PORT || 3000);
  
  // Print a message if the app is running in development mode
  if (process.env.ENVIRONMENT === 'development') {
    console.log('⚡️ Bolt app is running!');
  }
})();
