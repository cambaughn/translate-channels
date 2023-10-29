import helpMessage from "../../views/helpMessage.js";
import upgradeMessage from "../../views/upgradeMessage.js";
import userDB from "../firebaseAPI/users.js";

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


const getInfoForChannels = async (channelIds, client, context, userId) => {
  return Promise.all(channelIds.map(channel => getChannelInfo(channel, client, context, userId)));
};

const getChannelInfo = async (channel, client, context, userId) => {
  console.log('getting channel info ', channel, userId)
  try {
    // const conversationsList = await client.conversations.list({ types: 'public_channel,private_channel'});
    // console.log('got conversations list', conversationsList);
    const user = await userDB.getUser(userId);
    console.log('got user from inside getChannelInfo', user);
    const result = await client.conversations.info({
      token: user.access_token,
      channel: channel
    });

    console.log('got channel info', result);

    return { name: result.channel.name, id: result.channel.id };
  } catch (error) {
    console.error(error);
    return {};
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

const sendUpgradeMessage = (botToken, channel, client, tierDetails, numUsers) => {
  const messageRequest = {
    token: botToken,
    channel: channel,
    text: upgradeMessage(tierDetails, numUsers)
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
  sendUpgradeMessage
}