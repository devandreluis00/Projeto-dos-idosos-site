// js/firebase-config.js
//
// PREENCHA os valores abaixo com os dados do SEU projeto Firebase existente.
// Onde encontrar: Firebase Console > (seu projeto) > ícone de engrenagem
// > "Configurações do projeto" > aba "Geral" > seção "Seus aplicativos"
// > selecione o app Web já cadastrado > "Configuração do SDK" > "Config".
//
// NÃO invente valores. Copie exatamente o que aparecer lá.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCba295yeT957dMfAXxgXl2s0Tg1p3LpK8",
  authDomain: "meu-chat-aula.firebaseapp.com",
  databaseURL: "https://meu-chat-aula-default-rtdb.firebaseio.com",
  projectId: "meu-chat-aula",
  storageBucket: "meu-chat-aula.firebasestorage.app",
  messagingSenderId: "765839663371",
  appId: "1:765839663371:web:6ddc787cbd28336c20420e"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
