(() => {
  const apiBase =
    location.protocol === "file:" ||
    ((location.hostname === "localhost" || location.hostname === "127.0.0.1") &&
      location.port !== "3000")
      ? "http://localhost:3000"
      : "";

  window.medflowRequest = async (caminho, opcoes = {}) => {
    let resposta;

    try {
      resposta = await fetch(`${apiBase}${caminho}`, opcoes);
    } catch (erro) {
      throw new Error("Não foi possível conectar ao servidor. Verifique se ele está iniciado.");
    }

    let dados;
    try {
      dados = await resposta.json();
    } catch {
      throw new Error("O servidor retornou uma resposta inválida.");
    }

    if (!resposta.ok) {
      throw new Error(dados.erro || `A solicitação falhou (${resposta.status}).`);
    }

    return dados;
  };
})();
