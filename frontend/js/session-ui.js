(() => {
  const nomesSetores = {
    atendimento: "Atendimento",
    triagem: "Triagem",
    medico: "Médico",
    enfermagem: "Enfermagem",
    plantao: "Plantão",
    almoxarifado: "Almoxarifado",
    admin: "Administração",
    administrador: "Administração"
  };
  const paginasPorSetor = {
    atendimento: [["atendimento.html", "Cadastro de pacientes", "🧾"]],
    triagem: [["triagem.html", "Triagem e pacientes", "🩺"]],
    medico: [
      ["medico.html", "Consultas", "🩺"],
      ["medicacoes.html", "Medicações prescritas", "💊"]
    ],
    enfermagem: [["plantao.html", "Escala de plantão", "🗓️"]],
    plantao: [["plantao.html", "Escala de plantão", "🗓️"]],
    almoxarifado: [["almoxerifato.html", "Estoque e movimentações", "📦"]],
    admin: [
      ["admin.html", "Painel administrativo", "📊"],
      ["admin-usuarios.html", "Equipe e acessos", "👥"],
      ["atendimento.html", "Cadastro de pacientes", "🧾"],
      ["triagem.html", "Triagem e pacientes", "🩺"],
      ["medico.html", "Consultas", "🩺"],
      ["medicacoes.html", "Medicações prescritas", "💊"],
      ["plantao.html", "Escala de plantão", "🗓️"],
      ["almoxerifato.html", "Almoxarifado", "📦"]
    ],
    administrador: [
      ["admin.html", "Painel administrativo", "📊"],
      ["admin-usuarios.html", "Equipe e acessos", "👥"],
      ["atendimento.html", "Cadastro de pacientes", "🧾"],
      ["triagem.html", "Triagem e pacientes", "🩺"],
      ["medico.html", "Consultas", "🩺"],
      ["medicacoes.html", "Medicações prescritas", "💊"],
      ["plantao.html", "Escala de plantão", "🗓️"],
      ["almoxerifato.html", "Almoxarifado", "📦"]
    ]
  };

  let usuario = {};
  try {
    usuario = JSON.parse(sessionStorage.getItem("medflowUsuario") || "{}");
  } catch (erro) {
    console.error("Não foi possível ler os dados da sessão.", erro);
  }

  const paginaAtual = location.pathname.split("/").pop() || "index.html";

  const setor = typeof usuario.tipo === "string" ? usuario.tipo : "";
  const nome =
    typeof usuario.nome === "string" && usuario.nome.trim()
      ? usuario.nome.trim()
      : typeof usuario.usuario === "string" && usuario.usuario.trim()
        ? usuario.usuario.trim()
        : "Usuário";
  const rotuloSetor = nomesSetores[setor] || "Equipe";
  const paginas = paginasPorSetor[setor] || [];
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const iniciais = nome
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toLocaleUpperCase("pt-BR");

  document.body.classList.add("medflow-has-nav");

  const sidebar = document.createElement("aside");
  sidebar.className = "medflow-sidebar";
  sidebar.setAttribute("aria-label", "Menu principal");

  const marca = document.createElement("a");
  marca.className = "medflow-sidebar-brand";
  marca.href = paginas.length ? paginas[0][0] : "index.html";
  const logo = document.createElement("span");
  logo.className = "medflow-sidebar-logo";
  logo.setAttribute("aria-hidden", "true");
  logo.textContent = "M";
  const marcaTexto = document.createElement("span");
  marcaTexto.className = "medflow-sidebar-brand-text";
  const hospital = document.createElement("strong");
  hospital.textContent = "MedFlow";
  const hospitalSetor = document.createElement("small");
  hospitalSetor.textContent = "Hospital";
  marcaTexto.append(hospital, hospitalSetor);
  marca.append(logo, marcaTexto);

  const rotuloMenu = document.createElement("p");
  rotuloMenu.className = "medflow-sidebar-caption";
  rotuloMenu.textContent = "MENU PRINCIPAL";
  const lista = document.createElement("nav");
  lista.className = "medflow-sidebar-links";
  lista.setAttribute("aria-label", "Páginas disponíveis");

  paginas.forEach(([href, texto, icone]) => {
    const link = document.createElement("a");
    link.className = "medflow-sidebar-link";
    link.href = href;
    link.title = texto;
    link.setAttribute("aria-label", texto);
    if (href === paginaAtual) {
      link.classList.add("is-current");
      link.setAttribute("aria-current", "page");
    }
    const simbolo = document.createElement("span");
    simbolo.className = "medflow-sidebar-icon";
    simbolo.setAttribute("aria-hidden", "true");
    simbolo.textContent = icone;
    const rotulo = document.createElement("span");
    rotulo.className = "medflow-sidebar-label";
    rotulo.textContent = texto;
    link.append(simbolo, rotulo);
    lista.append(link);
  });

  const rodapeSidebar = document.createElement("div");
  rodapeSidebar.className = "medflow-sidebar-footer";
  const indicador = document.createElement("span");
  indicador.className = "medflow-online-dot";
  indicador.setAttribute("aria-hidden", "true");
  const textoOnline = document.createElement("span");
  textoOnline.className = "medflow-sidebar-label";
  textoOnline.textContent = "Sistema hospitalar";
  rodapeSidebar.append(indicador, textoOnline);
  sidebar.append(marca, rotuloMenu, lista, rodapeSidebar);

  const topo = document.createElement("header");
  topo.className = "medflow-topbar";
  topo.setAttribute("aria-label", "Barra superior");

  const menuToggle = document.createElement("button");
  menuToggle.className = "medflow-nav-toggle";
  menuToggle.type = "button";
  menuToggle.setAttribute("aria-label", "Recolher menu lateral");
  menuToggle.setAttribute("aria-expanded", "true");
  menuToggle.textContent = "☰";

  const dataHora = document.createElement("time");
  dataHora.className = "medflow-clock";
  dataHora.setAttribute("aria-label", "Data e horário atual");
  function atualizarRelogio() {
    const agora = new Date();
    dataHora.dateTime = agora.toISOString();
    dataHora.textContent = new Intl.DateTimeFormat("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(agora);
  }
  atualizarRelogio();
  window.setInterval(atualizarRelogio, 1000);

  const perfil = document.createElement("div");
  perfil.className = "medflow-topbar-profile";
  const avatar = document.createElement("span");
  avatar.className = "medflow-avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = iniciais || "U";
  const perfilTexto = document.createElement("span");
  perfilTexto.className = "medflow-profile-copy";
  const nomeUsuario = document.createElement("strong");
  nomeUsuario.textContent = `${saudacao}, ${nome}`;
  const cargo = document.createElement("small");
  cargo.textContent = rotuloSetor;
  perfilTexto.append(nomeUsuario, cargo);
  const online = document.createElement("span");
  online.className = "medflow-profile-online";
  online.title = "Online";
  online.setAttribute("aria-label", "Usuário online");
  perfil.append(avatar, perfilTexto, online);

  const notificacoes = document.createElement("details");
  notificacoes.className = "medflow-notifications";
  const sino = document.createElement("summary");
  sino.setAttribute("aria-label", "Notificações não lidas: 0");
  sino.title = "Notificações";
  sino.append(document.createTextNode("🔔"));
  const contador = document.createElement("span");
  contador.className = "medflow-notification-count";
  contador.textContent = "0";
  sino.append(contador);
  const painelNotificacoes = document.createElement("div");
  painelNotificacoes.className = "medflow-notification-panel";
  painelNotificacoes.textContent = "Você não tem notificações novas.";
  notificacoes.append(sino, painelNotificacoes);

  const sair = document.createElement("button");
  sair.className = "medflow-logout";
  sair.type = "button";
  sair.setAttribute("aria-label", "Sair do sistema");
  sair.title = "Sair";
  sair.innerHTML =
    '<span aria-hidden="true">↪</span><span class="medflow-logout-label">Sair</span>';
  sair.addEventListener("click", () => {
    sessionStorage.removeItem("medflowUsuario");
    location.href = "index.html";
  });

  topo.append(menuToggle, dataHora, notificacoes, perfil, sair);

  const backdrop = document.createElement("button");
  backdrop.className = "medflow-sidebar-backdrop";
  backdrop.type = "button";
  backdrop.setAttribute("aria-label", "Fechar menu");

  const isMobile = () => window.matchMedia("(max-width: 760px)").matches;
  function alternarMenu() {
    if (isMobile()) {
      const aberto = document.body.classList.toggle("medflow-mobile-menu-open");
      menuToggle.setAttribute("aria-expanded", String(aberto));
      menuToggle.setAttribute("aria-label", aberto ? "Fechar menu lateral" : "Abrir menu lateral");
      return;
    }
    const recolhido = document.body.classList.toggle("medflow-menu-collapsed");
    menuToggle.setAttribute("aria-expanded", String(!recolhido));
    menuToggle.setAttribute(
      "aria-label",
      recolhido ? "Expandir menu lateral" : "Recolher menu lateral"
    );
  }
  menuToggle.addEventListener("click", alternarMenu);
  backdrop.addEventListener("click", () => {
    document.body.classList.remove("medflow-mobile-menu-open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
  lista.addEventListener("click", (evento) => {
    if (evento.target.closest("a") && isMobile()) {
      document.body.classList.remove("medflow-mobile-menu-open");
    }
  });

  document.body.prepend(sidebar, topo, backdrop);
})();
