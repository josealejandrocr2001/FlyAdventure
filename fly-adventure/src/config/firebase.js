// src/config/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// TODO: Reemplaza esto con tus propias credenciales de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDZ51L9364dLpIH1DJw1i4EngrTS4n0Euo",
  authDomain: "fly-adventure-9e6bd.firebaseapp.com",
  projectId: "fly-adventure-9e6bd",
  storageBucket: "fly-adventure-9e6bd.firebasestorage.app",
  messagingSenderId: "1062857885400",
  appId: "1:1062857885400:web:a267eb04e65cd909adb9ad"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar los servicios que usaremos
export const db = getFirestore(app);
export const auth = getAuth(app);


/*
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDZ51L9364dLpIH1DJw1i4EngrTS4n0Euo",
  authDomain: "fly-adventure-9e6bd.firebaseapp.com",
  projectId: "fly-adventure-9e6bd",
  storageBucket: "fly-adventure-9e6bd.firebasestorage.app",
  messagingSenderId: "1062857885400",
  appId: "1:1062857885400:web:a267eb04e65cd909adb9ad",
  measurementId: "G-2K5DQ0PQVP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);*/