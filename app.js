// js/app.js
import { auth } from "./firebase-config.js";
import { observarLogin, sairDoChat, nomeSalvo } from "./auth.js";
import { configurarPresenca, observarParticipantes } from "./users.js";
import {
  idDaConversa,
  garantirConversa,
  enviarMensagem,
  observarMensagens,
} from "./chat.js";

const listaParticipantesEl = document.getElementById("lista-participantes");
const tituloConversaEl = document.getElementById("titulo-conversa");
const mensagensEl = document.getElementById("mensagens");
const formEnvioEl = document.getElementById("form-envio");
const campoMensagemEl = document.getElementById("campo-mensagem");
const botaoSairEl = document.getElementById("botao-sair");
const avisoSelecioneEl = document.getElementById("aviso-selecione");
const areaChatEl = document.getElementById("area-chat");

let meuUid = null;
let meuNome = "";
let pessoaSelecionada = null; // { uid, name }
let pararDeObservarMensagens = null;

observarLogin((usuario) => {
  if (!usuario) {
    // Não está logado: volta para a tela inicial.
    window.location.href = "index.html";
    return;
  }
  meuUid = usuario.uid;
  meuNome = nomeSalvo();
  configurarPresenca(meuUid);
  observarParticipantes(meuUid, renderizarParticipantes);
});

function renderizarParticipantes(lista) {
  listaParticipantesEl.innerHTML = "";

  if (lista.length === 0) {
    const vazio = document.createElement("p");
    vazio.className = "aviso-vazio";
    vazio.textContent = "Ainda não há mais ninguém na turma.";
    listaParticipantesEl.appendChild(vazio);
    return;
  }

  lista.forEach((pessoa) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "item-participante";
    if (pessoaSelecionada && pessoaSelecionada.uid === pessoa.uid) {
      item.classList.add("selecionado");
    }
    item.innerHTML = `
      <span class="bolinha ${pessoa.online ? "online" : "offline"}"></span>
      <span class="nome-participante">${escaparTexto(pessoa.name)}</span>
    `;
    item.addEventListener("click", (evento) => selecionarConversa(pessoa, evento.currentTarget));
    listaParticipantesEl.appendChild(item);
  });
}

async function selecionarConversa(pessoa, elementoClicado) {
  pessoaSelecionada = pessoa;
  tituloConversaEl.textContent = `Conversando com ${pessoa.name}`;
  avisoSelecioneEl.style.display = "none";
  areaChatEl.style.display = "flex";

  // Atualiza destaque na lista
  document.querySelectorAll(".item-participante").forEach((el) => {
    el.classList.remove("selecionado");
  });
  if (elementoClicado) elementoClicado.classList.add("selecionado");

  const conversationId = idDaConversa(meuUid, pessoa.uid);
  await garantirConversa(conversationId, meuUid, pessoa.uid);

  if (pararDeObservarMensagens) {
    pararDeObservarMensagens();
  }
  pararDeObservarMensagens = observarMensagens(conversationId, renderizarMensagens);
}

function renderizarMensagens(lista) {
  mensagensEl.innerHTML = "";
  lista.forEach((msg) => {
    const bolha = document.createElement("div");
    const éMinha = msg.senderId === meuUid;
    bolha.className = `mensagem ${éMinha ? "minha" : "outra"}`;

    const autor = document.createElement("div");
    autor.className = "autor-mensagem";
    autor.textContent = éMinha ? "Você" : (pessoaSelecionada ? pessoaSelecionada.name : "");

    const texto = document.createElement("div");
    texto.className = "texto-mensagem";
    texto.textContent = msg.text;

    bolha.appendChild(autor);
    bolha.appendChild(texto);
    mensagensEl.appendChild(bolha);
  });
  mensagensEl.scrollTop = mensagensEl.scrollHeight;
}

formEnvioEl.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (!pessoaSelecionada) return;

  const texto = campoMensagemEl.value;
  campoMensagemEl.value = "";

  const conversationId = idDaConversa(meuUid, pessoaSelecionada.uid);
  await enviarMensagem(conversationId, meuUid, pessoaSelecionada.uid, texto);
});

botaoSairEl.addEventListener("click", async () => {
  await sairDoChat();
  window.location.href = "index.html";
});

function escaparTexto(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}
