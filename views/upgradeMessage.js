const upgradeMessage = (tierDetails, numUsers) => {
  let message = ":clock4:  *It's time to upgrade*\n\n\n";
  message += `Your team is currently on the *${tierDetails.name} subscription* with unlimited translations for up to *${tierDetails.maxUsers} users*. You now have *${numUsers} registered users* and need to upgrade your plan to continue getting translations.\n\n`;
  message += ':arrow_up:  *How to upgrade* \n\n' 
  message += "Visit the `Home` tab above :point_up: \n\nAt the bottom, under the \"Plan & Usage\" section, there is a `Manage Plan` button that will take you to your customer portal where you can see pricing details and upgrade your plan.\n\n";
  return message;
}

export default upgradeMessage;
