import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBJEqxoRc4KNL6wrZBJVyBVcVZi3YfAj1I",
  authDomain: "medstock-ai-6c7a5.firebaseapp.com",
  projectId: "medstock-ai-6c7a5",
  storageBucket: "medstock-ai-6c7a5.firebasestorage.app",
  messagingSenderId: "43945950223",
  appId: "1:43945950223:web:3955bf3f5799fe2ccab77a"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const userDoc = await getDoc(doc(db, "users", email));
  if (!userDoc.exists()) throw new Error("User role not found.");
  return { uid: cred.user.uid, email, ...userDoc.data() };
}

export async function logoutUser() {
  await signOut(auth);
}
