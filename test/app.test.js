const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { after, before, test } = require("node:test");
const { once } = require("node:events");

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "medflow-test-"));
const databaseFile = path.join(temporaryDirectory, "db.json");
fs.writeFileSync(
  databaseFile,
  JSON.stringify({
    usuarios: [],
    pacientes: [],
    triagens: [],
    consultas: []
  })
);
process.env.HOSPITAL_DB_FILE = databaseFile;

const app = require("../backend/server");
const apiApp = require("../api");
const { filtrarPacientes } = require("../frontend/js/patient-search");
const root = path.join(__dirname, "..");
let server;
let apiServer;
let baseUrl;
let apiBaseUrl;

before(async () => {
  server = app.listen(0, "127.0.0.1");
  apiServer = apiApp.listen(0, "127.0.0.1");
  await Promise.all([once(server, "listening"), once(apiServer, "listening")]);
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  apiBaseUrl = `http://127.0.0.1:${apiServer.address().port}`;
});

after(async () => {
  const servidores = [server, apiServer].filter(Boolean);
  if (servidores.length) {
    await new Promise((resolve, reject) => {
      let restantes = servidores.length;
      servidores.forEach((servidor) =>
        servidor.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          restantes -= 1;
          if (restantes === 0) resolve();
        })
      );
    });
  }
  delete process.env.HOSPITAL_DB_FILE;
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

async function postJson(caminho, body) {
  return fetch(`${baseUrl}${caminho}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function postApiJson(caminho, body) {
  return fetch(`${apiBaseUrl}${caminho}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

test("health endpoint confirms server and writable database", async () => {
  const response = await fetch(`${baseUrl}/health`);
  const dados = await response.json();

  assert.equal(response.status, 200);
  assert.equal(dados.status, "ok");
  assert.deepEqual(dados.checks, { servidor: "ok", bancoDeDados: "ok" });
  assert.ok(dados.timestamp);
});

test("prescriptions can be edited and removed without deleting the consultation", async () => {
  const criadaResponse = await postJson("/consulta", {
    paciente: "Paciente de teste",
    diagnostico: "Diagnóstico de teste",
    medicacao: "Medicamento inicial",
    dose: "1 comprimido",
    frequencia: "12 em 12 horas",
    duracao: "5 dias"
  });
  const criada = await criadaResponse.json();
  assert.equal(criadaResponse.status, 201);

  const atualizadaResponse = await fetch(`${baseUrl}/medicacoes/${criada.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      medicacao: "Medicamento atualizado",
      dose: "2 comprimidos",
      frequencia: "8 em 8 horas",
      duracao: "3 dias"
    })
  });
  assert.equal(atualizadaResponse.status, 200);
  assert.equal((await atualizadaResponse.json()).medicacao, "Medicamento atualizado");

  const removidaResponse = await fetch(`${baseUrl}/medicacoes/${criada.id}`, {
    method: "DELETE"
  });
  assert.equal(removidaResponse.status, 200);
  const banco = JSON.parse(fs.readFileSync(databaseFile, "utf8"));
  const consulta = banco.consultas.find((item) => item.id === criada.id);
  assert.ok(consulta);
  assert.equal(consulta.medicacao, "");
  assert.equal(consulta.diagnostico, "Diagnóstico de teste");
  assert.deepEqual(
    consulta.historicoMedicacao.map((item) => item.acao),
    ["edicao", "remocao"]
  );
});

test("on-call schedule validates staff roles and supports create, edit, and delete", async () => {
  const medicoResponse = await postJson("/usuarios", {
    nome: "Dr. Teste",
    usuario: "medico-plantao",
    senha: "senha-teste",
    tipo: "medico"
  });
  const enfermeiroResponse = await postJson("/usuarios", {
    nome: "Enfermeira Teste",
    usuario: "enfermagem-plantao",
    senha: "senha-teste",
    tipo: "enfermagem"
  });
  assert.equal(medicoResponse.status, 201);
  assert.equal(enfermeiroResponse.status, 201);

  const data = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const plantao = {
    data,
    turno: "manha",
    medico: "medico-plantao",
    enfermeiro: "enfermagem-plantao"
  };
  const response = await postJson("/plantao", plantao);
  const criado = await response.json();
  assert.equal(response.status, 201);
  assert.equal(criado.id, `${data}-manha`);
  assert.equal(criado.medico, plantao.medico);

  const escalaResponse = await fetch(`${baseUrl}/plantao`);
  const escala = await escalaResponse.json();
  assert.deepEqual(escala.medicos, [{ usuario: "medico-plantao", nome: "Dr. Teste" }]);
  assert.deepEqual(escala.enfermeiros, [
    { usuario: "enfermagem-plantao", nome: "Enfermeira Teste" }
  ]);
  assert.ok(escala.escala.some((item) => item.id === criado.id));

  const duplicado = await postJson("/plantao", plantao);
  assert.equal(duplicado.status, 409);

  const dataEditada = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  const atualizacao = await fetch(`${baseUrl}/plantao/${encodeURIComponent(criado.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...plantao, data: dataEditada, turno: "noite" })
  });
  assert.equal(atualizacao.status, 200);
  const atualizado = await atualizacao.json();
  assert.equal(atualizado.id, `${dataEditada}-noite`);

  const dataInvalida = await postJson("/plantao", { ...plantao, data: "2026-02-31" });
  assert.equal(dataInvalida.status, 400);

  const remocao = await fetch(`${baseUrl}/plantao/${encodeURIComponent(atualizado.id)}`, {
    method: "DELETE"
  });
  assert.equal(remocao.status, 200);
  const escalaFinal = await (await fetch(`${baseUrl}/plantao`)).json();
  assert.ok(!escalaFinal.escala.some((item) => item.id === atualizado.id));
});

test("stockroom validates medicines, records entries, and updates inventory", async () => {
  const originalDatabase = fs.readFileSync(databaseFile, "utf8");

  try {
    const invalid = await postJson("/estoque", {
      nome: "Dipirona",
      quantidade: 0,
      unidade: "comprimidos",
      categoria: "Analgésico"
    });
    assert.equal(invalid.status, 400);

    const cadastro = await postJson("/estoque", {
      nome: "Dipirona 500 mg",
      quantidade: 8,
      unidade: "comprimidos",
      categoria: "Analgésico/antipirético",
      observacao: "Nota fiscal 123"
    });
    assert.equal(cadastro.status, 201);
    const criado = await cadastro.json();
    assert.equal(criado.medicamento.quantidade, 8);
    assert.equal(criado.entrada.observacao, "Nota fiscal 123");

    const duplicado = await postJson("/estoque", {
      nome: "dipirona 500 MG",
      quantidade: 3,
      unidade: "comprimidos",
      categoria: "Analgésico"
    });
    assert.equal(duplicado.status, 409);

    const reposicao = await postJson(
      `/estoque/${encodeURIComponent(criado.medicamento.id)}/entradas`,
      {
        quantidade: 7,
        observacao: "Lote B"
      }
    );
    assert.equal(reposicao.status, 201);
    assert.equal((await reposicao.json()).medicamento.quantidade, 15);

    const quantidadeInvalida = await postJson(
      `/estoque/${encodeURIComponent(criado.medicamento.id)}/entradas`,
      {
        quantidade: 1.5
      }
    );
    assert.equal(quantidadeInvalida.status, 400);

    const medicamentos = await (await fetch(`${baseUrl}/estoque`)).json();
    assert.equal(medicamentos.length, 1);
    assert.equal(medicamentos[0].ultimaEntrada != null, true);

    const entradas = await (await fetch(`${baseUrl}/estoque/entradas`)).json();
    assert.equal(entradas.length, 2);
    assert.equal(entradas[0].quantidade, 7);
    assert.equal(entradas[0].observacao, "Lote B");

    const inexistente = await postJson("/estoque/nao-existe/entradas", { quantidade: 1 });
    assert.equal(inexistente.status, 404);
  } finally {
    fs.writeFileSync(databaseFile, originalDatabase);
  }
});

test("almoxarifado accounts keep the display name for login and user lists", async () => {
  const originalDatabase = fs.readFileSync(databaseFile, "utf8");

  try {
    const cadastro = await postJson("/usuarios", {
      nome: "Ana do Estoque",
      usuario: "almoxarifado-teste",
      senha: "senha-teste",
      tipo: "almoxarifado"
    });
    assert.equal(cadastro.status, 201);
    assert.equal((await cadastro.json()).nome, "Ana do Estoque");

    const login = await postJson("/login", {
      usuario: "almoxarifado-teste",
      senha: "senha-teste"
    });
    assert.equal(login.status, 200);
    assert.equal((await login.json()).tipo, "almoxarifado");

    const usuarios = await (await fetch(`${baseUrl}/usuarios`)).json();
    assert.ok(
      usuarios.some(
        (item) => item.usuario === "almoxarifado-teste" && item.nome === "Ana do Estoque"
      )
    );
  } finally {
    fs.writeFileSync(databaseFile, originalDatabase);
  }
});

test("published API registers almoxarifado users and exposes stock status to admin", async () => {
  const originalDatabase = fs.readFileSync(databaseFile, "utf8");

  try {
    const user = await postApiJson("/usuarios", {
      nome: "Equipe de Estoque",
      usuario: "almox-api-teste",
      senha: "senha-teste",
      tipo: "almoxarifado"
    });
    assert.equal(user.status, 201);
    assert.equal((await user.json()).nome, "Equipe de Estoque");

    const medicine = await postApiJson("/estoque", {
      nome: "Soro de teste",
      quantidade: 4,
      unidade: "frascos",
      categoria: "Solução"
    });
    assert.equal(medicine.status, 201);

    const db = JSON.parse(fs.readFileSync(databaseFile, "utf8"));
    db.medicamentos[0].quantidade = 0;
    fs.writeFileSync(databaseFile, JSON.stringify(db));

    const resumo = await (await fetch(`${apiBaseUrl}/admin/resumo`)).json();
    assert.equal(resumo.estoque.total, 1);
    assert.equal(resumo.estoque.zerado, 1);
    assert.equal(resumo.estoque.itensBaixos[0].nome, "Soro de teste");

    const login = await postApiJson("/login", {
      usuario: "almox-api-teste",
      senha: "senha-teste"
    });
    assert.equal(login.status, 200);
    assert.equal((await login.json()).tipo, "almoxarifado");
  } finally {
    fs.writeFileSync(databaseFile, originalDatabase);
  }
});

test("patient registration rejects missing and invalid required fields", async () => {
  const missing = await postJson("/atendimento", {});
  assert.equal(missing.status, 400);
  assert.match((await missing.json()).erro, /nome/i);

  const invalidEmail = await postJson("/atendimento", {
    nome: "Paciente de teste",
    documento: "TESTE-123",
    sexo: "Outro",
    nomeMae: "Responsável",
    estadoCivil: "Solteiro",
    endereco: "Rua de teste, 123",
    telefone: "(11) 99999-0000",
    email: "email-invalido",
    contatoEmergencia: "Contato de teste",
    motivo: "Consulta"
  });
  assert.equal(invalidEmail.status, 400);
  assert.match((await invalidEmail.json()).erro, /e-mail/i);
});

test("valid patient registration is returned in the triage queue", async () => {
  const cadastro = {
    nome: "Paciente de teste",
    cpf: "TESTE-123",
    documento: "TESTE-123",
    sexo: "Outro",
    nomeMae: "Responsável de teste",
    estadoCivil: "Solteiro",
    endereco: "Rua de teste, 123",
    telefone: "(11) 99999-0000",
    email: "paciente@example.com",
    contatoEmergencia: "Contato de teste",
    tipo: "Particular",
    motivo: "Consulta"
  };
  const response = await postJson("/atendimento", cadastro);
  const paciente = await response.json();

  assert.equal(response.status, 200);
  assert.equal(paciente.nome, cadastro.nome);
  assert.equal(paciente.email, cadastro.email);

  const filaResponse = await fetch(`${baseUrl}/atendimento`);
  const fila = await filaResponse.json();
  assert.ok(fila.some((item) => item.id === paciente.id));
});

test("admin flow map returns patients in the correct stages with wait timestamps", async () => {
  const originalDatabase = fs.readFileSync(databaseFile, "utf8");
  const agora = new Date();
  const pacienteTriagem = {
    id: "p-triagem",
    nome: "Aguardando Triagem",
    status: "triagem",
    createdAt: new Date(agora.getTime() - 15 * 60000).toISOString()
  };
  const pacienteAtivo = {
    id: "p-ativo",
    nome: "Em Triagem",
    status: "em_triagem",
    createdAt: agora.toISOString()
  };
  const db = {
    usuarios: [],
    pacientes: [pacienteTriagem, pacienteAtivo],
    triagens: [
      {
        id: "t-espera",
        pacienteId: "p-medico",
        nome: "Aguardando Médico",
        status: "aguardando_medico",
        risco: "amarelo",
        createdAt: new Date(agora.getTime() - 20 * 60000).toISOString()
      },
      {
        id: "t-consulta",
        pacienteId: "p-consulta",
        nome: "Em Consulta",
        status: "em_consulta"
      },
      {
        id: "t-final",
        pacienteId: "p-final",
        nome: "Paciente Finalizado",
        status: "concluida"
      }
    ],
    consultas: [
      {
        id: "c-final",
        triagemId: "t-final",
        desfecho: "alta",
        createdAt: agora.toISOString()
      }
    ],
    medicamentos: [
      { id: "estoque-baixo", nome: "Dipirona", quantidade: 4, unidade: "comprimidos" },
      { id: "estoque-zerado", nome: "Soro", quantidade: 0, unidade: "frascos" },
      { id: "estoque-normal", nome: "Paracetamol", quantidade: 12, unidade: "comprimidos" }
    ],
    pacienteTriagemAtivaId: "p-ativo",
    triagemMedicaAtivaId: "t-consulta",
    chamadasAtuaisTV: {
      triagem: { horario: agora.toISOString() },
      medico: { horario: agora.toISOString() }
    }
  };
  db.pacientes.push(
    { id: "p-medico", nome: "Aguardando Médico", status: "em_consulta" },
    { id: "p-consulta", nome: "Em Consulta", status: "em_consulta" },
    { id: "p-final", nome: "Paciente Finalizado", status: "concluida" }
  );
  fs.writeFileSync(databaseFile, JSON.stringify(db));

  try {
    const response = await fetch(`${baseUrl}/admin/resumo`);
    const resumo = await response.json();
    const etapas = Object.fromEntries(resumo.fluxo.map((etapa) => [etapa.id, etapa]));

    assert.equal(response.status, 200);
    assert.deepEqual(resumo.estoque, {
      total: 3,
      normal: 1,
      baixo: 1,
      zerado: 1,
      itensBaixos: [
        { nome: "Soro", quantidade: 0, unidade: "frascos", situacao: "zerado" },
        { nome: "Dipirona", quantidade: 4, unidade: "comprimidos", situacao: "baixo" }
      ]
    });
    assert.equal(etapas["aguardando-triagem"].pacientes[0].nome, "Aguardando Triagem");
    assert.equal(etapas["aguardando-triagem"].pacientes[0].desde, pacienteTriagem.createdAt);
    assert.equal(etapas["em-triagem"].pacientes[0].nome, "Em Triagem");
    assert.equal(etapas["em-triagem"].pacientes[0].desde, agora.toISOString());
    assert.equal(etapas["aguardando-medico"].pacientes[0].prioridade, "amarelo");
    assert.equal(etapas["aguardando-medico"].pacientes[0].desde, db.triagens[0].createdAt);
    assert.equal(etapas["em-consulta"].pacientes[0].desde, agora.toISOString());
    assert.equal(etapas["finalizados-hoje"].pacientes[0].detalhe, "Alta");
    assert.equal(etapas["finalizados-hoje"].pacientes[0].nome, "Paciente Finalizado");
  } finally {
    fs.writeFileSync(databaseFile, originalDatabase);
  }
});

test("login and triage forms receive actionable server errors", async () => {
  const login = await postJson("/login", { usuario: "inexistente", senha: "invalida" });
  assert.equal(login.status, 401);
  assert.equal((await login.json()).erro, "Login inválido");

  const triagem = await postJson("/triagem", {});
  assert.equal(triagem.status, 400);
  assert.match((await triagem.json()).erro, /paciente/i);
});

test("shared API helper parses success and server error responses", async () => {
  const helperSource = fs.readFileSync(path.join(root, "frontend", "js", "api.js"), "utf8");
  const context = {
    location: { protocol: "file:", hostname: "", port: "" },
    window: {},
    fetch: (url, options) => fetch(String(url).replace("http://localhost:3000", baseUrl), options)
  };
  vm.runInNewContext(helperSource, context);

  const health = await context.window.medflowRequest("/health", { cache: "no-store" });
  assert.equal(health.status, "ok");

  await assert.rejects(
    context.window.medflowRequest("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario: "inexistente", senha: "invalida" })
    }),
    /Login inválido/
  );
});

test("clinical assistant sends sanitized, non-identifying clinical data to OpenAI", async () => {
  const chaveAnterior = process.env.OPENAI_API_KEY;
  const fetchOriginal = global.fetch;
  let requisicaoOpenAI;
  process.env.OPENAI_API_KEY = "test-key";
  global.fetch = async (url, options) => {
    if (String(url) === "https://api.openai.com/v1/responses") {
      requisicaoOpenAI = { url, options };
      return new Response(
        JSON.stringify({
          output: [
            {
              type: "message",
              content: [
                { type: "output_text", text: "Possibilidades informativas para revisão médica." }
              ]
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return fetchOriginal(url, options);
  };

  try {
    const response = await postJson("/assistente-medico", {
      nome: "Maria Silva",
      documento: "123.456.789-00",
      sintoma: "Dor no peito",
      temperatura: 38,
      observacao: "CPF 123.456.789-00, contato teste@example.com, telefone 11987654321"
    });
    const dados = await response.json();

    assert.equal(response.status, 200);
    assert.match(dados.analise, /Possibilidades informativas/);
    assert.equal(requisicaoOpenAI.options.headers.Authorization, "Bearer test-key");
    const corpoOpenAI = JSON.parse(requisicaoOpenAI.options.body);
    assert.equal(corpoOpenAI.store, false);
    assert.match(corpoOpenAI.input, /Dor no peito/);
    assert.doesNotMatch(
      corpoOpenAI.input,
      /Maria Silva|123\.456\.789-00|teste@example\.com|11987654321/
    );
    assert.match(corpoOpenAI.input, /documento removido/);
    assert.match(corpoOpenAI.input, /e-mail removido/);
    assert.doesNotMatch(corpoOpenAI.input, /11987654321/);
  } finally {
    global.fetch = fetchOriginal;
    if (chaveAnterior === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = chaveAnterior;
  }
});

test("clinical assistant reports missing OpenAI configuration", async () => {
  const chaveAnterior = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  try {
    const response = await postJson("/assistente-medico", { sintoma: "Febre" });
    const dados = await response.json();
    assert.equal(response.status, 503);
    assert.match(dados.erro, /OPENAI_API_KEY/);
  } finally {
    if (chaveAnterior !== undefined) process.env.OPENAI_API_KEY = chaveAnterior;
  }
});

test("patient search matches accented names and formatted documents", () => {
  const pacientes = [
    { nome: "João da Conceição", documento: "123.456.789-00" },
    { nome: "Maria Souza", cpf: "RG 42.321" },
    { nome: "Carlos Lima", documento: "ABC-900" }
  ];

  assert.deepEqual(filtrarPacientes(pacientes, "joao conceicao"), [pacientes[0]]);
  assert.deepEqual(filtrarPacientes(pacientes, "12345678900"), [pacientes[0]]);
  assert.deepEqual(filtrarPacientes(pacientes, "rg42321"), [pacientes[1]]);
  assert.deepEqual(filtrarPacientes(pacientes, "sem resultado"), []);
  assert.equal(filtrarPacientes(pacientes, "").length, pacientes.length);
});

test("forms and admin dashboard are wired to the shared API and health indicator", () => {
  const atendimento = fs.readFileSync(path.join(root, "frontend", "atendimento.html"), "utf8");
  const login = fs.readFileSync(path.join(root, "frontend", "index.html"), "utf8");
  const triagem = fs.readFileSync(path.join(root, "frontend", "triagem.html"), "utf8");
  const medico = fs.readFileSync(path.join(root, "frontend", "medico.html"), "utf8");
  const admin = fs.readFileSync(path.join(root, "frontend", "admin.html"), "utf8");

  for (const id of ["nome", "documento", "sexo", "email", "motivo"]) {
    assert.match(atendimento, new RegExp(`id="${id}"[^>]*required`));
  }
  assert.match(atendimento, /medflowRequest\("\/atendimento"/);
  assert.match(login, /medflowRequest\("\/login"/);
  assert.match(triagem, /medflowRequest\(\s*["']\/triagem["']/);
  assert.match(medico, /medflowRequest\("\/consulta"/);
  assert.doesNotMatch(medico, /tiktok|aiAssistant|Assistente clínico|medico-ai\.js/i);
  assert.match(triagem, /id="buscaPacientes"/);
  assert.match(admin, /id="statusServidor"/);
  assert.match(admin, /js\/api\.js/);
});
