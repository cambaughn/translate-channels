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
    console.log('errory =>>>>>>>>>>', error);
  });
}

export { updateMessage }