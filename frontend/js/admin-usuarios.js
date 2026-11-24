(() => {
  const API_BASE =
    location.protocol === "file:" ||
    ((location.hostname === "localhost" || location.hostname === "127.0.0.1") &&
      location.port !== "3000")
      ? "http://localhost:3000"
      : "";

  async function requisitarJSON(caminho, opcoes = {}) {
    const resposta = await fetch(`${API_BASE}${caminho}`, opcoes);
    let dados;

    try {
      dados = await resposta.json();
    } catch {
      throw new Error("O servidor retornou uma resposta inválida.");
    }

    if (!resposta.ok) {
      throw new Error(dados.erro || "Não foi possível concluir a operação.");
    }

    return dados;
  }

  function criarCartaoUsuario(usuario) {
    const cartao = document.createElement("article");
    cartao.className = "user-item";

    const identidade = document.createElement("div");
    identidade.className = "user-identity";
    const avatar = document.createElement("span");
    avatar.className = "user-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = (usuario.usuario || "?").trim().charAt(0).toUpperCase() || "?";

    const informacoes = document.createElement("div");
    const nome = document.createElement("strong");
    nome.textContent = usuario.nome || usuario.usuario;
    const setor = document.createElement("span");
    setor.className = "user-role";
    setor.textContent = `${usuario.tipo || "Setor não informado"} · ${usuario.usuario}`;
    informacoes.append(nome, setor);
    identidade.append(avatar, informacoes);

    const botaoExcluir = document.createElement("button");
    botaoExcluir.type = "button";
    botaoExcluir.className = "delete-button";
    botaoExcluir.textContent = "Excluir";
    botaoExcluir.setAttribute("aria-label", `Excluir usuário ${usuario.usuario}`);
    botaoExcluir.addEventListener("click", () => excluirUsuario(usuario.usuario, botaoExcluir));

    cartao.append(identidade, botaoExcluir);
    return cartao;
  }

  async function carregarUsuarios() {
    const lista = document.getElementById("listaUsuarios");
    const status = document.getElementById("statusUsuarios");
    const botao = document.getElementById("atualizarUsuarios");
    botao.disabled = true;
    status.textContent = "Carregando usuários...";

    try {
      const usuarios = await requisitarJSON("/usuarios", { cache: "no-store" });
      if (!Array.isArray(usuarios)) {
        throw new Error("A lista de usuários retornada pelo servidor é inválida.");
      }

      lista.replaceChildren();
      usuarios.forEach((usuario) => lista.appendChild(criarCartaoUsuario(usuario)));
      status.textContent = usuarios.length
        ? `${usuarios.length} usuário(s) cadastrado(s).`
        : "Nenhum usuário cadastrado ainda.";
    } catch (erro) {
      status.textContent = `${erro.message} Tente atualizar a lista.`;
    } finally {
      botao.disabled = false;
    }
  }

  async function cadastrarUsuario(evento) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const botao = document.getElementById("botaoCadastrar");
    const status = document.getElementById("statusCadastro");
    const dadosUsuario = {
      nome: formulario.elements.nome.value.trim(),
      usuario: formulario.elements.usuario.value.trim(),
      senha: formulario.elements.senha.value,
      tipo: formulario.elements.tipo.value
    };

    if (!dadosUsuario.nome || !dadosUsuario.usuario || !dadosUsuario.senha || !dadosUsuario.tipo) {
      status.textContent = "Preencha nome, usuário, senha e setor.";
      return;
    }

    botao.disabled = true;
    status.textContent = "Cadastrando usuário...";

    try {
      await requisitarJSON("/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dadosUsuario)
      });
      formulario.reset();
      status.textContent = "Usuário cadastrado com sucesso.";
      await carregarUsuarios();
    } catch (erro) {
      status.textContent = erro.message;
    } finally {
      botao.disabled = false;
    }
  }

  async function excluirUsuario(usuario, botao) {
    if (!window.confirm(`Tem certeza que deseja excluir o usuário "${usuario}"?`)) {
      return;
    }

    botao.disabled = true;
    try {
      await requisitarJSON(`/usuarios/${encodeURIComponent(usuario)}`, { method: "DELETE" });
      await carregarUsuarios();
    } catch (erro) {
      document.getElementById("statusUsuarios").textContent = erro.message;
      botao.disabled = false;
    }
  }

  document.getElementById("formusuario").addEventListener("submit", cadastrarUsuario);
  document.getElementById("atualizarUsuarios").addEventListener("click", carregarUsuarios);
  carregarUsuarios();
})();
