import { auth } from "./firebase-config.js";
import { observarLogin, sairDoChat, nomeSalvo } from "./auth.js";
import { configurarPresenca, observarParticipantes } from "./users.js";
import {
  idDaConversa,
  garantirConversa,
  enviarMensagem,
  observarMensagens,
  observarResumoConversa,
  marcarConversaComoLida,
  definirDigitando,
  pararDigitando,
  observarDigitacao
} from "./chat.js";

const listaEl = document.getElementById("lista-participantes");
const tituloEl = document.getElementById("titulo-conversa");
const mensagensEl = document.getElementById("mensagens");
const formEl = document.getElementById("form-envio");
const campoEl = document.getElementById("campo-mensagem");
const sairEl = document.getElementById("botao-sair");
const avisoEl = document.getElementById("aviso-selecione");
const areaEl = document.getElementById("area-chat");
const pesquisaEl = document.getElementById("pesquisa-participantes");
const statusContatoEl = document.getElementById("status-contato");
const statusConversaEl = document.getElementById("status-conversa");
const avatarContatoEl = document.getElementById("avatar-contato");
const indicadorEl = document.getElementById("indicador-digitando");
const textoDigitandoEl = document.getElementById("texto-digitando");
const avatarMeEl = document.getElementById("avatar-me");
const nomeMeEl = document.getElementById("nome-me");

let meuUid = null;
let meuNome = "";
let pessoaSelecionada = null;
let conversaAtualId = null;
let stopMessages = null;
let stopTyping = null;
let typingTimer = null;
let participantes = [];
const resumos = new Map();
const stopResumo = new Map();

observarLogin((usuario) => {
  if (!usuario) {
    window.location.href = "index.html";
    return;
  }

  meuUid = usuario.uid;
  meuNome = nomeSalvo() || "Você";
  avatarMeEl.textContent = iniciais(meuNome);
  nomeMeEl.textContent = meuNome;

  configurarPresenca(meuUid);
  observarParticipantes(meuUid, renderizarParticipantes);
});

function renderizarParticipantes(lista) {
  participantes = lista || [];
  sincronizarResumos();
  renderizarLista();
}

function sincronizarResumos() {
  const ids = new Set(participantes.map((p) => p.uid));

  for (const [uid, stop] of stopResumo) {
    if (!ids.has(uid)) {
      stop();
      stopResumo.delete(uid);
      resumos.delete(uid);
    }
  }

  participantes.forEach((pessoa) => {
    if (stopResumo.has(pessoa.uid)) return;

    const conversationId = idDaConversa(meuUid, pessoa.uid);
    const stop = observarResumoConversa(conversationId, meuUid, (resumo) => {
      resumos.set(pessoa.uid, resumo);
      renderizarLista();
    });
    stopResumo.set(pessoa.uid, stop);
  });
}

function renderizarLista() {
  const filtro = pesquisaEl.value.trim().toLowerCase();

  const lista = [...participantes]
    .filter((p) => !filtro || p.name.toLowerCase().includes(filtro))
    .sort((a, b) => {
      const ta = Number(resumos.get(a.uid)?.lastMessage?.createdAt || 0);
      const tb = Number(resumos.get(b.uid)?.lastMessage?.createdAt || 0);
      return tb - ta || a.name.localeCompare(b.name, "pt-BR");
    });

  listaEl.innerHTML = "";

  if (!lista.length) {
    const vazio = document.createElement("div");
    vazio.className = "empty-list";
    vazio.textContent = filtro
      ? "Nenhuma conversa encontrada."
      : "Ainda não há outras pessoas online ou cadastradas.";
    listaEl.appendChild(vazio);
    return;
  }

  lista.forEach((pessoa) => {
    const resumo = resumos.get(pessoa.uid);
    const ultima = resumo?.lastMessage;
    const unread = Number(resumo?.unreadCount || 0);

    const item = document.createElement("button");
    item.type = "button";
    item.className = "conversation-item";
    if (pessoaSelecionada?.uid === pessoa.uid) item.classList.add("selected");

    const avatar = document.createElement("span");
    avatar.className = "avatar";
    avatar.textContent = iniciais(pessoa.name);

    const corpo = document.createElement("span");
    corpo.className = "conversation-content";

    const topo = document.createElement("span");
    topo.className = "conversation-top";

    const nome = document.createElement("strong");
    nome.textContent = pessoa.name;

    const hora = document.createElement("time");
    hora.textContent = ultima ? formatarHora(ultima.createdAt) : "";
    if (unread) hora.className = "has-unread";

    topo.append(nome, hora);

    const baixo = document.createElement("span");
    baixo.className = "conversation-preview-row";

    const preview = document.createElement("span");
    preview.className = "conversation-preview";
    if (unread) preview.classList.add("unread");

    if (ultima) {
      if (ultima.senderId === meuUid) {
        const checks = document.createElement("span");
        checks.className = "preview-checks";
        checks.textContent = "✓✓";
        preview.appendChild(checks);
      }
      const texto = document.createElement("span");
      texto.textContent = ultima.senderId === meuUid
        ? `Você: ${ultima.text}`
        : ultima.text;
      preview.appendChild(texto);
    } else {
      const dot = document.createElement("span");
      dot.className = `status-dot ${pessoa.online ? "online" : "offline"}`;
      const status = document.createElement("span");
      status.textContent = pessoa.online ? "online" : "offline";
      preview.append(dot, status);
    }

    baixo.appendChild(preview);

    if (unread) {
      const badge = document.createElement("span");
      badge.className = "unread-badge";
      badge.textContent = unread > 99 ? "99+" : String(unread);
      baixo.appendChild(badge);
    }

    corpo.append(topo, baixo);
    item.append(avatar, corpo);
    item.addEventListener("click", () => selecionarConversa(pessoa));
    listaEl.appendChild(item);
  });
}

async function selecionarConversa(pessoa) {
  if (conversaAtualId && meuUid) await pararDigitando(conversaAtualId, meuUid);
  clearTimeout(typingTimer);

  pessoaSelecionada = pessoa;
  conversaAtualId = idDaConversa(meuUid, pessoa.uid);

  tituloEl.textContent = pessoa.name;
  avatarContatoEl.textContent = iniciais(pessoa.name);
  atualizarStatus(pessoa);

  avisoEl.style.display = "none";
  areaEl.style.display = "flex";

  await garantirConversa(conversaAtualId, meuUid, pessoa.uid);
  await marcarConversaComoLida(conversaAtualId, meuUid);

  if (stopMessages) stopMessages();
  if (stopTyping) stopTyping();

  stopMessages = observarMensagens(conversaAtualId, renderizarMensagens);
  stopTyping = observarDigitacao(
    conversaAtualId,
    meuUid,
    (nome) => {
      if (!nome) {
        indicadorEl.hidden = true;
        return;
      }
      textoDigitandoEl.textContent = `${nome} está digitando...`;
      indicadorEl.hidden = false;
    }
  );

  renderizarLista();
  campoEl.focus();
}

function renderizarMensagens(lista) {
  mensagensEl.innerHTML = "";

  lista.forEach((msg) => {
    const minha = msg.senderId === meuUid;
    const bolha = document.createElement("div");
    bolha.className = `message ${minha ? "mine" : "other"}`;

    const texto = document.createElement("div");
    texto.className = "message-text";
    texto.textContent = msg.text;

    const meta = document.createElement("span");
    meta.className = "message-meta";
    meta.textContent = formatarHora(msg.createdAt);

    if (minha) {
      const checks = document.createElement("span");
      checks.className = "message-checks";
      checks.textContent = "✓✓";
      meta.appendChild(checks);
    }

    bolha.append(texto, meta);
    mensagensEl.appendChild(bolha);
  });

  requestAnimationFrame(() => {
    mensagensEl.scrollTop = mensagensEl.scrollHeight;
  });

  if (conversaAtualId && meuUid) {
    marcarConversaComoLida(conversaAtualId, meuUid).catch(() => {});
  }
}

formEl.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (!pessoaSelecionada || !conversaAtualId) return;

  const texto = campoEl.value.trim();
  if (!texto) return;

  campoEl.value = "";
  clearTimeout(typingTimer);
  await pararDigitando(conversaAtualId, meuUid);
  await enviarMensagem(conversaAtualId, meuUid, pessoaSelecionada.uid, texto);
  campoEl.focus();
});

campoEl.addEventListener("input", async () => {
  if (!pessoaSelecionada || !conversaAtualId) return;

  clearTimeout(typingTimer);

  if (!campoEl.value.trim()) {
    await pararDigitando(conversaAtualId, meuUid);
    return;
  }

  await definirDigitando(conversaAtualId, meuUid, meuNome);

  typingTimer = setTimeout(() => {
    pararDigitando(conversaAtualId, meuUid).catch(() => {});
  }, 1500);
});

sairEl.addEventListener("click", async () => {
  await sairDoChat();
  window.location.href = "index.html";
});

pesquisaEl.addEventListener("input", renderizarLista);

function atualizarStatus(pessoa) {
  const online = Boolean(pessoa?.online);
  statusContatoEl.textContent = online ? "online" : "offline";
  statusContatoEl.className = `contact-status ${online ? "online" : "offline"}`;
  statusConversaEl.textContent = `${pessoa?.name || "Pessoa"} está ${online ? "online" : "offline"}`;
  statusConversaEl.className = `conversation-status-banner ${online ? "online" : "offline"}`;
  statusConversaEl.hidden = false;
}

function iniciais(nome) {
  const partes = (nome || "?").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function formatarHora(timestamp) {
  if (!timestamp) return "";
  const data = new Date(timestamp);
  if (Number.isNaN(data.getTime())) return "";
  return data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}
