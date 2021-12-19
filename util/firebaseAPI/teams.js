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

// Delete team from Firebase - USE CAREFULLY - really shouldn't be used outside of testing
teamsDB.deleteTeam = async (id) => {
  const teamRef = teamsDoc(id);
  return deleteDoc(teamRef);
}


// Helpers
const teamsDoc = (id) => {
  return doc(db, 'teams', id);
}

export default teamsDB;