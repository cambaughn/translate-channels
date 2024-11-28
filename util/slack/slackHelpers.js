import helpMessage from "../../views/helpMessage.js";
import upgradeMessage from "../../views/upgradeMessage.js";
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


const getInfoForChannels = async (channelIds, client, token) => {
  return Promise.all(channelIds.map(channel => getChannelInfo(channel, client, token)));
};

const getChannelInfo = async (channelId, client, token) => {
  try {
    const result = await client.conversations.info({
      token: token,
      channel: channelId
    });
    
    // For private channels, we need to check if we're a member
    if (result.channel.is_private) {
      try {
        // Try to get channel members to verify access
        await client.conversations.members({
          token: token,
          channel: channelId
        });
        // If we can get members, we have access
        return {
          is_private: true,
          is_member: true
        };
      } catch (memberError) {
        // If we can't get members, we don't have access
        return {
          is_private: true,
          is_member: false
        };
      }
    }
    
    // For public channels, return the original info
    return {
      is_private: result.channel.is_private,
      is_member: result.channel.is_member
    };
  } catch (error) {
    // If channel not found or can't be accessed, return default values
    console.log(`Unable to get info for channel ${channelId}:`, error.data?.error || error.message);
    return {
      is_private: true,  // Assume private if we can't access it
      is_member: false   // Obviously not a member if we can't access it
    };
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