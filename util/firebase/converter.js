// Utility functions
const convertFromFirebase = (snapshot) => {
  if (snapshot.docs && snapshot.docs.length > 0) { // if the snapshot is an array of docs
    return snapshot.docs.map(doc => convertDoc(doc));
  } else { // is single document
    return convertDoc(snapshot);
  }
}

const convertDoc = (doc) => {
  return { id: doc.id, ...doc.data() }
}

export default convertFromFirebase;
