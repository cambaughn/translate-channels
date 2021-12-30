const updateMessage = (message, response, token, client) => {
  // finds message and edits it with the translated text (response) as blocks
  const messageRequest = {
    token: token,
    channel: message.channel,
    ts: message.ts,
    text: response
  };

  console.log('testing app ', messageRequest);

  return client.chat.update(messageRequest, error => {
    console.log(error);
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
    console.log(error);
    return Promise.resolve({});
  }
};

export { updateMessage, getInfoForChannels, getChannelInfo }