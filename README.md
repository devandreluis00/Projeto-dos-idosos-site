# Chat da Turma

Chat simples e privado, em tempo real, feito para uma aula de internet para
idosos. Cada pessoa digita só o nome, entra com autenticação anônima do
Firebase, e conversa em duplas.

Este projeto usa o **projeto Firebase que você já tem** — não é criado
nenhum projeto novo, nenhum app Web novo e nenhum Realtime Database novo.

---

## 1. Onde pegar os dados do seu Firebase (`firebaseConfig`)

1. Acesse https://console.firebase.google.com e abra o seu projeto existente.
2. Clique no ícone de engrenagem (canto superior esquerdo) → **Configurações do projeto**.
3. Na aba **Geral**, role até **"Seus aplicativos"**.
4. Clique no aplicativo Web que você já cadastrou (ícone `</>`).
5. Em **"Configuração do SDK"**, marque a opção **Config** (não "CDN"). Vai
   aparecer um bloco parecido com:

   ```js
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "seu-projeto.firebaseapp.com",
     databaseURL: "https://seu-projeto-default-rtdb.firebaseio.com",
     projectId: "seu-projeto",
     storageBucket: "seu-projeto.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef123456",
   };
   ```

6. Copie esses valores e cole em `js/firebase-config.js`, substituindo os
   textos `"COLE_AQUI_..."`.

   > Atenção especial ao campo `databaseURL`: ele precisa apontar para o
   > Realtime Database que você já usou nos testes. Confira em
   > **Build → Realtime Database** se a URL bate com a que está lá.

---

## 2. Ativar a autenticação anônima

1. No menu lateral: **Build → Authentication**.
2. Aba **Sign-in method** (Métodos de login).
3. Clique em **Anonymous** (Anônimo) → **Ativar** → **Salvar**.

Nenhum outro provedor (e-mail, Google, etc.) é necessário.

---

## 3. Substituir as regras do Realtime Database

**Hoje as suas regras estão públicas** (algo como `".read": true, ".write": true`),
porque o banco foi usado só para testes. Isso significa que, neste momento,
qualquer pessoa na internet pode ler e escrever nos seus dados. Antes de usar
o chat com a turma, é importante trocar isso.

### 3.1 Regra atual (de teste) — provavelmente parecida com isto:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

### 3.2 Regra recomendada para o chat

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "users": {
      ".read": "auth != null",
      "$uid": {
        ".write": "auth != null && auth.uid === $uid",
        ".validate": "newData.hasChildren(['name', 'online', 'lastSeen'])",
        "name": {
          ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length < 60"
        },
        "online": {
          ".validate": "newData.isBoolean()"
        },
        "lastSeen": {
          ".validate": "newData.isNumber()"
        },
        "$other": {
          ".validate": false
        }
      }
    },
    "conversations": {
      "$conversationId": {
        ".read": "auth != null && $conversationId.contains(auth.uid)",
        ".write": "auth != null && $conversationId.contains(auth.uid)",
        "messages": {
          "$messageId": {
            ".validate": "newData.hasChildren(['senderId', 'receiverId', 'text', 'createdAt']) && newData.child('senderId').val() === auth.uid",
            "senderId": { ".validate": "newData.val() === auth.uid" },
            "receiverId": { ".validate": "newData.isString()" },
            "text": {
              ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length < 2000"
            },
            "createdAt": { ".validate": "newData.val() <= now" }
          }
        }
      }
    }
  }
}
```

O que essas regras garantem:

- Só quem está autenticado (mesmo que anonimamente) consegue ler ou
  escrever qualquer coisa.
- Cada pessoa só pode criar/editar o **próprio** registro em `users/{uid}`
  — não dá para alterar o perfil de outra pessoa.
- Cada conversa só pode ser lida/escrita por quem participa dela (o ID da
  conversa é formado pelos dois UIDs, então só quem tem um desses UIDs
  consegue acessar).
- Uma mensagem só é aceita se o campo `senderId` for exatamente o UID de
  quem está enviando — ou seja, ninguém consegue mandar mensagem se
  passando por outra pessoa.
- Qualquer outro caminho do banco fica bloqueado por padrão
  (`".read": false, ".write": false` no topo).

> Esta regra foi pensada para uma turma pequena e de confiança (uma sala de
> aula). Ela não é um sistema de segurança de nível empresarial, mas já
> resolve os problemas principais: acesso público, personificação de
> usuário e leitura de conversas alheias.

### 3.3 Como substituir

1. No Firebase Console: **Build → Realtime Database → aba "Regras"**.
2. Apague o conteúdo atual.
3. Cole a regra recomendada (item 3.2).
4. Clique em **Publicar**.

### 3.4 Como testar se o chat continua funcionando

1. Depois de publicar as regras, abra o site em duas abas (ou dois
   navegadores/computadores).
2. Entre com nomes diferentes em cada uma.
3. Verifique se as duas pessoas aparecem na lista de participantes.
4. Selecione uma pessoa e envie uma mensagem — ela deve aparecer na outra
   aba na hora, sem recarregar a página.
5. Se algo não funcionar, abra o **Console do navegador** (F12) e veja se
   aparece algum erro do tipo `PERMISSION_DENIED` — isso indica que a regra
   está bloqueando algo que deveria ser permitido, e vale revisar o UID
   usado nos testes.

---

## 4. Estrutura de dados usada

```
users/
  uid1/
    name: "Maria"
    online: true
    lastSeen: 1699999999999

conversations/
  uid1_uid2/            <- UIDs ordenados e unidos com "_"
    messages/
      -Nx7f.../
        senderId: "uid1"
        receiverId: "uid2"
        text: "Olá!"
        createdAt: 1699999999999
```

---

## 5. Testando com duas pessoas (passo a passo simples)

1. Computador 1: acesse o site, digite **Maria**, clique em **ENTRAR NO CHAT**.
2. Computador 2: acesse o site, digite **Onésimo**, clique em **ENTRAR NO CHAT**.
3. Nos dois computadores, a lista de participantes deve mostrar a outra pessoa com uma bolinha verde (online).
4. Maria clica em **Onésimo** na lista e escreve "Olá!" → clica em **ENVIAR**.
5. A mensagem aparece imediatamente na tela do Onésimo.
6. Onésimo responde "Oi!" → Maria recebe na hora.
7. Maria clica em **SAIR**. A bolinha dela deve ficar cinza (offline) na tela do Onésimo.

---

## 6. Estrutura de arquivos

```
chat-idosos/
  index.html          <- tela de entrada (digitar nome)
  app.html             <- tela principal do chat
  css/
    style.css
  js/
    firebase-config.js <- AQUI vai a configuração do seu Firebase
    auth.js
    users.js
    chat.js
    app.js
  README.md
  .gitignore
```

---

## 7. Publicar no GitHub

```bash
git init
git add .
git commit -m "Chat da turma"
git branch -M main
git remote add origin URL_DO_SEU_REPOSITORIO
git push -u origin main
```

Troque `URL_DO_SEU_REPOSITORIO` pelo link do repositório que você criar no
GitHub (ex: `https://github.com/seu-usuario/chat-idosos.git`).

### Opção A: publicar com GitHub Pages (mais simples)

1. No repositório do GitHub, vá em **Settings → Pages**.
2. Em **Source**, escolha a branch `main` e a pasta `/ (root)`.
3. Salve. Em alguns minutos o site fica disponível em algo como
   `https://seu-usuario.github.io/chat-idosos/`.

### Opção B: publicar com Firebase Hosting

Como você já tem um projeto Firebase, também é possível usar o Hosting dele:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# quando perguntar a pasta pública, aponte para a pasta deste projeto
firebase deploy
```

O Firebase vai gerar uma URL do tipo `https://seu-projeto.web.app`.

---

## 8. Checklist final antes de usar com a turma

- [ ] `js/firebase-config.js` preenchido com os dados reais do projeto
- [ ] Authentication → Anonymous ativado
- [ ] Regras do Realtime Database substituídas (item 3.2) e publicadas
- [ ] Testado com duas pessoas em computadores/abas diferentes
- [ ] Site publicado (GitHub Pages ou Firebase Hosting)
