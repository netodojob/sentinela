(() => {
  let fluxoAtual = [];
  let atualizacaoEmAndamento = false;

  const formatarHorario = (valor) => {
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) {
      return "Horário indisponível";
    }

    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short"
    }).format(data);
  };

  function formatarEspera(valor) {
    const instante = new Date(valor).getTime();
    if (!valor || Number.isNaN(instante)) {
      return "Tempo indisponível";
    }

    return `Há ${formatarDuracao(Date.now() - instante)}`;
  }

  function renderizarFluxo(fluxo) {
    fluxoAtual = Array.isArray(fluxo) ? fluxo : [];
    const busca = document.getElementById("buscaFluxo").value.trim().toLocaleLowerCase("pt-BR");
    const board = document.getElementById("fluxoBoard");
    board.replaceChildren();

    const etapas = fluxoAtual.map((etapa) => {
      const pacientes = [...(Array.isArray(etapa.pacientes) ? etapa.pacientes : [])].sort(
        (a, b) => {
          const tempoA = a.desde ? new Date(a.desde).getTime() : Number.NaN;
          const tempoB = b.desde ? new Date(b.desde).getTime() : Number.NaN;
          const validoA = Number.isFinite(tempoA);
          const validoB = Number.isFinite(tempoB);
          if (!validoA || !validoB) {
            return validoA === validoB ? 0 : validoA ? -1 : 1;
          }
          return etapa.tipo === "finalizado" ? tempoB - tempoA : tempoA - tempoB;
        }
      );
      const filtrados = pacientes.filter((paciente) =>
        String(paciente.nome || "")
          .toLocaleLowerCase("pt-BR")
          .includes(busca)
      );
      return { ...etapa, pacientes, filtrados };
    });

    etapas.forEach((etapa) => {
      const coluna = document.createElement("section");
      coluna.className = `flow-column flow-column-${etapa.tipo || "fila"}`;

      const cabecalho = document.createElement("div");
      cabecalho.className = "flow-column-heading";
      const titulo = document.createElement("h3");
      titulo.textContent = etapa.titulo;
      const total = document.createElement("span");
      total.className = "flow-count";
      total.textContent = etapa.pacientes.length;
      total.setAttribute("aria-label", `${etapa.pacientes.length} pacientes`);
      cabecalho.append(titulo, total);

      const lista = document.createElement("div");
      lista.className = "flow-patient-list";
      if (!etapa.filtrados.length) {
        const vazio = document.createElement("p");
        vazio.className = "flow-empty";
        vazio.textContent =
          busca && etapa.pacientes.length
            ? "Nenhum resultado nesta etapa."
            : "Nenhum paciente nesta etapa.";
        lista.appendChild(vazio);
      }

      etapa.filtrados.forEach((paciente) => {
        const cartao = document.createElement("article");
        cartao.className = "flow-patient";
        const nome = document.createElement("strong");
        nome.textContent = paciente.nome || "Paciente";
        const detalhe = document.createElement("span");
        detalhe.className = "flow-patient-detail";
        detalhe.textContent = paciente.detalhe || "Em atendimento";
        cartao.append(nome, detalhe);

        if (paciente.prioridade) {
          const prioridade = document.createElement("span");
          prioridade.className = `flow-priority flow-priority-${paciente.prioridade}`;
          prioridade.textContent = `Risco ${paciente.prioridade}`;
          cartao.appendChild(prioridade);
        }

        const espera = document.createElement("time");
        espera.className = "flow-wait";
        espera.dataset.since = paciente.desde || "";
        espera.dateTime = paciente.desde || "";
        espera.textContent =
          etapa.tipo === "finalizado"
            ? `Atendido às ${paciente.desde ? formatarHorario(paciente.desde) : "—"}`
            : paciente.desde
              ? etapa.tipo === "ativo"
                ? `Em atendimento ${formatarEspera(paciente.desde).replace(/^Há /, "há ")}`
                : formatarEspera(paciente.desde)
              : "Em andamento";
        cartao.appendChild(espera);
        lista.appendChild(cartao);
      });

      coluna.append(cabecalho, lista);
      board.appendChild(coluna);
    });

    mostrarResumoFluxo(etapas);
  }

  function mostrarResumoFluxo(etapas) {
    const insights = document.getElementById("resumoFluxo");
    const filas = etapas.filter((etapa) => etapa.tipo === "fila");
    const totalAguardando = filas.reduce((total, etapa) => total + etapa.pacientes.length, 0);
    const maiorEspera = filas
      .flatMap((etapa) =>
        etapa.pacientes
          .filter((paciente) => paciente.desde && !Number.isNaN(new Date(paciente.desde).getTime()))
          .map((paciente) => ({
            etapa: etapa.titulo,
            espera: Date.now() - new Date(paciente.desde).getTime()
          }))
      )
      .sort((a, b) => b.espera - a.espera)[0];
    const maiorFila = [...filas].sort((a, b) => b.pacientes.length - a.pacientes.length)[0];
    const empatadas = maiorFila
      ? filas.filter((etapa) => etapa.pacientes.length === maiorFila.pacientes.length)
      : [];
    const etapasComFila = filas.filter((etapa) => etapa.pacientes.length > 0).length;
    const textoGargalo =
      maiorFila && maiorFila.pacientes.length > 0
        ? empatadas.length > 1
          ? `Maior fila: empate entre ${empatadas.map((etapa) => etapa.titulo).join(" e ")} (${maiorFila.pacientes.length}).`
          : `Maior fila: ${maiorFila.titulo} (${maiorFila.pacientes.length}).`
        : "As filas estão vazias.";
    const textoEspera = maiorEspera
      ? `Maior espera: ${maiorEspera.etapa}, ${formatarDuracao(maiorEspera.espera)}.`
      : "Sem tempo de espera disponível.";

    insights.replaceChildren();
    [
      `${totalAguardando} paciente(s) aguardando em ${etapasComFila} etapa(s)`,
      textoGargalo,
      textoEspera
    ].forEach((texto) => {
      const item = document.createElement("p");
      item.textContent = texto;
      insights.appendChild(item);
    });
  }

  function formatarDuracao(milissegundos) {
    const minutos = Math.max(0, Math.floor(milissegundos / 60000));
    if (minutos < 1) {
      return "menos de 1 min";
    }
    if (minutos >= 24 * 60) {
      const dias = Math.floor(minutos / (24 * 60));
      const horasRestantes = Math.floor((minutos % (24 * 60)) / 60);
      const minutosRestantes = minutos % 60;
      return `${dias} d ${horasRestantes} h ${minutosRestantes} min`;
    }
    if (minutos < 60) {
      return `${minutos} min`;
    }

    const horas = Math.floor(minutos / 60);
    const minutosRestantes = minutos % 60;
    return minutosRestantes ? `${horas} h ${minutosRestantes} min` : `${horas} h`;
  }

  function atualizarTemposDeEspera() {
    document
      .querySelectorAll(".flow-column:not(.flow-column-finalizado) .flow-wait[data-since]")
      .forEach((elemento) => {
        if (elemento.dataset.since) {
          const ativo = elemento.closest(".flow-column-ativo");
          elemento.textContent = ativo
            ? `Em atendimento ${formatarEspera(elemento.dataset.since).replace(/^Há /, "há ")}`
            : formatarEspera(elemento.dataset.since);
        }
      });
    if (fluxoAtual.length) {
      const etapas = fluxoAtual.map((etapa) => ({
        ...etapa,
        pacientes: Array.isArray(etapa.pacientes) ? etapa.pacientes : []
      }));
      mostrarResumoFluxo(etapas);
    }
  }

  async function verificarServidor() {
    const status = document.getElementById("statusServidor");
    const item = document.getElementById("statusServidorItem");

    try {
      const dados = await window.medflowRequest("/health", { cache: "no-store" });
      status.textContent = dados.checks.bancoDeDados === "ok" ? "Online" : "Banco indisponível";
      item.className = dados.checks.bancoDeDados === "ok" ? "is-online" : "is-offline";
      status.title = `Verificado às ${formatarHorario(dados.timestamp)}`;
    } catch (erro) {
      status.textContent = "Offline";
      status.title = erro.message;
      item.className = "is-offline";
    }
  }

  async function carregarResumo() {
    if (atualizacaoEmAndamento) {
      return;
    }

    const status = document.getElementById("statusResumo");
    const botao = document.getElementById("atualizarResumo");
    atualizacaoEmAndamento = true;
    botao.disabled = true;
    status.textContent = "Atualizando informações...";

    try {
      const dados = await window.medflowRequest("/admin/resumo", { cache: "no-store" });

      document.getElementById("aguardandoAtendimento").textContent = dados.aguardandoAtendimento;
      document.getElementById("aguardandoMedico").textContent = dados.aguardandoMedico;
      document.getElementById("consultasHoje").textContent = dados.consultasHoje;
      document.getElementById("totalUsuarios").textContent = dados.usuarios;
      document.getElementById("pacientesNovosHoje").textContent = dados.pacientesNovosHoje;
      document.getElementById("prioritariosAguardandoMedico").textContent =
        dados.prioritariosAguardandoMedico;
      document.getElementById("statusAtendimento").textContent =
        `${dados.aguardandoAtendimento} aguardando`;
      document.getElementById("statusTriagem").textContent = dados.triagemAtiva
        ? "Triagem em andamento"
        : "Sem triagem em andamento";
      document.getElementById("statusMedico").textContent = dados.consultaAtiva
        ? "Consulta em andamento"
        : `${dados.aguardandoMedico} aguardando`;
      document.getElementById("statusAlmoxarifado").textContent = dados.estoque.zerado
        ? `${dados.estoque.zerado} medicamento(s) zerado(s)`
        : dados.estoque.baixo
          ? `${dados.estoque.baixo} com estoque baixo`
          : "Estoque normal";
      document.getElementById("statusTv").textContent = dados.chamadasRecentes.length
        ? "Chamadas registradas"
        : "Nenhuma chamada registrada";
      renderizarEstoque(dados.estoque);

      const setores = Object.entries(dados.usuariosPorSetor || {});
      document.getElementById("setoresUsuarios").textContent = setores.length
        ? `Usuários por setor: ${setores.map(([setor, quantidade]) => `${setor}: ${quantidade}`).join(" · ")}`
        : "Nenhum usuário cadastrado por setor.";
      document.getElementById("desfechosHoje").textContent =
        `Em observação: ${dados.emObservacao} · Encaminhados: ${dados.encaminhados}`;
      renderizarFluxo(dados.fluxo);
      mostrarPontosAtencao(dados);
      mostrarChamadas(dados.chamadasRecentes);

      const atualizado = new Date();
      const elementoHorario = document.getElementById("atualizadoEm");
      elementoHorario.dateTime = atualizado.toISOString();
      elementoHorario.textContent = formatarHorario(atualizado);
      status.textContent = "Informações atualizadas.";
    } catch (erro) {
      status.textContent = `${erro.message} Verifique se o servidor está funcionando e tente novamente.`;
    } finally {
      botao.disabled = false;
      atualizacaoEmAndamento = false;
    }
  }

  function renderizarEstoque(estoque) {
    const resumo = estoque || { total: 0, normal: 0, baixo: 0, zerado: 0, itensBaixos: [] };
    document.getElementById("estoqueTotal").textContent = resumo.total;
    document.getElementById("estoqueNormal").textContent = resumo.normal;
    document.getElementById("estoqueBaixo").textContent = resumo.baixo;
    document.getElementById("estoqueZerado").textContent = resumo.zerado;

    const lista = document.getElementById("itensEstoqueAtencao");
    lista.replaceChildren();
    if (!resumo.itensBaixos.length) {
      const item = document.createElement("li");
      item.textContent = resumo.total
        ? "Nenhum medicamento com estoque baixo ou zerado."
        : "Nenhum medicamento cadastrado no almoxarifado.";
      lista.append(item);
      return;
    }

    resumo.itensBaixos.forEach((medicamento) => {
      const item = document.createElement("li");
      item.className =
        medicamento.situacao === "zerado" ? "stockroom-item-empty" : "stockroom-item-low";
      const nome = document.createElement("strong");
      nome.textContent = medicamento.nome;
      const quantidade = document.createElement("span");
      quantidade.textContent =
        medicamento.situacao === "zerado"
          ? "Sem estoque"
          : `${medicamento.quantidade} ${medicamento.unidade}`;
      item.append(nome, quantidade);
      lista.append(item);
    });
  }

  function mostrarPontosAtencao(dados) {
    const lista = document.getElementById("pontosAtencao");
    const pontos = [];

    if (dados.prioritariosAguardandoMedico > 0) {
      pontos.push({
        titulo: `${dados.prioritariosAguardandoMedico} paciente(s) com risco vermelho aguardando médico`,
        classe: "attention-critical"
      });
    }
    if (dados.triagemAtiva) {
      pontos.push({
        titulo: "Existe uma triagem em andamento",
        classe: "attention-active"
      });
    }
    if (dados.consultaAtiva) {
      pontos.push({
        titulo: "Existe uma consulta em andamento",
        classe: "attention-active"
      });
    }
    if (!pontos.length) {
      pontos.push({
        titulo: "Nenhuma pendência prioritária identificada nas filas",
        classe: "attention-clear"
      });
    }

    document.getElementById("totalPontosAtencao").textContent = pontos.length;
    lista.replaceChildren();
    pontos.forEach((ponto) => {
      const item = document.createElement("li");
      item.className = ponto.classe;
      item.textContent = ponto.titulo;
      lista.appendChild(item);
    });
  }

  function mostrarChamadas(chamadas) {
    const lista = document.getElementById("chamadasRecentes");
    lista.replaceChildren();

    if (!chamadas.length) {
      const item = document.createElement("li");
      item.className = "empty-state";
      item.textContent = "Nenhuma chamada registrada.";
      lista.appendChild(item);
      return;
    }

    chamadas.forEach((chamada) => {
      const item = document.createElement("li");
      const numero = document.createElement("strong");
      const detalhe = document.createElement("span");
      numero.textContent = chamada.numero || "Chamada";
      detalhe.textContent = `${chamada.localTipo || "Local não informado"} · ${formatarHorario(chamada.horario)}`;
      item.append(numero, detalhe);
      lista.appendChild(item);
    });
  }

  document.getElementById("atualizarResumo").addEventListener("click", carregarResumo);
  document
    .getElementById("buscaFluxo")
    .addEventListener("input", () => renderizarFluxo(fluxoAtual));
  carregarResumo();
  verificarServidor();
  window.setInterval(carregarResumo, 15000);
  window.setInterval(verificarServidor, 15000);
  window.setInterval(atualizarTemposDeEspera, 30000);
})();
