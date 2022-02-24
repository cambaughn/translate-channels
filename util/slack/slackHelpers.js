import helpMessage from "../../views/helpMessage.js";
import { isAdmin } from "./slackUser.js";
import buildHomeView from "../../views/home.js";
import teamsDB from "../firebaseAPI/teams.js";

const publishHomeView = async ({ event, context, client }) => {
  try {
    let isSlackAdmin = await isAdmin(event.user, context.botToken, client);
    let redirect_url = process.env.REDIRECT_URL || 'https://translate-channels.herokuapp.com/auth_redirect';
    /* view.publish is the method that your app uses to push a view to the Home tab */
    let teamId = context.teamId;
    let userId = event.user;
    let homeView = await buildHomeView(userId, teamId, redirect_url, isSlackAdmin);
    homeView.token = context.botToken;
    console.log('view config ', homeView.token, homeView.user_id);
    const result = await client.views.publish(homeView);
  } catch (error) {
    console.error(error);
  }
}

const publishHomeViewForAllUsers = async (client) => {
  try {
    let allTeams = await teamsDB.getAllTeams();
    allTeams = allTeams.slice(10,15)
    let users = [];
    // let allUsers = await Promise.all(allTeams.map(team => {
    //   try {
    //     client.users.list({ token: team.team_access_token })
    //   } catch (error) {
    //     return null;
    //   }
    // }));

    for (let i = 0; i < allTeams.length; i++) {
      let team = allTeams[i];
      let teamToken = team.team_access_token;

      if (teamToken && team.active !== false) {
        try {
          let teamUsers = await client.users.list({ token: teamToken });
          users.push(teamUsers.members);
          if (!team.active) {
            await teamsDB.updateTeam(team.id, { active: true });
          }
        } catch(error) {
          await teamsDB.updateTeam(team.id, { active: false });
          console.log('error');
        }
      }
    }

    users = users.flat();

    console.log('all users ', users.length);

    for (let i = 0; i < users.length; i++) {
      let user = users[i];
      let isSlackAdmin = user.is_admin;
      let redirect_url = process.env.REDIRECT_URL || 'https://translate-channels.herokuapp.com/auth_redirect';
    // /* view.publish is the method that your app uses to push a view to the Home tab */
      let teamId = user.team_id;
      let userId = user.id;
      let homeView = await buildHomeView(userId, teamId, redirect_url, isSlackAdmin);
      // homeView.token = context.botToken;
      console.log('view config ', homeView.token, homeView.user_id);
      // const result = await client.views.publish(homeView);

    }

  } catch (error) {
    console.error(error);
  }
}


const updateMessage = (message, response, token, client) => {
  // finds message and edits it with the translated text (response) as blocks
  const messageRequest = {
    token: token,
    channel: message.channel,
    ts: message.ts,
    text: response
  };

  return client.chat.update(messageRequest, error => {
    console.error(error);
  });
}

const postMessageAsUser = (text, channel, token, client) => {
  // finds message and edits it with the translated text (response) as blocks
  const messageRequest = {
    token: token,
    channel: channel,
    text: text,
    as_user: true
  };

  client.chat.postMessage(messageRequest, (error) => {
    console.error(error);
  });
}


const getInfoForChannels = async (channelIds, client, context) => {
  return Promise.all(channelIds.map(channel => getChannelInfo(channel, client, context)));
};

const getChannelInfo = async (channel, client, context) => {
  try {
    const result = await client.conversations.info({
      token: context.botToken,
      channel: channel
    });

    return Promise.resolve({ name: result.channel.name, id: result.channel.id });
  } catch (error) {
    console.error(error);
    return Promise.resolve({});
  }
};


const provideHelp = (botToken, channel, client) => {
  const messageRequest = {
    token: botToken,
    channel: channel,
    text: helpMessage()
  };

  client.chat.postMessage(messageRequest, (error) => {
    console.error(error);
  });
}

export { 
  updateMessage, 
  getInfoForChannels, 
  getChannelInfo, 
  provideHelp,
  postMessageAsUser,
  publishHomeView,
  publishHomeViewForAllUsers
}