import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";


const firebaseConfig = {

    apiKey: "AIzaSyCGl2jTN7FbYtHdJ2LHAWUo65DXvImHBTU",

    authDomain:
        "fir-management-system-b5396.firebaseapp.com",

    projectId:
        "fir-management-system-b5396",

    storageBucket:
        "fir-management-system-b5396.firebasestorage.app",

    messagingSenderId:
        "661511494018",

    appId:
        "1:661511494018:web:7832f12d13aaccc900979b"

};


const app =
    initializeApp(firebaseConfig);

const auth =
    getAuth(app);


// REGISTER

const registerForm =
    document.getElementById("registerForm");


if (registerForm) {

    registerForm.addEventListener(
        "submit",
        async (e) => {

            e.preventDefault();

            const email =
                document.getElementById(
                    "registerEmail"
                ).value;

            const password =
                document.getElementById(
                    "registerPassword"
                ).value;


            const message =
                document.getElementById(
                    "registerMessage"
                );


            try {

                await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


                message.textContent =
                    "Registration successful!";

            } catch (error) {

                message.textContent =
                    error.message;

            }

        }
    );

}


// LOGIN

const loginForm =
    document.getElementById("loginForm");


if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async (e) => {

            e.preventDefault();


            const email =
                document.getElementById(
                    "email"
                ).value;

            const password =
                document.getElementById(
                    "password"
                ).value;


            const message =
                document.getElementById(
                    "loginMessage"
                );


            try {

                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


                window.location.href =
                    "index.html";


            } catch (error) {

                message.textContent =
                    error.message;

            }

        }
    );

}