# MedFlow Hospital System

Sistema de atendimento hospitalar com cadastro, triagem, consultas, escala de plantão e controle de medicamentos.

## Requisitos

- Node.js 20 ou superior
- npm

## Executar localmente

Na pasta do projeto:

```powershell
npm ci
npm start
```

O servidor fica disponível em `http://localhost:3000`.

## Assistente clínico com IA

O assistente é opcional e requer uma chave da API da OpenAI. Configure `OPENAI_API_KEY` no ambiente do servidor; nunca coloque a chave no frontend, em arquivos versionados ou em mensagens. `OPENAI_MODEL` pode ser definido para selecionar outro modelo compatível.

O assistente envia os dados clínicos necessários à OpenAI somente após a confirmação na tela. Não envie nome, documento ou outros dados identificáveis nos campos clínicos. As respostas são informativas e devem ser avaliadas pelo profissional responsável.

## Verificações

```powershell
npm test
npm run format:check
```

O GitHub Actions executa essas verificações em cada push e pull request.

## Dados locais

O arquivo `backend/db.json` contém dados locais do sistema e é ignorado pelo Git. Ele não deve ser enviado ao GitHub. Em uma instalação nova, o servidor cria o banco de dados conforme necessário.

O GitHub armazena o código, mas não executa o servidor. A publicação do sistema em uma hospedagem será configurada separadamente.
