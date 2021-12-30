import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore"; 
import db from '../firebase/firebaseInit.js';
import convertFromFirebase from '../firebase/converter.js';

const teamsDB = {};

// Get single team document from Firebase
teamsDB.getTeam = async (id) => {
  const teamRef = teamsDoc(id);
  let team = await getDoc(teamRef);
  team = convertFromFirebase(team);

  return Promise.resolve(team);
}

// Create (or update existing) team in Firebase
teamsDB.updateTeam = async (id, updates) => {
  const teamRef = teamsDoc(id);
  return setDoc(teamRef, updates, { merge: true });
}

teamsDB.createNew = async (id) => {
  let defaultTeam = {
    slack_team_id: id,
    workspace_languages: [],
    channel_language_settings: [],
    admin_settings: {}
  }

  return teamsDB.updateTeam(id, defaultTeam);
}

// Delete team from Firebase - USE CAREFULLY - really shouldn't be used outside of testing
teamsDB.deleteTeam = async (id) => {
  const teamRef = teamsDoc(id);
  return deleteDoc(teamRef);
}


// Update team's language settings
teamsDB.updateSettings = async (channels, languages, context) => {
  const action = languages.includes('none') ? 'delete' : 'update';

  console.log('action ', action);
  // TODO: Go through each of these options and figure out exactly what they're doing - then implement updaters in Firebase
  // if (channels.length > 0) {
  //   // Channel settings
  //   if (action === 'delete') { for (const channel of channels) { await this.deleteChannelSettings(channel, context); } }
  //   if (action === 'update/create') { for (const channel of channels) { await this.changeChannelSettings(channel, languages, context); } }
  // } else {
  //   // workspace settings
  //   if (action === 'delete') { await this.disableWorkspaceTranslation(context); }
  //   if (action === 'update/create') {await this.changeWorkspaceSettings(languages, context); }
  // }
}


// Helpers
const teamsDoc = (id) => {
  return doc(db, 'teams', id);
}

export default teamsDB;