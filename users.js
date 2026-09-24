// js/users.js
import { db } from "./firebase-config.js";
import {
  ref,
  onValue,
  onDisconnect,
  set,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-database.js";

// Configura o que o Firebase deve fazer automaticamente se o usuário
// fechar a aba, cair a internet, etc. (sem precisar clicar em SAIR)
export function configurarPresenca(uid) {
  const statusRef = ref(db, `users/${uid}/online`);
  const lastSeenRef = ref(db, `users/${uid}/lastSeen`);

  onDisconnect(statusRef)
    .set(false)
    .then(() => {
      onDisconnect(lastSeenRef).set(serverTimestamp());
    });
}

// Observa a lista de usuários em tempo real.
// callback recebe um array de { uid, name, online } sem o próprio usuário.
export function observarParticipantes(meuUid, callback) {
  const usersRef = ref(db, "users");
  return onValue(usersRef, (snapshot) => {
    const dados = snapshot.val() || {};
    const lista = Object.entries(dados)
      .filter(([uid]) => uid !== meuUid)
      .map(([uid, valor]) => ({
        uid,
        name: valor.name || "Sem nome",
        online: !!valor.online,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    callback(lista);
  });
}
