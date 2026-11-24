(() => {
  const LIMITE_ESTOQUE_BAIXO = 10;
  const estado = { medicamentos: [], historico: [], filtro: "todos" };
  const elementos = {
    alerta: document.getElementById("alertaEstoque"),
    total: document.getElementById("totalMedicamentos"),
    normal: document.getElementById("estoqueNormal"),
    baixo: document.getElementById("estoqueBaixo"),
    zerado: document.getElementById("estoqueZerado"),
    corpo: document.getElementById("corpoEstoque"),
    busca: document.getElementById("buscaMedicamento"),
    historico: document.getElementById("historicoEntradas"),
    reposicao: document.getElementById("medicamentoReposicao"),
    contagem: document.getElementById("contagemVisivel"),
    formNovo: document.getElementById("formNovo"),
    formRepor: document.getElementById("formRepor")
  };

  function mostrarMensagem(mensagem, sucesso = false) {
    elementos.alerta.textContent = mensagem;
    elementos.alerta.classList.toggle("is-success", sucesso);
    elementos.alerta.hidden = false;
    elementos.alerta.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function limparMensagem() {
    elementos.alerta.hidden = true;
    elementos.alerta.textContent = "";
    elementos.alerta.classList.remove("is-success");
  }

  function formatarData(valor) {
    if (!valor) return "—";
    const data = new Date(valor);
    return Number.isNaN(data.getTime())
      ? "—"
      : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(data);
  }

  function situacao(quantidade) {
    if (quantidade <= 0) return { texto: "Sem estoque", classe: "badge-empty" };
    if (quantidade < LIMITE_ESTOQUE_BAIXO) return { texto: "Estoque baixo", classe: "badge-low" };
    return { texto: "Normal", classe: "badge-normal" };
  }

  function adicionarCelula(linha, conteudo, classe) {
    const celula = document.createElement("td");
    if (classe) celula.className = classe;
    if (conteudo instanceof Node) celula.append(conteudo);
    else celula.textContent = conteudo;
    linha.append(celula);
    return celula;
  }

  function renderizarEstoque() {
    const termo = elementos.busca.value.trim().toLocaleLowerCase("pt-BR");
    const medicamentos = estado.medicamentos.filter((medicamento) => {
      const texto =
        `${medicamento.nome} ${medicamento.categoria} ${medicamento.unidade}`.toLocaleLowerCase(
          "pt-BR"
        );
      const combinaBusca = texto.includes(termo);
      const combinaFiltro =
        estado.filtro === "todos" ||
        (estado.filtro === "baixo" &&
          medicamento.quantidade > 0 &&
          medicamento.quantidade < LIMITE_ESTOQUE_BAIXO) ||
        (estado.filtro === "zerado" && medicamento.quantidade <= 0);
      return combinaBusca && combinaFiltro;
    });

    elementos.corpo.replaceChildren();
    elementos.contagem.textContent = `${medicamentos.length} ${medicamentos.length === 1 ? "item" : "itens"}`;

    if (!medicamentos.length) {
      const linha = document.createElement("tr");
      adicionarCelula(
        linha,
        estado.medicamentos.length
          ? "Nenhum medicamento encontrado com esse filtro."
          : "Nenhum medicamento cadastrado.",
        "table-message"
      );
      linha.firstElementChild.colSpan = 5;
      elementos.corpo.append(linha);
      return;
    }

    medicamentos.forEach((medicamento) => {
      const linha = document.createElement("tr");
      const nome = document.createElement("span");
      nome.className = "medication-name";
      nome.textContent = medicamento.nome;
      const status = situacao(medicamento.quantidade);
      const badge = document.createElement("span");
      badge.className = `stock-badge ${status.classe}`;
      badge.textContent = status.texto;
      const nomeCelula = adicionarCelula(linha, nome);
      nomeCelula.append(badge);

      const quantidade = document.createElement("span");
      quantidade.className = "quantity";
      quantidade.append(document.createTextNode(`${medicamento.quantidade} `));
      const unidade = document.createElement("small");
      unidade.textContent = medicamento.unidade;
      quantidade.append(unidade);
      adicionarCelula(linha, quantidade);
      adicionarCelula(linha, medicamento.categoria || "Geral");
      adicionarCelula(linha, formatarData(medicamento.ultimaEntrada));

      const acao = document.createElement("button");
      acao.className = "row-action";
      acao.type = "button";
      acao.textContent = "Repor";
      acao.setAttribute("aria-label", `Repor ${medicamento.nome}`);
      acao.addEventListener("click", () => abrirReposicao(medicamento.id));
      adicionarCelula(linha, acao);
      elementos.corpo.append(linha);
    });
  }

  function renderizarResumo() {
    const quantidadeBaixa = estado.medicamentos.filter(
      (item) => item.quantidade > 0 && item.quantidade < LIMITE_ESTOQUE_BAIXO
    ).length;
    const quantidadeZerada = estado.medicamentos.filter((item) => item.quantidade <= 0).length;
    elementos.total.textContent = estado.medicamentos.length;
    elementos.normal.textContent = estado.medicamentos.length - quantidadeBaixa - quantidadeZerada;
    elementos.baixo.textContent = quantidadeBaixa;
    elementos.zerado.textContent = quantidadeZerada;
  }

  function renderizarOpcoesReposicao() {
    const selecaoAtual = elementos.reposicao.value;
    elementos.reposicao.replaceChildren();
    const inicial = document.createElement("option");
    inicial.value = "";
    inicial.textContent = "Selecione um medicamento";
    elementos.reposicao.append(inicial);
    estado.medicamentos.forEach((medicamento) => {
      const opcao = document.createElement("option");
      opcao.value = medicamento.id;
      opcao.textContent = `${medicamento.nome} — ${medicamento.quantidade} ${medicamento.unidade}`;
      elementos.reposicao.append(opcao);
    });
    if (estado.medicamentos.some((item) => String(item.id) === selecaoAtual)) {
      elementos.reposicao.value = selecaoAtual;
    }
  }

  function renderizarHistorico() {
    elementos.historico.replaceChildren();
    if (!estado.historico.length) {
      const vazio = document.createElement("p");
      vazio.className = "empty-state";
      vazio.textContent = "Nenhuma entrada registrada.";
      elementos.historico.append(vazio);
      return;
    }

    estado.historico.slice(0, 8).forEach((entrada) => {
      const item = document.createElement("article");
      item.className = "history-item";
      const dados = document.createElement("div");
      const nome = document.createElement("div");
      nome.className = "history-name";
      nome.textContent = entrada.medicamento;
      const detalhe = document.createElement("div");
      detalhe.className = "history-meta";
      detalhe.textContent = `${formatarData(entrada.data)}${entrada.observacao ? ` · ${entrada.observacao}` : ""}`;
      dados.append(nome, detalhe);
      const quantidade = document.createElement("span");
      quantidade.className = "history-quantity";
      quantidade.textContent = `+${entrada.quantidade} ${entrada.unidade}`;
      item.append(dados, quantidade);
      elementos.historico.append(item);
    });
  }

  async function carregarDados() {
    limparMensagem();
    elementos.corpo.innerHTML =
      '<tr><td class="table-message" colspan="5">Carregando estoque...</td></tr>';
    try {
      const [medicamentos, historico] = await Promise.all([
        window.medflowRequest("/estoque", { cache: "no-store" }),
        window.medflowRequest("/estoque/entradas", { cache: "no-store" })
      ]);
      if (!Array.isArray(medicamentos) || !Array.isArray(historico)) {
        throw new Error("O servidor retornou dados de estoque em formato inválido.");
      }
      estado.medicamentos = medicamentos;
      estado.historico = historico;
      renderizarResumo();
      renderizarOpcoesReposicao();
      renderizarEstoque();
      renderizarHistorico();
    } catch (erro) {
      elementos.corpo.innerHTML = "";
      const linha = document.createElement("tr");
      const celula = adicionarCelula(
        linha,
        "Não foi possível carregar o estoque.",
        "table-message"
      );
      celula.colSpan = 5;
      elementos.corpo.append(linha);
      elementos.historico.textContent = "Não foi possível carregar o histórico.";
      mostrarMensagem(erro.message);
    }
  }

  function definirAba(aba) {
    const novoAtivo = aba === "novo";
    elementos.formNovo.hidden = !novoAtivo;
    elementos.formRepor.hidden = novoAtivo;
    document.getElementById("tabNovo").classList.toggle("is-active", novoAtivo);
    document.getElementById("tabRepor").classList.toggle("is-active", !novoAtivo);
    document.getElementById("tabNovo").setAttribute("aria-selected", String(novoAtivo));
    document.getElementById("tabRepor").setAttribute("aria-selected", String(!novoAtivo));
  }

  function abrirReposicao(id) {
    definirAba("repor");
    elementos.reposicao.value = String(id);
    document.getElementById("quantidadeReposicao").focus();
    document.querySelector(".side-column").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function enviarFormulario(formulario, caminho, limpar = true) {
    limparMensagem();
    const botao = formulario.querySelector('button[type="submit"]');
    botao.disabled = true;
    try {
      const dados = Object.fromEntries(new FormData(formulario).entries());
      const resposta = await window.medflowRequest(caminho, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados)
      });
      if (limpar) formulario.reset();
      await carregarDados();
      mostrarMensagem(resposta.mensagem || "Entrada registrada com sucesso.", true);
    } catch (erro) {
      mostrarMensagem(erro.message);
    } finally {
      botao.disabled = false;
    }
  }

  elementos.formNovo.addEventListener("submit", (evento) => {
    evento.preventDefault();
    enviarFormulario(evento.currentTarget, "/estoque");
  });

  elementos.formRepor.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const medicamentoId = elementos.reposicao.value;
    if (!medicamentoId) {
      mostrarMensagem("Selecione um medicamento para registrar a reposição.");
      elementos.reposicao.focus();
      return;
    }
    enviarFormulario(
      evento.currentTarget,
      `/estoque/${encodeURIComponent(medicamentoId)}/entradas`
    );
  });

  document.getElementById("tabNovo").addEventListener("click", () => definirAba("novo"));
  document.getElementById("tabRepor").addEventListener("click", () => definirAba("repor"));
  document.getElementById("atualizarTudo").addEventListener("click", carregarDados);
  document.getElementById("atualizarHistorico").addEventListener("click", carregarDados);
  elementos.busca.addEventListener("input", renderizarEstoque);
  document.querySelectorAll(".filter-chip").forEach((botao) => {
    botao.addEventListener("click", () => {
      estado.filtro = botao.dataset.filtro;
      document.querySelectorAll(".filter-chip").forEach((item) => {
        const ativo = item === botao;
        item.classList.toggle("is-active", ativo);
        item.setAttribute("aria-pressed", String(ativo));
      });
      renderizarEstoque();
    });
  });

  carregarDados();
})();
