(() => {
  const consentimento = document.getElementById("aiAssistantConsent");
  const botao = document.getElementById("aiAssistantButton");
  const status = document.getElementById("aiAssistantStatus");
  const resultado = document.getElementById("aiAssistantResult");
  let triagemAtiva = null;
  let triagemAtivaId = null;
  let analisando = false;

  function atualizarBotao() {
    botao.disabled = !triagemAtiva || !consentimento.checked || analisando;
  }

  window.atualizarAssistenteClinico = (triagem) => {
    const novoId = triagem && triagem.id != null ? String(triagem.id) : null;
    if (novoId !== triagemAtivaId) {
      consentimento.checked = false;
      resultado.hidden = true;
      resultado.textContent = "";
      status.textContent = novoId
        ? "Confira o aviso e autorize o envio para solicitar a análise."
        : "Chame um paciente para habilitar a análise.";
    }
    triagemAtiva = triagem || null;
    triagemAtivaId = novoId;
    atualizarBotao();
  };

  consentimento.addEventListener("change", atualizarBotao);
  botao.addEventListener("click", async () => {
    if (!triagemAtiva || !consentimento.checked || analisando) return;

    analisando = true;
    atualizarBotao();
    resultado.hidden = true;
    status.textContent = "Analisando os dados clínicos...";

    try {
      const resposta = await window.medflowRequest("/assistente-medico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sintoma: triagemAtiva.sintoma,
          temperatura: triagemAtiva.temperatura,
          pressaoArterial: triagemAtiva.pressaoArterial,
          frequenciaCardiaca: triagemAtiva.frequenciaCardiaca,
          saturacaoOxigenio: triagemAtiva.saturacaoOxigenio,
          duracaoSintomas: triagemAtiva.duracaoSintomas,
          nivelDor: triagemAtiva.nivelDor,
          alergia: triagemAtiva.alergia,
          observacao: triagemAtiva.observacao,
          risco: triagemAtiva.risco
        })
      });

      resultado.textContent = resposta.analise;
      resultado.hidden = false;
      status.textContent =
        "Revise criticamente a resposta; ela não substitui sua avaliação clínica.";
    } catch (erro) {
      status.textContent = erro.message;
    } finally {
      analisando = false;
      atualizarBotao();
    }
  });
})();
