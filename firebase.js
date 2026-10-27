import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "fir-management-system-b5396.firebaseapp.com",
    projectId: "fir-management-system-b5396",
    storageBucket: "fir-management-system-b5396.firebasestorage.app",
    messagingSenderId: "661511494018",
    appId: "1:661511494018:web:7832f12d13aaccc900979b"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export { collection, addDoc, getDocs };