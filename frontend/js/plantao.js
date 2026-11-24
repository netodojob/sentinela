(() => {
  const formulario = document.getElementById("formPlantao");
  const dataInput = document.getElementById("dataPlantao");
  const turnoSelect = document.getElementById("turnoPlantao");
  const medicoSelect = document.getElementById("medicoPlantao");
  const enfermeiroSelect = document.getElementById("enfermeiroPlantao");
  const lista = document.getElementById("listaPlantoes");
  const statusEscala = document.getElementById("statusEscala");
  const statusFormulario = document.getElementById("statusFormulario");
  const salvarBotao = document.getElementById("salvarPlantao");
  const cancelarBotao = document.getElementById("cancelarEdicao");
  let escalaAtual = [];
  let profissionais = { medicos: [], enfermeiros: [] };
  let turnoNomes = new Map();
  let idEmEdicao = null;

  function hojeLocal() {
    const agora = new Date();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");
    return `${agora.getFullYear()}-${mes}-${dia}`;
  }

  function formatarData(valor) {
    const [ano, mes, dia] = valor.split("-").map(Number);
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "long"
    }).format(new Date(ano, mes - 1, dia, 12));
  }

  function preencherSelect(select, profissionais, textoInicial) {
    select.replaceChildren();
    const padrao = document.createElement("option");
    padrao.value = "";
    padrao.textContent = textoInicial;
    select.appendChild(padrao);
    profissionais.forEach((profissional) => {
      const opcao = document.createElement("option");
      opcao.value = profissional.usuario;
      opcao.textContent = profissional.nome || profissional.usuario;
      select.appendChild(opcao);
    });
    select.disabled = profissionais.length === 0;
  }

  function criarLinhaEquipe(rotulo, nome) {
    const linha = document.createElement("p");
    const titulo = document.createElement("span");
    titulo.textContent = `${rotulo}:`;
    const valor = document.createElement("strong");
    valor.textContent = nome;
    linha.append(titulo, valor);
    return linha;
  }

  function criarBotao(rotulo, classe, acao) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = classe;
    botao.textContent = rotulo;
    botao.addEventListener("click", acao);
    return botao;
  }

  function renderizarEscala() {
    lista.replaceChildren();
    if (!escalaAtual.length) {
      const vazio = document.createElement("p");
      vazio.className = "schedule-empty";
      vazio.textContent =
        "Nenhum plantão programado ainda. Use o formulário para montar a primeira escala.";
      lista.appendChild(vazio);
      return;
    }

    escalaAtual.forEach((plantao) => {
      const cartao = document.createElement("article");
      cartao.className = "schedule-item";
      const data = document.createElement("div");
      data.className = "schedule-date";
      const dataTexto = document.createElement("strong");
      dataTexto.textContent = formatarData(plantao.data);
      const turno = document.createElement("span");
      turno.textContent = turnoNomes.get(plantao.turno) || plantao.turno;
      data.append(dataTexto, turno);

      const equipe = document.createElement("div");
      equipe.className = "schedule-staff";
      equipe.append(
        criarLinhaEquipe("Médico", plantao.medicoNome || plantao.medico),
        criarLinhaEquipe("Enfermagem", plantao.enfermeiroNome || plantao.enfermeiro)
      );

      const acoes = document.createElement("div");
      acoes.className = "schedule-actions";
      acoes.append(
        criarBotao("Editar", "button-secondary", () => iniciarEdicao(plantao)),
        criarBotao("Remover", "remove-shift", () => removerPlantao(plantao))
      );
      cartao.append(data, equipe, acoes);
      lista.appendChild(cartao);
    });
  }

  async function carregarEscala() {
    const botao = document.getElementById("atualizarEscala");
    botao.disabled = true;
    statusEscala.textContent = "Carregando escala...";

    try {
      const dados = await window.medflowRequest("/plantao", { cache: "no-store" });
      if (
        !Array.isArray(dados.turnos) ||
        !Array.isArray(dados.medicos) ||
        !dados.medicos.every(
          (profissional) =>
            profissional &&
            typeof profissional.usuario === "string" &&
            typeof profissional.nome === "string"
        ) ||
        !Array.isArray(dados.enfermeiros) ||
        !dados.enfermeiros.every(
          (profissional) =>
            profissional &&
            typeof profissional.usuario === "string" &&
            typeof profissional.nome === "string"
        ) ||
        !Array.isArray(dados.escala)
      ) {
        throw new Error("Os dados retornados para a escala são inválidos.");
      }

      profissionais = {
        medicos: dados.medicos,
        enfermeiros: dados.enfermeiros
      };
      turnoNomes = new Map(dados.turnos.map((turno) => [turno.id, turno.nome]));
      escalaAtual = dados.escala;
      preencherSelect(
        turnoSelect,
        dados.turnos.map((turno) => ({ usuario: turno.id, nome: turno.nome })),
        "Selecione o turno"
      );
      preencherSelect(medicoSelect, profissionais.medicos, "Selecione o médico");
      preencherSelect(enfermeiroSelect, profissionais.enfermeiros, "Selecione o(a) enfermeiro(a)");
      document.getElementById("avisoEquipe").textContent =
        !profissionais.medicos.length && !profissionais.enfermeiros.length
          ? "Cadastre usuários nos setores Médico e Enfermagem antes de montar a escala."
          : !profissionais.medicos.length
            ? "Cadastre ao menos um usuário no setor Médico para completar a escala."
            : !profissionais.enfermeiros.length
              ? "Cadastre ao menos um usuário no setor Enfermagem para completar a escala."
              : "";

      renderizarEscala();
      statusEscala.textContent = `${escalaAtual.length} plantão(ões) na escala.`;
    } catch (erro) {
      statusEscala.textContent = `${erro.message} Verifique se o servidor está funcionando.`;
    } finally {
      botao.disabled = false;
    }
  }

  function iniciarEdicao(plantao) {
    idEmEdicao = plantao.id;
    dataInput.value = plantao.data;
    turnoSelect.value = plantao.turno;
    medicoSelect.value = plantao.medico;
    enfermeiroSelect.value = plantao.enfermeiro;
    document.getElementById("form-title").textContent = "Editar plantão";
    salvarBotao.textContent = "Salvar alterações";
    cancelarBotao.hidden = false;
    statusFormulario.textContent = "Altere a equipe ou o turno deste plantão.";
    dataInput.focus();
  }

  function limparEdicao() {
    idEmEdicao = null;
    formulario.reset();
    document.getElementById("form-title").textContent = "Adicionar à escala";
    salvarBotao.textContent = "Adicionar plantão";
    cancelarBotao.hidden = true;
    statusFormulario.textContent = "";
  }

  async function salvarPlantao(evento) {
    evento.preventDefault();
    const dados = {
      data: dataInput.value,
      turno: turnoSelect.value,
      medico: medicoSelect.value,
      enfermeiro: enfermeiroSelect.value
    };
    if (Object.values(dados).some((valor) => !valor)) {
      statusFormulario.textContent =
        !profissionais.medicos.length || !profissionais.enfermeiros.length
          ? "Cadastre pelo menos um médico e um profissional de enfermagem antes de salvar."
          : "Preencha data, turno, médico e profissional de enfermagem.";
      return;
    }

    salvarBotao.disabled = true;
    statusFormulario.textContent = idEmEdicao ? "Salvando alterações..." : "Adicionando plantão...";
    try {
      const rota = idEmEdicao ? `/plantao/${encodeURIComponent(idEmEdicao)}` : "/plantao";
      const metodo = idEmEdicao ? "PUT" : "POST";
      await window.medflowRequest(rota, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados)
      });
      limparEdicao();
      statusFormulario.textContent = "Plantão salvo na escala.";
      await carregarEscala();
    } catch (erro) {
      statusFormulario.textContent = erro.message;
    } finally {
      salvarBotao.disabled = false;
    }
  }

  async function removerPlantao(plantao) {
    const data = formatarData(plantao.data);
    const turno = turnoNomes.get(plantao.turno) || plantao.turno;
    if (!window.confirm(`Remover o plantão de ${data} (${turno})?`)) {
      return;
    }

    statusEscala.textContent = "Removendo plantão...";
    try {
      await window.medflowRequest(`/plantao/${encodeURIComponent(plantao.id)}`, {
        method: "DELETE"
      });
      if (idEmEdicao === plantao.id) {
        limparEdicao();
      }
      await carregarEscala();
    } catch (erro) {
      statusEscala.textContent = erro.message;
    }
  }

  dataInput.value = hojeLocal();
  formulario.addEventListener("submit", salvarPlantao);
  cancelarBotao.addEventListener("click", limparEdicao);
  document.getElementById("atualizarEscala").addEventListener("click", carregarEscala);
  carregarEscala();
})();
