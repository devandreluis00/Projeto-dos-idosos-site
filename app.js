// js/app.js
import { observarLogin, sairDoChat, nomeSalvo } from "./auth.js";
import { configurarPresenca, observarParticipantes } from "./users.js";
import {
  idDaConversa,
  garantirConversa,
  enviarMensagem,
  observarMensagens,
  definirDigitando,
  observarDigitando,
} from "./chat.js";

const listaParticipantesEl = document.getElementById("lista-participantes");
const tituloConversaEl = document.getElementById("titulo-conversa");
const mensagensEl = document.getElementById("mensagens");
const formEnvioEl = document.getElementById("form-envio");
const campoMensagemEl = document.getElementById("campo-mensagem");
const botaoSairEl = document.getElementById("botao-sair");
const avisoSelecioneEl = document.getElementById("aviso-selecione");
const areaChatEl = document.getElementById("area-chat");
const indicadorDigitandoEl = document.getElementById("indicador-digitando");

let meuUid = null;
let meuNome = "";
let pessoaSelecionada = null;
let pararDeObservarMensagens = null;
let pararDeObservarDigitando = null;
let timerDigitando = null;
let conversaAtualId = null;

observarLogin((usuario) => {
  if (!usuario) {
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
    if (pessoaSelecionada?.uid === pessoa.uid) item.classList.add("selecionado");
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

  document.querySelectorAll(".item-participante").forEach(el => el.classList.remove("selecionado"));
  if (elementoClicado) elementoClicado.classList.add("selecionado");

  if (pararDeObservarMensagens) pararDeObservarMensagens();
  if (pararDeObservarDigitando) pararDeObservarDigitando();
  pararTimerDigitando();
  mostrarDigitando(false);

  conversaAtualId = idDaConversa(meuUid, pessoa.uid);
  await garantirConversa(conversaAtualId, meuUid, pessoa.uid);

  mensagensEl.innerHTML = "";
  pararDeObservarMensagens = observarMensagens(conversaAtualId, renderizarMensagens);
  pararDeObservarDigitando = observarDigitando(conversaAtualId, meuUid, mostrarDigitando);
  campoMensagemEl.focus();
}

function renderizarMensagens(lista) {
  mensagensEl.innerHTML = "";
  lista.forEach((msg) => {
    const bolha = document.createElement("div");
    const eMinha = msg.senderId === meuUid;
    bolha.className = `mensagem ${eMinha ? "minha" : "outra"}`;

    const autor = document.createElement("div");
    autor.className = "autor-mensagem";
    autor.textContent = eMinha ? "Você" : (pessoaSelecionada?.name || "");

    const texto = document.createElement("div");
    texto.className = "texto-mensagem";
    texto.textContent = msg.text;

    bolha.appendChild(autor);
    bolha.appendChild(texto);
    mensagensEl.appendChild(bolha);
  });

  requestAnimationFrame(() => {
    mensagensEl.scrollTop = mensagensEl.scrollHeight;
  });
}

function mostrarDigitando(digitando) {
  if (!indicadorDigitandoEl) return;
  indicadorDigitandoEl.textContent = digitando
    ? `${pessoaSelecionada?.name || "A pessoa"} está digitando...`
    : "";
  indicadorDigitandoEl.classList.toggle("ativo", digitando);
}

function pararTimerDigitando() {
  if (timerDigitando) {
    clearTimeout(timerDigitando);
    timerDigitando = null;
  }
}

async function atualizarStatusDigitando() {
  if (!conversaAtualId || !meuUid) return;
  pararTimerDigitando();

  if (!campoMensagemEl.value.trim()) {
    await definirDigitando(conversaAtualId, meuUid, false);
    return;
  }

  await definirDigitando(conversaAtualId, meuUid, true);
  timerDigitando = setTimeout(async () => {
    if (conversaAtualId && meuUid) {
      await definirDigitando(conversaAtualId, meuUid, false);
    }
  }, 1500);
}

campoMensagemEl.addEventListener("input", atualizarStatusDigitando);

campoMensagemEl.addEventListener("blur", async () => {
  pararTimerDigitando();
  if (conversaAtualId && meuUid) await definirDigitando(conversaAtualId, meuUid, false);
});

formEnvioEl.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (!pessoaSelecionada || !conversaAtualId) return;

  const texto = campoMensagemEl.value.trim();
  if (!texto) return;

  pararTimerDigitando();
  await definirDigitando(conversaAtualId, meuUid, false);
  campoMensagemEl.value = "";

  try {
    await enviarMensagem(conversaAtualId, meuUid, pessoaSelecionada.uid, texto);
  } catch (erro) {
    console.error("Erro ao enviar mensagem:", erro);
    campoMensagemEl.value = texto;
  }
  campoMensagemEl.focus();
});

botaoSairEl.addEventListener("click", async () => {
  pararTimerDigitando();
  if (conversaAtualId && meuUid) await definirDigitando(conversaAtualId, meuUid, false);
  await sairDoChat();
  window.location.href = "index.html";
});

function escaparTexto(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}
