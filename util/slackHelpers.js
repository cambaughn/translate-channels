const updateMessage = (message, response, token, client) => {
  // finds message and edits it with the translated text (response) as blocks
  console.log('testing app');
  const messageRequest = {
    token: token,
    channel: message.channel,
    ts: message.ts,
    text: response
  };

  client.chat.update(messageRequest, error => {
    console.log(error);
  });
}

export { updateMessage }