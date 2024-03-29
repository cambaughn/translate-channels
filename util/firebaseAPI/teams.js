import { doc, setDoc, getDoc, deleteDoc, query, collection, where, getDocs, updateDoc, deleteField } from "firebase/firestore"; 
import db from '../firebase/firebaseInit.js';
import convertFromFirebase from '../firebase/converter.js';
import userDB from './users.js';

const teamsDB = {};

// Get single team document from Firebase
teamsDB.getTeam = async (id) => {
  const teamRef = teamsDoc(id);
  let team = await getDoc(teamRef);
  team = convertFromFirebase(team);

  return Promise.resolve(team);
}

teamsDB.getTeamsWhere = async (key, comparator, value) => {
  const teamsCollection = collection(db, 'teams');
  let q = query(teamsCollection, where(key, comparator, value));
  let teams = await getDocs(q);
  teams = convertFromFirebase(teams);
  return Promise.resolve(teams);
}

// Create (or update existing) team in Firebase
teamsDB.updateTeam = async (id, updates) => {
  console.log('updating team ', id, updates);
  const teamRef = teamsDoc(id);
  return setDoc(teamRef, updates, { merge: true });
}

teamsDB.createNew = async (id, settings) => {
  let defaultTeam = {
    bot_user_id: null,
    team_access_token: null,
    channel_language_settings: {},
    slack_team_id: id,
    workspace_languages: [],
    viewed_app_home: false
  }

  let team = {
    ...defaultTeam,
    ...settings
  }

  return teamsDB.updateTeam(id, team);
}

// Deactivate team by removing Slack app keys - when uninstalling
teamsDB.deactivateTeam = async (id) => {
  let updates = {
    // Remove Slack details
    bot_user_id: null,
    team_access_token: null,
    // Remove Stripe details - subscription only - will leave customer_id so they can sign up again if they ever want to, and it will keep their payment info and history
    stripe_subscription_id: null,
    test_stripe_subscription_id: null
  }

  return teamsDB.updateTeam(id, updates);
}

// Delete team from Firebase - USE CAREFULLY - really shouldn't be used outside of testing
teamsDB.deleteTeam = async (id) => {
  const teamRef = teamsDoc(id);
  return deleteDoc(teamRef);
}


// Update team's language settings
teamsDB.updateLanguageSettings = async (channels, languages, teamId) => {
  const do_not_translate = languages.includes('do_not_translate');
  if (do_not_translate) {
    // set languages array to be empty
    languages = [];
  }

  // Then, depending on whether it's a bunch of channels or the workspace, we update the correct language array
  if (channels.length > 0) { // Channel
    // Get team so we can update only the necessary objects in the channel_language_settings array
    const team = await teamsDB.getTeam(teamId);
    let updatedChannels = {};

    channels.forEach(channel => {
      updatedChannels[channel.id] = {
        id: channel.id,
        name: channel.name,
        languages
      }
    })

    const updatedSettings = mergeSettings(team.channel_language_settings, updatedChannels);
    console.log('updates ', updatedSettings);

    return teamsDB.updateTeam(teamId, { channel_language_settings: updatedSettings });
  } else { // Workspace as a whole
    return teamsDB.updateTeam(teamId, { workspace_languages: languages });
  }
}

// Remove channel and settings from team
teamsDB.removeChannelSettings = async (channelId, teamId) => {
  let updates = {};

  if (channelId === 'any_channel') { // if the settings apply to the entire workspace, clear the team's workspace_languages
    updates.workspace_languages = [];
  } else { // otherwise, we're dealing with a single channel and need to clear that from channel_language_settings
    // Need to use dot notation with deleteField() function in order to delete nested element inside object: https://firebase.google.com/docs/firestore/manage-data/delete-data
    updates[`channel_language_settings.${channelId}`] = deleteField();
  }
  // Update team in database
  const teamRef = teamsDoc(teamId);
  return updateDoc(teamRef, updates);
}


// Helpers
const teamsDoc = (id) => {
  return doc(db, 'teams', id);
}


const mergeSettings = (existing, updates) => {
  let updatedSettings = { ...existing };
  for (let key in updates) {
    updatedSettings[key] = updates[key];
  }

  return updatedSettings;
}

// Logging and analytics
// This function should only be used locally
const getTeamsWithHomeviewBug = async () => {
  let teams = await teamsDB.getTeamsWhere('viewed_app_home', '==', false);
  console.log('teams not able to access home: ', teams.length);
}


// DANGER: do not use this without being sure you want to revoke permissions to all users of a certain team
const resetTeamMembers = async (team_id) => {
  let team = await teamsDB.getTeam(team_id);
  let users = await userDB.getUsersWhere('team_id', '==', team_id);
  console.log('got users => ', users);
  let userUpdateRefs = users.map(user => userDB.updateUser(user.id, { access_token: null }));
  await Promise.all(userUpdateRefs);
  console.log('updated users!');
}


export { mergeSettings };
export default teamsDB;