import { db } from "./firebase-config.js";
import {
  ref, push, onValue, set, remove, onDisconnect, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";

export function idDaConversa(uidA, uidB) {
  return [uidA, uidB].sort().join("_");
}

export async function garantirConversa(conversationId, uidA, uidB) {
  await set(ref(db, `conversations/${conversationId}/participants`), {
    [uidA]: true,
    [uidB]: true
  });
}

export async function enviarMensagem(conversationId, senderId, receiverId, texto) {
  const textoLimpo = (texto || "").trim();
  if (!textoLimpo) return;

  await push(ref(db, `conversations/${conversationId}/messages`), {
    senderId,
    receiverId,
    text: textoLimpo,
    createdAt: serverTimestamp()
  });
}

export function observarMensagens(conversationId, callback) {
  return onValue(ref(db, `conversations/${conversationId}/messages`), (snapshot) => {
    const dados = snapshot.val() || {};
    callback(
      Object.values(dados).sort(
        (a, b) => (a.createdAt || 0) - (b.createdAt || 0)
      )
    );
  });
}

export function observarResumoConversa(conversationId, meuUid, callback) {
  const mensagensRef = ref(db, `conversations/${conversationId}/messages`);
  const leituraRef = ref(db, `conversations/${conversationId}/reads/${meuUid}`);

  let mensagens = {};
  let readAt = 0;

  const emitir = () => {
    const lista = Object.values(mensagens).sort(
      (a, b) => (a.createdAt || 0) - (b.createdAt || 0)
    );
    const ultima = lista.length ? lista[lista.length - 1] : null;
    const unreadCount = lista.filter(
      (m) => m.senderId !== meuUid && Number(m.createdAt || 0) > Number(readAt || 0)
    ).length;

    callback({ lastMessage: ultima, unreadCount });
  };

  const stopMessages = onValue(mensagensRef, (s) => {
    mensagens = s.val() || {};
    emitir();
  });

  const stopReads = onValue(leituraRef, (s) => {
    readAt = Number(s.val() || 0);
    emitir();
  });

  return () => {
    stopMessages();
    stopReads();
  };
}

export async function marcarConversaComoLida(conversationId, uid) {
  await set(ref(db, `conversations/${conversationId}/reads/${uid}`), Date.now());
}

export async function definirDigitando(conversationId, uid, nome) {
  const typingRef = ref(db, `conversations/${conversationId}/typing/${uid}`);
  await onDisconnect(typingRef).remove();
  await set(typingRef, {
    typing: true,
    name: nome || "Usuário",
    updatedAt: serverTimestamp()
  });
}

export async function pararDigitando(conversationId, uid) {
  await remove(ref(db, `conversations/${conversationId}/typing/${uid}`));
}

export function observarDigitacao(conversationId, meuUid, callback) {
  return onValue(ref(db, `conversations/${conversationId}/typing`), (snapshot) => {
    const dados = snapshot.val() || {};
    const outro = Object.entries(dados).find(
      ([uid, estado]) => uid !== meuUid && estado?.typing === true
    );
    callback(outro ? (outro[1].name || "A pessoa") : null);
  });
}
