// js/app.js
import { auth } from "./firebase-config.js";
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
const botaoSairEl = document.getElementById("botao-sair");
const avisoSelecioneEl = document.getElementById("aviso-selecione");
const areaChatEl = document.getElementById("area-chat");
const indicadorDigitandoEl = document.getElementById("indicador-digitando");
const textoDigitandoEl = document.getElementById("texto-digitando");

let meuUid = null;
let meuNome = "";
let pessoaSelecionada = null; // { uid, name }
let pararDeObservarMensagens = null;
let pararDeObservarDigitacao = null;
let conversaAtualId = null;
let temporizadorDigitacao = null;

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

    if (pessoaSelecionada && pessoaSelecionada.uid === pessoa.uid) {
      item.classList.add("selecionado");
    }

    item.innerHTML = `
      <span class="bolinha ${pessoa.online ? "online" : "offline"}"></span>
      <span class="nome-participante">${escaparTexto(pessoa.name)}</span>
    `;

    item.addEventListener("click", (evento) =>
      selecionarConversa(pessoa, evento.currentTarget)
    );

    listaParticipantesEl.appendChild(item);
  });
}

async function selecionarConversa(pessoa, elementoClicado) {
  // Para a indicação de digitação da conversa anterior.
  if (conversaAtualId && meuUid) {
    await pararDigitando(conversaAtualId, meuUid);
  }

  if (temporizadorDigitacao) {
    clearTimeout(temporizadorDigitacao);
    temporizadorDigitacao = null;
  }

  pessoaSelecionada = pessoa;
  conversaAtualId = idDaConversa(meuUid, pessoa.uid);

  tituloConversaEl.textContent = `Conversando com ${pessoa.name}`;
  avisoSelecioneEl.style.display = "none";
  areaChatEl.style.display = "flex";
  esconderIndicadorDigitando();

  document.querySelectorAll(".item-participante").forEach((el) => {
    el.classList.remove("selecionado");
  });

  if (elementoClicado) elementoClicado.classList.add("selecionado");

  await garantirConversa(conversaAtualId, meuUid, pessoa.uid);

  if (pararDeObservarMensagens) {
    pararDeObservarMensagens();
  }

  if (pararDeObservarDigitacao) {
    pararDeObservarDigitacao();
  }

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
    bolha.className = `mensagem ${eMinha ? "minha" : "outra"}`;

    const autor = document.createElement("div");
    autor.className = "autor-mensagem";
    autor.textContent = eMinha
      ? "Você"
      : (pessoaSelecionada ? pessoaSelecionada.name : "");

    const texto = document.createElement("div");
    texto.className = "texto-mensagem";
    texto.textContent = msg.text;

    bolha.appendChild(autor);
    bolha.appendChild(texto);
    mensagensEl.appendChild(bolha);
  });

  // Mantém o scroll sempre no final da conversa.
  requestAnimationFrame(() => {
    mensagensEl.scrollTop = mensagensEl.scrollHeight;
  });
}

campoMensagemEl.addEventListener("input", async () => {
  if (!pessoaSelecionada || !conversaAtualId) return;

  const temTexto = campoMensagemEl.value.trim().length > 0;

  if (!temTexto) {
    await pararDigitando(conversaAtualId, meuUid);
    return;
  }

  await definirDigitando(conversaAtualId, meuUid, meuNome);

  if (temporizadorDigitacao) {
    clearTimeout(temporizadorDigitacao);
  }

  // Se a pessoa parar de digitar por 1,5 segundo,
  // o indicador desaparece para o outro usuário.
  temporizadorDigitacao = setTimeout(async () => {
    if (conversaAtualId && meuUid) {
      await pararDigitando(conversaAtualId, meuUid);
    }
  }, 1500);
});

campoMensagemEl.addEventListener("blur", async () => {
  if (!pessoaSelecionada || !conversaAtualId) return;

  // Não remove imediatamente se ainda houver texto:
  // o temporizador controla o desaparecimento natural.
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

  if (temporizadorDigitacao) {
    clearTimeout(temporizadorDigitacao);
    temporizadorDigitacao = null;
  }

  await pararDigitando(conversaAtualId, meuUid);

  await enviarMensagem(
    conversaAtualId,
    meuUid,
    pessoaSelecionada.uid,
    texto
  );

  campoMensagemEl.focus();
});

botaoSairEl.addEventListener("click", async () => {
  if (conversaAtualId && meuUid) {
    await pararDigitando(conversaAtualId, meuUid);
  }

  await sairDoChat();
  window.location.href = "index.html";
});

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

function escaparTexto(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}
