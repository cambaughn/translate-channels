import helpMessage from "../../views/helpMessage.js";
import upgradeMessage from "../../views/upgradeMessage.js";
import authorizationMessage from "../../views/authorizationMessage.js";

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

const postAuthMessage = (channel, token, client, user) => {
  // finds message and edits it with the translated text (response) as blocks
  const messageRequest = {
    token: token,
    channel: channel,
    user: user,
    blocks: authorizationMessage
  };

  client.chat.postEphemeral(messageRequest, (error) => {
    console.error(error);
  });
}


const getInfoForChannels = async (channelIds, client, token) => {
  return Promise.all(channelIds.map(channel => getChannelInfo(channel, client, token)));
};

const getChannelInfo = async (channel, client, token) => {
  try {
    // const conversationsList = await client.conversations.list({ types: 'public_channel,private_channel'});
    // console.log('got conversations list', conversationsList);

    const result = await client.conversations.info({
      token: token,
      channel: channel
    });

    // console.log('got channel info', result);

    return result.channel;
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
  postAuthMessage,
  sendUpgradeMessage
}