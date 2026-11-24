(() => {
  let usuario = null;
  try {
    usuario = JSON.parse(sessionStorage.getItem("medflowUsuario") || "null");
  } catch (erro) {
    console.error("Não foi possível validar a sessão administrativa.", erro);
  }

  if (!usuario || !["admin", "administrador"].includes(usuario.tipo)) {
    sessionStorage.removeItem("medflowUsuario");
    location.replace("index.html?area=admin");
  }
})();
