import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore"; 
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
  const userRef = usersDoc(id);
  return setDoc(userRef, updates, { merge: true });
}

userDB.deleteUser = async (id) => {
  const userRef = usersDoc(id);
  return deleteDoc(userRef);
}

// Mongodb
userDB.migrateUsers = async (users) => {
  let userRefs = users.map(user => {
    let id = user.id;
    delete user.id;
    return userDB.updateUser(id, user);
  })

  return Promise.all(userRefs);
}



// Helpers
const usersDoc = (id) => {
  return doc(db, 'users', id);
}

export default userDB;