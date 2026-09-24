// js/chat.js
import { db } from "./firebase-config.js";
import {
  ref,
  push,
  onValue,
  set,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";

// Gera sempre o mesmo ID para a conversa entre dois UIDs,
// não importa quem inicia a conversa.
export function idDaConversa(uidA, uidB) {
  return [uidA, uidB].sort().join("_");
}

// Garante que o registro de participantes da conversa existe.
export async function garantirConversa(conversationId, uidA, uidB) {
  await set(ref(db, `conversations/${conversationId}/participants`), {
    [uidA]: true,
    [uidB]: true,
  });
}

// Envia uma mensagem de texto.
export async function enviarMensagem(conversationId, senderId, receiverId, texto) {
  const textoLimpo = (texto || "").trim();
  if (!textoLimpo) return;

  const mensagensRef = ref(db, `conversations/${conversationId}/messages`);
  await push(mensagensRef, {
    senderId,
    receiverId,
    text: textoLimpo,
    createdAt: serverTimestamp(),
  });
}

// Observa as mensagens de uma conversa em tempo real.
// callback recebe um array de mensagens ordenadas por data de criação.
export function observarMensagens(conversationId, callback) {
  const mensagensRef = ref(db, `conversations/${conversationId}/messages`);
  return onValue(mensagensRef, (snapshot) => {
    const dados = snapshot.val() || {};
    const lista = Object.values(dados).sort(
      (a, b) => (a.createdAt || 0) - (b.createdAt || 0)
    );
    callback(lista);
  });
}
