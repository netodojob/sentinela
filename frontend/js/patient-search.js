function normalizarBuscaPaciente(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function filtrarPacientes(pacientes, consulta) {
  const termo = normalizarBuscaPaciente(consulta);
  if (!termo) return pacientes;
  const termos = termo.split(" ");

  return pacientes.filter((paciente) => {
    const nome = normalizarBuscaPaciente(paciente.nome);
    const documento = normalizarBuscaPaciente(paciente.documento || paciente.cpf).replace(
      /[^\p{L}\p{N}]/gu,
      ""
    );
    return termos.every((parte) => nome.includes(parte) || documento.includes(parte));
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { filtrarPacientes };
} else {
  window.filtrarPacientes = filtrarPacientes;
}
