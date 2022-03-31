import { doc, setDoc, getDoc, deleteDoc, collection, query, getDocs, where } from "firebase/firestore"; 
import db from '../firebase/firebaseInit.js';
import convertFromFirebase from '../firebase/converter.js';

const userDB = {};

// Get single user document from Firebase
userDB.getUser = async (id) => {
  const userRef = usersDoc(id);
  let user = await getDoc(userRef);
  user = convertFromFirebase(user);

  return Promise.resolve(user);
}

userDB.updateUser = async (id, updates) => {
  console.log('updating user ', id, updates);
  const userRef = usersDoc(id);
  return setDoc(userRef, updates, { merge: true });
}

userDB.deleteUser = async (id) => {
  const userRef = usersDoc(id);
  return deleteDoc(userRef);
}


userDB.getRegisteredUsersForTeam = async (team_id) => {
  // const userRef = usersDoc(id);
  const usersCollection = collection(db, 'users');
  let q = query(usersCollection, where('team_id', '==', team_id));
  let users = await getDocs(q);
  users = convertFromFirebase(users);
  // Filter for users who have authorized the app ("Registered")
  users = users.filter(user => !!user.access_token);
  const numUsers = users.length;
  return Promise.resolve(numUsers);
}



// Helpers
const usersDoc = (id) => {
  return doc(db, 'users', id);
}

export default userDB;