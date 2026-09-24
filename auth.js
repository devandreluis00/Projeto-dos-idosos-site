// js/auth.js
import { auth, db } from "./firebase-config.js";
import {
  signInAnonymously,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  ref,
  set,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";

const CHAVE_NOME = "chatTurma_nome";

// Faz login anônimo e cria/atualiza o perfil em users/{uid}
export async function entrarNoChat(nome) {
  const nomeLimpo = (nome || "").trim();
  if (!nomeLimpo) {
    throw new Error("Digite seu nome para entrar.");
  }

  const credencial = await signInAnonymously(auth);
  const uid = credencial.user.uid;

  await set(ref(db, `users/${uid}`), {
    name: nomeLimpo,
    online: true,
    lastSeen: serverTimestamp(),
  });

  sessionStorage.setItem(CHAVE_NOME, nomeLimpo);
  return uid;
}

// Marca o usuário como offline e encerra a sessão
export async function sairDoChat() {
  const usuario = auth.currentUser;
  if (usuario) {
    try {
      await set(ref(db, `users/${usuario.uid}/online`), false);
      await set(ref(db, `users/${usuario.uid}/lastSeen`), serverTimestamp());
    } catch (erro) {
      console.warn("Não foi possível marcar como offline antes de sair:", erro);
    }
  }
  sessionStorage.removeItem(CHAVE_NOME);
  await signOut(auth);
}

// Observa o estado de login. Chama callback(usuario) sempre que mudar.
export function observarLogin(callback) {
  return onAuthStateChanged(auth, callback);
}

export function nomeSalvo() {
  return sessionStorage.getItem(CHAVE_NOME) || "";
}
