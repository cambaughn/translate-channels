import helpMessage from "../../views/helpMessage.js";
import upgradeMessage from "../../views/upgradeMessage.js";
import authMessage from "../../views/authMessage.js";
import userDB from "../firebaseAPI/users.js";

const updateMessage = async (message, response, token, client) => {
  try {
    // finds message and edits it with the translated text (response) as blocks
    const messageRequest = {
      token: token,
      channel: message.channel,
      ts: message.ts,
      text: response
    };

    await client.chat.update(messageRequest, error => {
      console.error(error);
    });
  } catch (error) {
    console.error('updateMessage function error: ', error);
    if (error.data && error.data.error === 'token_revoked') {
      userDB.updateUser(message.user, { access_token: null });
    }
  }
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

const sendAuthDM = async (botToken, client, userId) => {
  try {
    // Open a conversation with the user
    const conversationResponse = await client.conversations.open({
      token: botToken,
      users: userId
    });

    // Check if the conversation was successfully opened
    if (conversationResponse.ok) {
      // Send a message in the DM
      const messageResponse = await client.chat.postMessage({
        token: botToken,
        channel: conversationResponse.channel.id, // DM channel ID
        text: "Please authenticate to use the Translate Channels feature.",
        blocks: authMessage // If you have specific blocks to send
      });

      console.log('DM sent successfully:', messageResponse.ts);
    } else {
      console.error('Error opening conversation:', conversationResponse.error);
    }
  } catch (error) {
    console.error('Error in sending DM:', error);
  }
};


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
  sendAuthDM,
  sendUpgradeMessage
}