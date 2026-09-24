// js/chat.js
import { db } from "./firebase-config.js";
import { ref, push, onValue, set, remove, onDisconnect, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";

export function idDaConversa(uidA, uidB) {
  return [uidA, uidB].sort().join("_");
}

export async function garantirConversa(conversationId, uidA, uidB) {
  await set(ref(db, `conversations/${conversationId}/participants`), {
    [uidA]: true,
    [uidB]: true,
  });
}

export async function enviarMensagem(conversationId, senderId, receiverId, texto) {
  const textoLimpo = (texto || "").trim();
  if (!textoLimpo) return;

  await push(ref(db, `conversations/${conversationId}/messages`), {
    senderId,
    receiverId,
    text: textoLimpo,
    createdAt: serverTimestamp(),
  });
}

export function observarMensagens(conversationId, callback) {
  return onValue(ref(db, `conversations/${conversationId}/messages`), (snapshot) => {
    const dados = snapshot.val() || {};
    const lista = Object.values(dados).sort(
      (a, b) => (a.createdAt || 0) - (b.createdAt || 0)
    );
    callback(lista);
  });
}

export async function definirDigitando(conversationId, uid, digitando) {
  const digitandoRef = ref(db, `conversations/${conversationId}/typing/${uid}`);

  if (digitando) {
    await set(digitandoRef, true);
    await onDisconnect(digitandoRef).remove();
  } else {
    await remove(digitandoRef);
  }
}

export function observarDigitando(conversationId, meuUid, callback) {
  return onValue(ref(db, `conversations/${conversationId}/typing`), (snapshot) => {
    const dados = snapshot.val() || {};
    callback(Object.keys(dados).some(uid => uid !== meuUid && dados[uid] === true));
  });
}
