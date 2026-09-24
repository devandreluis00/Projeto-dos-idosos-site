// js/app.js
import { observarLogin, sairDoChat, nomeSalvo } from "./auth.js";
import { configurarPresenca, observarParticipantes } from "./users.js";
import {
  idDaConversa,
  garantirConversa,
  enviarMensagem,
  observarMensagens,
  definirDigitando,
  pararDigitando,
  observarDigitacao,
} from "./chat.js";

const listaParticipantesEl = document.getElementById("lista-participantes");
const tituloConversaEl = document.getElementById("titulo-conversa");
const mensagensEl = document.getElementById("mensagens");
const formEnvioEl = document.getElementById("form-envio");
const campoMensagemEl = document.getElementById("campo-mensagem");
const avisoSelecioneEl = document.getElementById("aviso-selecione");
const areaChatEl = document.getElementById("area-chat");
const indicadorDigitandoEl = document.getElementById("indicador-digitando");
const textoDigitandoEl = document.getElementById("texto-digitando");
const avatarContatoEl = document.getElementById("avatar-contato");
const statusContatoEl = document.getElementById("status-contato");
const statusConversaEl = document.getElementById("status-conversa");
const pesquisaEl = document.getElementById("pesquisa-participantes");

let meuUid = null;
let meuNome = "";
let pessoaSelecionada = null;
let pararDeObservarMensagens = null;
let pararDeObservarDigitacao = null;
let conversaAtualId = null;
let temporizadorDigitacao = null;
let ultimaQuantidadeMensagens = 0;

observarLogin((usuario) => {
  if (!usuario) {
    window.location.href = "index.html";
    return;
  }

  meuUid = usuario.uid;
  meuNome = nomeSalvo() || "Você";

  const avatarMe = document.getElementById("avatar-me");
  avatarMe.textContent = iniciais(meuNome);

  configurarPresenca(meuUid);
  observarParticipantes(meuUid, renderizarParticipantes);
});

function renderizarParticipantes(lista) {
  const filtro = pesquisaEl.value.trim().toLowerCase();
  listaParticipantesEl.innerHTML = "";

  if (pessoaSelecionada) {
    const atualizada = lista.find((p) => p.uid === pessoaSelecionada.uid);
    if (atualizada) {
      pessoaSelecionada = atualizada;
      atualizarStatusConversa(atualizada);
    }
  }

  const filtrada = lista.filter((pessoa) =>
    !filtro || pessoa.name.toLowerCase().includes(filtro)
  );

  if (filtrada.length === 0) {
    const vazio = document.createElement("div");
    vazio.className = "empty-list";
    vazio.textContent = filtro
      ? "Nenhuma conversa encontrada."
      : "Ainda não há mais ninguém na turma.";
    listaParticipantesEl.appendChild(vazio);
    return;
  }

  filtrada.forEach((pessoa) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "conversation-item";

    if (pessoaSelecionada && pessoaSelecionada.uid === pessoa.uid) {
      item.classList.add("selected");
    }

    item.dataset.nome = pessoa.name.toLowerCase();

    const avatar = document.createElement("span");
    avatar.className = "avatar conversation-avatar";
    avatar.textContent = iniciais(pessoa.name);

    const content = document.createElement("span");
    content.className = "conversation-content";

    const top = document.createElement("span");
    top.className = "conversation-top";

    const nome = document.createElement("strong");
    nome.textContent = pessoa.name;

    const horario = document.createElement("time");
    horario.textContent = "";

    top.appendChild(nome);
    top.appendChild(horario);

    const preview = document.createElement("span");
    preview.className = "conversation-preview";

    const statusDot = document.createElement("span");
    statusDot.className = `status-dot ${pessoa.online ? "online" : "offline"}`;

    const previewText = document.createElement("span");
    previewText.textContent = pessoa.online ? "online" : "offline";

    preview.appendChild(statusDot);
    preview.appendChild(previewText);

    content.appendChild(top);
    content.appendChild(preview);

    item.appendChild(avatar);
    item.appendChild(content);

    item.addEventListener("click", (evento) =>
      selecionarConversa(pessoa, evento.currentTarget)
    );

    listaParticipantesEl.appendChild(item);
  });
}

async function selecionarConversa(pessoa, elementoClicado) {
  if (conversaAtualId && meuUid) {
    await pararDigitando(conversaAtualId, meuUid);
  }

  if (temporizadorDigitacao) {
    clearTimeout(temporizadorDigitacao);
    temporizadorDigitacao = null;
  }

  pessoaSelecionada = pessoa;
  conversaAtualId = idDaConversa(meuUid, pessoa.uid);
  ultimaQuantidadeMensagens = 0;

  tituloConversaEl.textContent = pessoa.name;
  atualizarStatusConversa(pessoa);

  avisoSelecioneEl.style.display = "none";
  areaChatEl.style.display = "flex";
  esconderIndicadorDigitando();

  document.querySelectorAll(".conversation-item").forEach((el) => {
    el.classList.remove("selected");
  });

  if (elementoClicado) elementoClicado.classList.add("selected");

  await garantirConversa(conversaAtualId, meuUid, pessoa.uid);

  if (pararDeObservarMensagens) pararDeObservarMensagens();
  if (pararDeObservarDigitacao) pararDeObservarDigitacao();

  pararDeObservarMensagens = observarMensagens(
    conversaAtualId,
    renderizarMensagens
  );

  pararDeObservarDigitacao = observarDigitacao(
    conversaAtualId,
    meuUid,
    mostrarIndicadorDigitando
  );

  campoMensagemEl.focus();
}

function renderizarMensagens(lista) {
  mensagensEl.innerHTML = "";

  lista.forEach((msg) => {
    const bolha = document.createElement("div");
    const eMinha = msg.senderId === meuUid;

    bolha.className = `message ${eMinha ? "mine" : "other"}`;

    const texto = document.createElement("div");
    texto.className = "message-text";
    texto.textContent = msg.text;

    const meta = document.createElement("span");
    meta.className = "message-meta";
    meta.textContent = formatarHora(msg.createdAt);

    if (eMinha) {
      const checks = document.createElement("span");
      checks.className = "message-checks";
      checks.textContent = "✓✓";
      meta.appendChild(checks);
    }

    bolha.appendChild(texto);
    bolha.appendChild(meta);
    mensagensEl.appendChild(bolha);
  });

  const quantidadeAumentou = lista.length > ultimaQuantidadeMensagens;
  ultimaQuantidadeMensagens = lista.length;

  requestAnimationFrame(() => {
    // Mensagens novas sempre deixam a conversa no fim.
    // Ao abrir a conversa também começamos no fim.
    if (quantidadeAumentou || lista.length > 0) {
      mensagensEl.scrollTop = mensagensEl.scrollHeight;
    }
  });
}

campoMensagemEl.addEventListener("input", async () => {
  if (!pessoaSelecionada || !conversaAtualId) return;

  if (!campoMensagemEl.value.trim()) {
    await pararDigitando(conversaAtualId, meuUid);
    return;
  }

  await definirDigitando(conversaAtualId, meuUid, meuNome);

  clearTimeout(temporizadorDigitacao);

  temporizadorDigitacao = setTimeout(async () => {
    if (conversaAtualId && meuUid) {
      await pararDigitando(conversaAtualId, meuUid);
    }
  }, 1500);
});

campoMensagemEl.addEventListener("blur", async () => {
  if (!pessoaSelecionada || !conversaAtualId) return;

  if (!campoMensagemEl.value.trim()) {
    await pararDigitando(conversaAtualId, meuUid);
  }
});

formEnvioEl.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  if (!pessoaSelecionada || !conversaAtualId) return;

  const texto = campoMensagemEl.value.trim();
  if (!texto) return;

  campoMensagemEl.value = "";

  clearTimeout(temporizadorDigitacao);
  temporizadorDigitacao = null;

  await pararDigitando(conversaAtualId, meuUid);

  await enviarMensagem(
    conversaAtualId,
    meuUid,
    pessoaSelecionada.uid,
    texto
  );

  campoMensagemEl.focus();
});

pesquisaEl.addEventListener("input", () => {
  // A lista completa será atualizada pelo listener de presença.
  // Filtramos diretamente os itens já renderizados quando possível.
  const filtro = pesquisaEl.value.trim().toLowerCase();

  document.querySelectorAll(".conversation-item").forEach((item) => {
    item.style.display = item.dataset.nome.includes(filtro) ? "" : "flex";
  });
});


function atualizarStatusConversa(pessoa) {
  const online = Boolean(pessoa && pessoa.online);
  const nome = pessoa?.name || "Pessoa";

  statusContatoEl.textContent = online ? "online" : "offline";
  statusContatoEl.className = `contact-status ${online ? "online" : "offline"}`;

  if (online) {
    statusConversaEl.textContent = `${nome} está online`;
    statusConversaEl.className = "conversation-status-banner online";
    statusConversaEl.hidden = false;
  } else {
    statusConversaEl.textContent = `${nome} está offline`;
    statusConversaEl.className = "conversation-status-banner offline";
    statusConversaEl.hidden = false;
  }
}

function mostrarIndicadorDigitando(nome) {
  if (!nome) {
    esconderIndicadorDigitando();
    return;
  }

  textoDigitandoEl.textContent = `${nome} está digitando...`;
  indicadorDigitandoEl.hidden = false;
}

function esconderIndicadorDigitando() {
  indicadorDigitandoEl.hidden = true;
}

function iniciais(nome) {
  const partes = (nome || "?").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function formatarHora(timestamp) {
  if (!timestamp) return "";
  const data = new Date(timestamp);
  if (Number.isNaN(data.getTime())) return "";

  return data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
