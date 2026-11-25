/**
 * Controlador Principal — Caixa Escolar Fácil (Etapa 3.3)
 * - Entrada segura com PIN de 4 dígitos + personalização de Escola e Senha
 * - Resumo do Dinheiro por Verba (Todas + Abas individuais + Criar Nova Verba)
 * - Lançamento de Notas (Gastos e Entradas) com botões rápidos
 * - Cofre de Notinhas com Zoom e Câmera
 * - Filtros inteligentes e descomplicados (Ordem, Valor Mínimo, Fornecedor, Comprovante)
 * - Cadastro de Fornecedores e Prestadores com botão direto de WhatsApp
 * - Relatório completo para WhatsApp e Folha de Prestação de Contas para Impressão/PDF
 */

import {
  formatarDinheiro,
  textoParaCentavos,
  calcularResumoFinanceiro,
  formatarDataBR,
} from './money.js';
import { gerarHashPin, controleTentativas } from './security.js';
import {
  carregarEstadoEscola,
  salvarEstadoEscola,
  adicionarNovaVerba,
  adicionarLancamento,
  atualizarLancamento,
  vincularNotinhaNaNota,
  removerLancamento,
  adicionarFornecedor,
  removerFornecedor,
  atualizarConfiguracoesEscola,
  limparExemplosDemonstracao,
  obterSessaoLembrada,
  definirSessaoLembrada,
  obterPreferenciaLetraMaior,
  salvarPreferenciaLetraMaior,
} from './storage.js';
import {
  processarArquivoNotinha,
  salvarAnexo,
  obterAnexo,
  removerAnexo,
} from './attachments.js';
import {
  exportarBackupCompleto,
  lerEValidarArquivoBackup,
} from './cloud.js';
import { criarIcone } from './icons.js';

const ATALHOS_GASTO = [
  'Papelaria / Expediente',
  'Merenda / Mercado',
  'Material de Limpeza',
  'Conserto / Manutenção',
  'Água / Luz / Internet',
  'Livros / Pedagógico',
];

const ATALHOS_ENTRADA = [
  'Repasse PDDE Básico',
  'Verba da Merenda Escolar',
  'Caixa Escolar / APM',
  'Emenda Parlamentar',
];

const estadoUI = {
  dados: null,
  pinDigitado: '',
  verbaSelecionadaId: 'todas',
  telaAtual: 'resumo',
  iconeNovaVerba: 'escola',
  acaoConfirmacaoPendente: null,

  // Filtros da Tela Inicial
  painelFiltrosAberto: false,
  filtros: {
    ordem: 'recentes',
    valorMinCentavos: null,
    fornecedor: 'todos',
    comprovante: 'todos',
  },

  // Formulário da Tela 2
  formTipo: 'gasto',
  formVerbaId: null,
  anexoPendente: null,
  anexoOriginalId: null,
  notaEmEdicaoId: null,
  notaIdParaAnexoRapido: null,

  // Visualizador com zoom
  zoomAtualPercentual: 100,
};

const el = {
  avisoSistema: document.getElementById('aviso-sistema'),
  telaAcesso: document.getElementById('tela-acesso'),
  appPrincipal: document.getElementById('app-principal'),
  subtituloEscola: document.getElementById('subtitulo-escola'),
  textoDicaPin: document.getElementById('texto-dica-pin'),
  topoNomeEscola: document.getElementById('topo-nome-escola'),
  pinBolinhas: document.querySelectorAll('.pin-bolinha'),
  erroPin: document.getElementById('erro-pin'),
  chkLembrar: document.getElementById('chk-lembrar-aparelho'),
  btnAumentarLetra: document.getElementById('btn-aumentar-letra'),
  textoBtnLetra: document.getElementById('texto-btn-letra'),
  btnConfigEscola: document.getElementById('btn-config-escola'),
  btnSair: document.getElementById('btn-sair'),
  faixaExemplo: document.getElementById('faixa-exemplo'),
  btnLimparExemplos: document.getElementById('btn-limpar-exemplos'),
  listaAbasVerbas: document.getElementById('lista-abas-verbas'),
  tituloVerbaAtual: document.getElementById('titulo-verba-atual'),
  valorEntradas: document.getElementById('valor-total-entradas'),
  valorGastos: document.getElementById('valor-total-gastos'),
  valorSobrando: document.getElementById('valor-sobrando'),
  cartaoSobrando: document.getElementById('cartao-sobrando'),
  textoSituacaoSaldo: document.getElementById('texto-situacao-saldo'),
  contadorNotas: document.getElementById('contador-notas'),
  listaHistorico: document.getElementById('lista-historico'),

  // Barra de ferramentas, Filtros, WhatsApp e Impressão
  btnAlternarFiltros: document.getElementById('btn-alternar-filtros'),
  textoBtnFiltros: document.getElementById('texto-btn-filtros'),
  painelFiltros: document.getElementById('painel-filtros'),
  filtroOrdem: document.getElementById('filtro-ordem'),
  filtroValorMin: document.getElementById('filtro-valor-min'),
  filtroFornecedor: document.getElementById('filtro-fornecedor'),
  filtroComprovante: document.getElementById('filtro-comprovante'),
  btnLimparFiltros: document.getElementById('btn-limpar-filtros'),
  btnMandarWhatsapp: document.getElementById('btn-mandar-whatsapp'),
  btnImprimirRelatorio: document.getElementById('btn-imprimir-relatorio'),

  // Tela 2: Formulário de Lançamento
  formLancarNota: document.getElementById('form-lancar-nota'),
  tituloTelaLancar: document.getElementById('titulo-tela-lancar'),
  btnTipoGasto: document.getElementById('btn-tipo-gasto'),
  btnTipoEntrada: document.getElementById('btn-tipo-entrada'),
  inputValorNota: document.getElementById('input-valor-nota'),
  gradeVerbasForm: document.getElementById('grade-verbas-formulario'),
  rotuloMotivoNota: document.getElementById('rotulo-motivo-nota'),
  gradeAtalhosMotivo: document.getElementById('grade-atalhos-motivo'),
  inputDescricaoNota: document.getElementById('input-descricao-nota'),
  inputDataNota: document.getElementById('input-data-nota'),
  inputFornecedorNota: document.getElementById('input-fornecedor-nota'),
  listaSugestoesFornecedores: document.getElementById('lista-sugestoes-fornecedores'),
  btnTirarFotoCamera: document.getElementById('btn-tirar-foto-camera'),
  btnEscolherArquivo: document.getElementById('btn-escolher-arquivo'),
  inputCameraNotinha: document.getElementById('input-camera-notinha'),
  inputArquivoNotinha: document.getElementById('input-arquivo-notinha'),
  inputAnexoRapido: document.getElementById('input-anexo-rapido'),
  previewNotinhaBox: document.getElementById('preview-notinha-box'),
  previewNotinhaConteudo: document.getElementById('preview-notinha-conteudo'),
  btnZoomPreview: document.getElementById('btn-zoom-preview'),
  btnRemoverPreview: document.getElementById('btn-remover-preview'),
  btnSalvarNota: document.getElementById('btn-salvar-nota'),

  // Tela 3: Fornecedores
  listaFornecedores: document.getElementById('lista-fornecedores'),
  btnAbrirNovoFornecedor: document.getElementById('btn-abrir-novo-fornecedor'),
  modalNovoFornecedor: document.getElementById('modal-novo-fornecedor'),
  formNovoFornecedor: document.getElementById('form-novo-fornecedor'),
  inputFornNome: document.getElementById('input-forn-nome'),
  inputFornTel: document.getElementById('input-forn-tel'),
  inputFornObs: document.getElementById('input-forn-obs'),
  btnCancelarFornecedor: document.getElementById('btn-cancelar-fornecedor'),

  // Modais
  modalNovaVerba: document.getElementById('modal-nova-verba'),
  formNovaVerba: document.getElementById('form-nova-verba'),
  inputNomeVerba: document.getElementById('input-nome-verba'),
  btnCancelarVerba: document.getElementById('btn-cancelar-verba'),

  modalConfirmacao: document.getElementById('modal-confirmacao'),
  tituloConfirmacao: document.getElementById('titulo-confirmacao'),
  textoConfirmacao: document.getElementById('texto-confirmacao'),
  btnConfirmacaoNao: document.getElementById('btn-confirmacao-nao'),
  btnConfirmacaoSim: document.getElementById('btn-confirmacao-sim'),

  modalVisualizarNotinha: document.getElementById('modal-visualizar-notinha'),
  btnFecharNotinha: document.getElementById('btn-fechar-notinha'),
  controlesZoomNotinha: document.getElementById('controles-zoom-notinha'),
  btnZoomMais: document.getElementById('btn-zoom-mais'),
  btnZoomMenos: document.getElementById('btn-zoom-menos'),
  btnZoomNormal: document.getElementById('btn-zoom-normal'),
  areaImagemNotinha: document.getElementById('area-imagem-notinha'),

  modalSemNotinha: document.getElementById('modal-sem-notinha'),
  btnAlertaTirarFoto: document.getElementById('btn-alerta-tirar-foto'),
  btnAlertaSalvarSemFoto: document.getElementById('btn-alerta-salvar-sem-foto'),

  modalConfigEscola: document.getElementById('modal-config-escola'),
  formConfigEscola: document.getElementById('form-config-escola'),
  inputConfigNomeEscola: document.getElementById('input-config-nome-escola'),
  inputConfigNovoPin: document.getElementById('input-config-novo-pin'),
  inputConfigConfirmaPin: document.getElementById('input-config-confirma-pin'),
  btnCancelarConfig: document.getElementById('btn-cancelar-config'),

  // Folha de Impressão / PDF
  folhaImpressao: document.getElementById('folha-impressao'),
  relatorioNomeEscola: document.getElementById('relatorio-nome-escola'),
  relatorioNomeVerba: document.getElementById('relatorio-nome-verba'),
  relatorioDataGeracao: document.getElementById('relatorio-data-geracao'),
  relatorioTotalEntradas: document.getElementById('relatorio-total-entradas'),
  relatorioTotalGastos: document.getElementById('relatorio-total-gastos'),
  relatorioSaldoRestante: document.getElementById('relatorio-saldo-restante'),
  relatorioLinhasTabela: document.getElementById('relatorio-linhas-tabela'),
};

let timerAviso = null;

function mostrarAviso(mensagem, tipo = 'sucesso') {
  el.avisoSistema.textContent = mensagem;
  el.avisoSistema.className = 'aviso-sistema' + (tipo === 'erro' ? ' aviso-erro' : '');
  el.avisoSistema.hidden = false;

  clearTimeout(timerAviso);
  timerAviso = setTimeout(() => {
    el.avisoSistema.hidden = true;
  }, 4000);
}

function obterDataHojeIso() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/* ==========================================================================
   ACESSIBILIDADE: MODO LETRA EXTRA GRANDE
   ========================================================================== */
function aplicarPreferenciaLetra(ativa) {
  document.body.classList.toggle('letra-extra-grande', ativa);
  el.textoBtnLetra.textContent = ativa ? 'Letra Normal' : 'Letra Maior';
}

/* ==========================================================================
   TELA DE ACESSO (PIN DE 4 NÚMEROS)
   ========================================================================== */
function atualizarBolinhasPin() {
  el.pinBolinhas.forEach((bolinha, indice) => {
    bolinha.classList.toggle('preenchida', indice < estadoUI.pinDigitado.length);
  });
}

function mostrarErroPin(mensagem) {
  el.erroPin.textContent = mensagem;
  el.erroPin.hidden = false;
}

function limparErroPin() {
  el.erroPin.textContent = '';
  el.erroPin.hidden = true;
}

function atualizarDicaPinAcesso() {
  const blocoDica = el.textoDicaPin.parentElement;
  blocoDica.hidden = !estadoUI.dados.escola.usandoPinPadrao;
}

async function verificarPinCompleto() {
  const segundosBloqueio = controleTentativas.segundosRestantesBloqueio();
  if (segundosBloqueio > 0) {
    mostrarErroPin(`Muitas tentativas erradas. Aguarde ${segundosBloqueio} segundos para tentar de novo.`);
    estadoUI.pinDigitado = '';
    atualizarBolinhasPin();
    return;
  }

  const hashDigitado = await gerarHashPin(estadoUI.pinDigitado);
  if (hashDigitado === estadoUI.dados.escola.pinHash) {
    controleTentativas.limpar();
    definirSessaoLembrada(el.chkLembrar.checked);
    estadoUI.pinDigitado = '';
    atualizarBolinhasPin();
    limparErroPin();
    abrirAplicacaoPrincipal();
    mostrarAviso('Bem-vindo(a)! Sistema aberto com segurança.');
  } else {
    const resultado = controleTentativas.registrarErro();
    estadoUI.pinDigitado = '';
    atualizarBolinhasPin();

    if (resultado.bloqueadoSegundos > 0) {
      mostrarErroPin(`Senha incorreta 5 vezes. Por segurança, aguarde ${resultado.bloqueadoSegundos} segundos.`);
    } else {
      mostrarErroPin(`Senha incorreta. Tente novamente (restam ${resultado.restantesAntesBloqueio} tentativas).`);
    }
  }
}

function digitarNumeroPin(digito) {
  limparErroPin();
  if (estadoUI.pinDigitado.length >= 4) return;

  estadoUI.pinDigitado += digito;
  atualizarBolinhasPin();

  if (estadoUI.pinDigitado.length === 4) {
    setTimeout(() => {
      verificarPinCompleto();
    }, 120);
  }
}

function abrirAplicacaoPrincipal() {
  el.telaAcesso.hidden = true;
  el.appPrincipal.hidden = false;
  el.topoNomeEscola.textContent = estadoUI.dados.escola.nome;
  renderizarTudo();
}

function sairParaTelaAcesso() {
  definirSessaoLembrada(false);
  estadoUI.pinDigitado = '';
  atualizarBolinhasPin();
  limparErroPin();
  el.subtituloEscola.textContent = estadoUI.dados.escola.nome;
  atualizarDicaPinAcesso();
  el.appPrincipal.hidden = true;
  el.telaAcesso.hidden = false;
  mostrarAviso('Você saiu com segurança.');
}

/* ==========================================================================
   NAVEGAÇÃO ENTRE AS 3 TELAS PRINCIPAIS
   ========================================================================== */
function irParaTela(nomeTela) {
  estadoUI.telaAtual = nomeTela;

  const telas = {
    resumo: document.getElementById('tela-resumo'),
    lancar: document.getElementById('tela-lancar'),
    cadastros: document.getElementById('tela-cadastros'),
  };

  Object.entries(telas).forEach(([chave, secao]) => {
    secao.hidden = chave !== nomeTela;
  });

  document.querySelectorAll('.btn-menu').forEach((btn) => {
    btn.classList.toggle('ativo', btn.dataset.tela === nomeTela);
  });

  if (nomeTela === 'lancar') {
    if (!estadoUI.notaEmEdicaoId) {
      prepararFormularioNota(estadoUI.formTipo);
    }
  } else {
    estadoUI.notaEmEdicaoId = null;
    estadoUI.anexoOriginalId = null;
    if (nomeTela === 'cadastros') {
      renderizarListaFornecedores();
    }
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ==========================================================================
   TELA 1: RESUMO DO DINHEIRO, ABAS, FILTROS E HISTÓRICO
   ========================================================================== */
function renderizarAbasVerbas() {
  el.listaAbasVerbas.textContent = '';

  const criarBotaoAba = ({ id, texto, icone, ativa, ehNova = false }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'aba-verba' + (ativa ? ' ativa' : '') + (ehNova ? ' aba-nova' : '');
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', String(ativa));

    const svgIcone = criarIcone(icone, 19);
    const spanTexto = document.createElement('span');
    spanTexto.textContent = texto;

    btn.append(svgIcone, spanTexto);

    if (ehNova) {
      btn.addEventListener('click', abrirModalNovaVerba);
    } else {
      btn.addEventListener('click', () => {
        estadoUI.verbaSelecionadaId = id;
        renderizarTudo();
      });
    }

    return btn;
  };

  el.listaAbasVerbas.appendChild(
    criarBotaoAba({
      id: 'todas',
      texto: 'Todas as Verbas',
      icone: 'resumo',
      ativa: estadoUI.verbaSelecionadaId === 'todas',
    })
  );

  const verbasAtivas = estadoUI.dados.verbas.filter((v) => !v.arquivada);
  for (const verba of verbasAtivas) {
    el.listaAbasVerbas.appendChild(
      criarBotaoAba({
        id: verba.id,
        texto: verba.nome,
        icone: verba.icone || 'verba',
        ativa: estadoUI.verbaSelecionadaId === verba.id,
      })
    );
  }

  el.listaAbasVerbas.appendChild(
    criarBotaoAba({
      id: 'nova',
      texto: 'Criar Nova Verba',
      icone: 'mais',
      ativa: false,
      ehNova: true,
    })
  );
}

function atualizarOpcoesFiltroFornecedor() {
  const valorAtual = el.filtroFornecedor.value;
  el.filtroFornecedor.textContent = '';

  const optTodos = document.createElement('option');
  optTodos.value = 'todos';
  optTodos.textContent = 'Todos os fornecedores';
  el.filtroFornecedor.appendChild(optTodos);

  for (const forn of estadoUI.dados.fornecedores || []) {
    const opt = document.createElement('option');
    opt.value = forn.nome;
    opt.textContent = forn.nome;
    el.filtroFornecedor.appendChild(opt);
  }

  if (Array.from(el.filtroFornecedor.options).some((o) => o.value === valorAtual)) {
    el.filtroFornecedor.value = valorAtual;
  }
}

function obterLancamentosFiltrados() {
  let lista = estadoUI.dados.lancamentos.filter((item) => {
    // 1. Filtro de Verba da aba ativa
    if (estadoUI.verbaSelecionadaId !== 'todas' && item.verbaId !== estadoUI.verbaSelecionadaId) {
      return false;
    }

    // 2. Filtro de Valor Mínimo (apenas para gastos)
    if (estadoUI.filtros.valorMinCentavos !== null) {
      if (item.tipo !== 'gasto' || item.valorCentavos < estadoUI.filtros.valorMinCentavos) {
        return false;
      }
    }

    // 3. Filtro de Fornecedor
    if (estadoUI.filtros.fornecedor !== 'todos') {
      if (!item.fornecedorNome || item.fornecedorNome !== estadoUI.filtros.fornecedor) {
        return false;
      }
    }

    // 4. Filtro de Comprovante / Foto da Notinha
    if (estadoUI.filtros.comprovante === 'com-foto' && !item.temNotinha) {
      return false;
    }
    if (estadoUI.filtros.comprovante === 'sem-foto' && item.temNotinha) {
      return false;
    }

    return true;
  });

  // Ordenação descomplicada
  lista.sort((a, b) => {
    switch (estadoUI.filtros.ordem) {
      case 'antigas':
        return (a.data || '').localeCompare(b.data || '');
      case 'maior-valor':
        return b.valorCentavos - a.valorCentavos;
      case 'menor-valor':
        return a.valorCentavos - b.valorCentavos;
      case 'recentes':
      default:
        return (b.data || '').localeCompare(a.data || '');
    }
  });

  return lista;
}

function renderizarCartoesDinheiro(lancamentosFiltrados) {
  // O resumo geral da verba leva em conta todas as notas daquela verba (independente de filtros temporários de busca)
  const notasDaVerba = estadoUI.dados.lancamentos.filter((item) => {
    if (estadoUI.verbaSelecionadaId === 'todas') return true;
    return item.verbaId === estadoUI.verbaSelecionadaId;
  });

  const resumo = calcularResumoFinanceiro(notasDaVerba);

  if (estadoUI.verbaSelecionadaId === 'todas') {
    el.tituloVerbaAtual.textContent = 'Resumo: Todas as Verbas da Escola';
  } else {
    const verba = estadoUI.dados.verbas.find((v) => v.id === estadoUI.verbaSelecionadaId);
    el.tituloVerbaAtual.textContent = verba
      ? `Resumo da Verba: ${verba.nome}`
      : 'Resumo da Verba';
  }

  el.valorEntradas.textContent = formatarDinheiro(resumo.entradasCentavos);
  el.valorGastos.textContent = formatarDinheiro(resumo.gastosCentavos);
  el.valorSobrando.textContent = formatarDinheiro(resumo.saldoCentavos);

  const negativo = resumo.saldoCentavos < 0;
  el.cartaoSobrando.classList.toggle('saldo-negativo', negativo);

  if (negativo) {
    el.textoSituacaoSaldo.textContent = 'Atenção: os gastos passaram do dinheiro disponível nesta verba.';
  } else if (resumo.saldoCentavos === 0) {
    el.textoSituacaoSaldo.textContent = 'Saldo zerado nesta verba no momento.';
  } else {
    el.textoSituacaoSaldo.textContent = 'Saldo livre disponível para usar com segurança.';
  }
}

function renderizarHistorico(lancamentosFiltrados) {
  el.listaHistorico.textContent = '';

  const total = lancamentosFiltrados.length;
  el.contadorNotas.textContent =
    total === 1 ? '1 nota encontrada' : `${total} notas encontradas`;

  if (total === 0) {
    const vazio = document.createElement('div');
    vazio.className = 'estado-vazio';

    const titulo = document.createElement('strong');
    titulo.textContent = 'Nenhuma nota encontrada com esses filtros.';

    const sub = document.createElement('p');
    sub.textContent = 'Experimente tocar em "Limpar Filtros" ou use os botões grandes para anotar uma nova nota.';

    vazio.append(titulo, sub);
    el.listaHistorico.appendChild(vazio);
    return;
  }

  const mapaVerbas = new Map(estadoUI.dados.verbas.map((v) => [v.id, v]));

  for (const nota of lancamentosFiltrados) {
    const cartao = document.createElement('article');
    cartao.className = `cartao-nota tipo-${nota.tipo}`;

    const info = document.createElement('div');
    info.className = 'nota-info';

    const topoLinha = document.createElement('div');
    topoLinha.className = 'nota-topo-linha';

    const verba = mapaVerbas.get(nota.verbaId);
    const etiqueta = document.createElement('span');
    etiqueta.className = 'etiqueta-verba';
    etiqueta.append(
      criarIcone(verba ? verba.icone : 'verba', 15),
      document.createTextNode(verba ? verba.nome : 'Verba')
    );

    const dataSpan = document.createElement('span');
    dataSpan.className = 'nota-data';
    dataSpan.append(
      criarIcone('calendario', 15),
      document.createTextNode(formatarDataBR(nota.data))
    );

    topoLinha.append(etiqueta, dataSpan);

    const desc = document.createElement('p');
    desc.className = 'nota-descricao';
    desc.textContent = nota.descricao || 'Sem descrição';

    info.append(topoLinha, desc);

    if (nota.fornecedorNome) {
      const forn = document.createElement('p');
      forn.className = 'nota-fornecedor';
      forn.append(
        criarIcone('fornecedor', 15),
        document.createTextNode(nota.fornecedorNome)
      );
      info.appendChild(forn);
    }

    const selo = document.createElement('span');
    selo.className = nota.temNotinha
      ? 'selo-notinha selo-com-notinha'
      : 'selo-notinha selo-sem-notinha';
    selo.append(
      criarIcone(nota.temNotinha ? 'clipe' : 'alerta', 15),
      document.createTextNode(
        nota.temNotinha ? 'Comprovante anexado' : 'Pendente de foto da notinha'
      )
    );
    info.appendChild(selo);

    const acoesLinha = document.createElement('div');
    acoesLinha.className = 'nota-acoes-linha';

    if (nota.temNotinha && nota.anexoId) {
      const btnVer = document.createElement('button');
      btnVer.type = 'button';
      btnVer.className = 'btn-acao-cartao btn-acao-zoom';
      btnVer.append(criarIcone('lupa', 16), document.createTextNode('Ver Notinha (Zoom)'));
      btnVer.addEventListener('click', () => abrirNotinhaSalva(nota.anexoId));
      acoesLinha.appendChild(btnVer);
    } else if (!nota.temNotinha) {
      const btnColocarFoto = document.createElement('button');
      btnColocarFoto.type = 'button';
      btnColocarFoto.className = 'btn-acao-cartao btn-acao-zoom';
      btnColocarFoto.append(criarIcone('camera', 16), document.createTextNode('Anexar Foto Agora'));
      btnColocarFoto.addEventListener('click', () => {
        estadoUI.notaIdParaAnexoRapido = nota.id;
        el.inputAnexoRapido.value = '';
        el.inputAnexoRapido.click();
      });
      acoesLinha.appendChild(btnColocarFoto);
    }

    const btnCorrigir = document.createElement('button');
    btnCorrigir.type = 'button';
    btnCorrigir.className = 'btn-acao-cartao';
    btnCorrigir.append(criarIcone('editar', 16), document.createTextNode('Corrigir'));
    btnCorrigir.addEventListener('click', () => abrirNotaParaCorrecao(nota));
    acoesLinha.appendChild(btnCorrigir);

    const btnApagar = document.createElement('button');
    btnApagar.type = 'button';
    btnApagar.className = 'btn-acao-cartao btn-acao-apagar';
    btnApagar.append(criarIcone('lixeira', 16), document.createTextNode('Apagar'));
    btnApagar.addEventListener('click', () => {
      abrirConfirmacao(
        'Tem certeza que quer apagar esta nota?',
        `Nota: "${nota.descricao}" no valor de ${formatarDinheiro(nota.valorCentavos)}. O saldo da verba será atualizado automaticamente.`,
        async () => {
          const removida = removerLancamento(estadoUI.dados, nota.id);
          if (removida && removida.anexoId) {
            try {
              await removerAnexo(removida.anexoId);
            } catch {}
          }
          renderizarTudo();
          mostrarAviso('Nota apagada com sucesso.');
        }
      );
    });
    acoesLinha.appendChild(btnApagar);

    info.appendChild(acoesLinha);

    const blocoValor = document.createElement('div');
    blocoValor.className = 'nota-valor-bloco';

    const valorP = document.createElement('p');
    valorP.className = `nota-valor ${nota.tipo}`;
    const sinal = nota.tipo === 'gasto' ? '- ' : '+ ';
    valorP.textContent = `${sinal}${formatarDinheiro(nota.valorCentavos)}`;

    const tipoTexto = document.createElement('span');
    tipoTexto.className = 'nota-tipo-texto';
    tipoTexto.textContent = nota.tipo === 'gasto' ? 'Gasto (Saída)' : 'Dinheiro que Entrou';

    blocoValor.append(valorP, tipoTexto);

    cartao.append(info, blocoValor);
    el.listaHistorico.appendChild(cartao);
  }
}

function renderizarTudo() {
  el.faixaExemplo.hidden = !estadoUI.dados.modoDemonstracao;
  el.topoNomeEscola.textContent = estadoUI.dados.escola.nome;
  atualizarOpcoesFiltroFornecedor();
  renderizarAbasVerbas();
  const lancamentosFiltrados = obterLancamentosFiltrados();
  renderizarCartoesDinheiro(lancamentosFiltrados);
  renderizarHistorico(lancamentosFiltrados);
}

/* ==========================================================================
   TELA 2: FORMULÁRIO DE NOTAS
   ========================================================================== */
function formatarMascaraCentavos(textoBruto) {
  const apenasDigitos = String(textoBruto).replace(/\D/g, '');
  if (!apenasDigitos) return '';
  const centavos = Number(apenasDigitos);
  if (!Number.isFinite(centavos) || centavos === 0) return '';
  return (centavos / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function atualizarVisualTipoNota(tipo) {
  estadoUI.formTipo = tipo === 'entrada' ? 'entrada' : 'gasto';

  const ehGasto = estadoUI.formTipo === 'gasto';
  el.btnTipoGasto.className = 'btn-tipo' + (ehGasto ? ' ativo-gasto' : '');
  el.btnTipoEntrada.className = 'btn-tipo' + (!ehGasto ? ' ativo-entrada' : '');

  el.tituloTelaLancar.textContent = ehGasto
    ? 'Anotar um Gasto (Com Notinha)'
    : 'Colocar Dinheiro na Verba (Entrada)';

  el.rotuloMotivoNota.textContent = ehGasto
    ? '3. O que foi comprado? (Toque em uma opção ou escreva)'
    : '3. De onde veio este dinheiro? (Toque em uma opção ou escreva)';

  el.inputDescricaoNota.placeholder = ehGasto
    ? 'Ex.: Compra de papel sulfite e canetas...'
    : 'Ex.: Repasse Semestral do PDDE...';

  renderizarAtalhosMotivo();
}

function renderizarAtalhosMotivo() {
  el.gradeAtalhosMotivo.textContent = '';
  const lista = estadoUI.formTipo === 'gasto' ? ATALHOS_GASTO : ATALHOS_ENTRADA;

  for (const texto of lista) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-atalho-motivo';
    btn.textContent = texto;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-atalho-motivo').forEach((b) => b.classList.remove('ativo'));
      btn.classList.add('ativo');
      const limpo = texto.replace(/^[^\p{L}\p{N}]+/u, '').trim();
      el.inputDescricaoNota.value = limpo;
      el.inputDescricaoNota.focus();
    });
    el.gradeAtalhosMotivo.appendChild(btn);
  }
}

function renderizarVerbasFormulario() {
  el.gradeVerbasForm.textContent = '';
  const verbasAtivas = estadoUI.dados.verbas.filter((v) => !v.arquivada);

  if (!verbasAtivas.some((v) => v.id === estadoUI.formVerbaId)) {
    estadoUI.formVerbaId = verbasAtivas[0] ? verbasAtivas[0].id : null;
  }

  for (const verba of verbasAtivas) {
    const btn = document.createElement('button');
    btn.type = 'button';
    const selecionada = verba.id === estadoUI.formVerbaId;
    btn.className = 'btn-escolha-verba' + (selecionada ? ' selecionada' : '');
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', String(selecionada));
    btn.append(criarIcone(verba.icone || 'verba', 18), document.createTextNode(verba.nome));

    btn.addEventListener('click', () => {
      estadoUI.formVerbaId = verba.id;
      renderizarVerbasFormulario();
    });
    el.gradeVerbasForm.appendChild(btn);
  }
}

function atualizarSugestoesFornecedores() {
  el.listaSugestoesFornecedores.textContent = '';
  for (const forn of estadoUI.dados.fornecedores || []) {
    const opt = document.createElement('option');
    opt.value = forn.nome;
    el.listaSugestoesFornecedores.appendChild(opt);
  }
}

function renderizarPreviewNotinha() {
  el.previewNotinhaConteudo.textContent = '';
  const anexo = estadoUI.anexoPendente;

  if (!anexo) {
    el.previewNotinhaBox.hidden = true;
    return;
  }

  el.previewNotinhaBox.hidden = false;

  if (anexo.tipo === 'application/pdf') {
    const caixa = document.createElement('div');
    caixa.className = 'preview-pdf-cartao';
    caixa.textContent = `Arquivo PDF pronto: ${anexo.nomeArquivo}`;
    el.previewNotinhaConteudo.appendChild(caixa);
  } else {
    const img = document.createElement('img');
    img.src = anexo.dataUrl;
    img.alt = 'Pré-visualização da foto da notinha';
    el.previewNotinhaConteudo.appendChild(img);
  }
}

function prepararFormularioNota(tipoInicial = 'gasto') {
  estadoUI.notaEmEdicaoId = null;
  estadoUI.anexoOriginalId = null;
  el.inputValorNota.value = '';
  el.inputDescricaoNota.value = '';
  el.inputFornecedorNota.value = '';
  el.inputDataNota.value = obterDataHojeIso();
  estadoUI.anexoPendente = null;
  el.inputCameraNotinha.value = '';
  el.inputArquivoNotinha.value = '';
  el.btnSalvarNota.lastElementChild.textContent = 'SALVAR NOTA';

  if (estadoUI.verbaSelecionadaId !== 'todas') {
    estadoUI.formVerbaId = estadoUI.verbaSelecionadaId;
  }

  atualizarVisualTipoNota(tipoInicial);
  renderizarVerbasFormulario();
  atualizarSugestoesFornecedores();
  renderizarPreviewNotinha();
}

async function abrirNotaParaCorrecao(nota) {
  estadoUI.notaEmEdicaoId = nota.id;
  estadoUI.anexoOriginalId = nota.anexoId || null;
  estadoUI.formVerbaId = nota.verbaId;
  estadoUI.anexoPendente = null;

  el.inputValorNota.value = formatarMascaraCentavos(String(nota.valorCentavos));
  el.inputDescricaoNota.value = nota.descricao || '';
  el.inputFornecedorNota.value = nota.fornecedorNome || '';
  el.inputDataNota.value = nota.data || obterDataHojeIso();
  el.inputCameraNotinha.value = '';
  el.inputArquivoNotinha.value = '';

  atualizarVisualTipoNota(nota.tipo);
  el.tituloTelaLancar.textContent = 'Corrigir Nota Anotada';
  el.btnSalvarNota.lastElementChild.textContent = 'SALVAR CORREÇÃO';
  renderizarVerbasFormulario();
  atualizarSugestoesFornecedores();

  if (nota.anexoId) {
    try {
      const anexoSalvo = await obterAnexo(nota.anexoId);
      if (anexoSalvo) {
        estadoUI.anexoPendente = anexoSalvo;
      }
    } catch {
      // Se não encontrar foto local, segue sem bloquear a correção
    }
  }

  renderizarPreviewNotinha();
  irParaTela('lancar');
}

async function lidarComEscolhaDeArquivoFormulario(arquivo) {
  if (!arquivo) return;
  try {
    mostrarAviso('Preparando a foto da notinha...');
    estadoUI.anexoPendente = await processarArquivoNotinha(arquivo);
    renderizarPreviewNotinha();
    mostrarAviso('Notinha anexada com sucesso!');
  } catch (erro) {
    mostrarAviso(erro.message || 'Não foi possível ler este arquivo.', 'erro');
  }
}

async function concluirSalvamentoDaNota() {
  const valorCentavos = textoParaCentavos(el.inputValorNota.value);
  if (!valorCentavos || valorCentavos <= 0) {
    mostrarAviso('Digite o valor em reais antes de salvar.', 'erro');
    el.inputValorNota.focus();
    return;
  }

  if (!estadoUI.formVerbaId) {
    mostrarAviso('Escolha de qual verba é esta nota.', 'erro');
    return;
  }

  if (!el.inputDescricaoNota.value.trim()) {
    mostrarAviso('Escreva ou toque em um motivo para esta nota.', 'erro');
    el.inputDescricaoNota.focus();
    return;
  }

  let anexoId = null;
  let novoAnexoSalvoId = null;

  if (estadoUI.anexoPendente) {
    // Se estamos corrigindo e o anexo é exatamente o mesmo já salvo, reaproveita o ID
    if (estadoUI.notaEmEdicaoId && estadoUI.anexoPendente.id && estadoUI.anexoPendente.id === estadoUI.anexoOriginalId) {
      anexoId = estadoUI.anexoOriginalId;
    } else {
      try {
        anexoId = `anexo-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await salvarAnexo(anexoId, estadoUI.anexoPendente);
        novoAnexoSalvoId = anexoId;
      } catch (erro) {
        mostrarAviso(erro.message || 'Erro ao guardar a foto da notinha.', 'erro');
        return;
      }
    }
  }

  try {
    if (estadoUI.notaEmEdicaoId) {
      const notaCorrigida = atualizarLancamento(estadoUI.dados, estadoUI.notaEmEdicaoId, {
        tipo: estadoUI.formTipo,
        verbaId: estadoUI.formVerbaId,
        valorCentavos,
        data: el.inputDataNota.value,
        descricao: el.inputDescricaoNota.value,
        fornecedorNome: el.inputFornecedorNota.value,
        anexoId,
      });

      // Se havia uma foto antiga e o usuário removeu ou trocou, limpa do IndexedDB
      if (estadoUI.anexoOriginalId && estadoUI.anexoOriginalId !== anexoId) {
        removerAnexo(estadoUI.anexoOriginalId).catch(() => {});
      }

      estadoUI.notaEmEdicaoId = null;
      estadoUI.anexoOriginalId = null;
      estadoUI.anexoPendente = null;
      estadoUI.verbaSelecionadaId = notaCorrigida.verbaId;
      renderizarTudo();
      irParaTela('resumo');
      mostrarAviso('Correção salva com sucesso!');
    } else {
      const notaCriada = adicionarLancamento(estadoUI.dados, {
        tipo: estadoUI.formTipo,
        verbaId: estadoUI.formVerbaId,
        valorCentavos,
        data: el.inputDataNota.value,
        descricao: el.inputDescricaoNota.value,
        fornecedorNome: el.inputFornecedorNota.value,
        anexoId,
      });

      estadoUI.anexoPendente = null;
      estadoUI.verbaSelecionadaId = notaCriada.verbaId;
      renderizarTudo();
      irParaTela('resumo');
      mostrarAviso('Nota salva com sucesso!');
    }
  } catch (erro) {
    if (novoAnexoSalvoId) {
      removerAnexo(novoAnexoSalvoId).catch(() => {});
    }
    mostrarAviso(erro.message || 'Erro ao salvar a nota.', 'erro');
  }
}

/* ==========================================================================
   TELA 3: CADASTRO DE FORNECEDORES E PRESTADORES
   ========================================================================== */
function renderizarListaFornecedores() {
  el.listaFornecedores.textContent = '';
  const fornecedores = estadoUI.dados.fornecedores || [];

  if (fornecedores.length === 0) {
    const vazio = document.createElement('div');
    vazio.className = 'estado-vazio';
    vazio.style.gridColumn = '1 / -1';
    const strong = document.createElement('strong');
    strong.textContent = 'Nenhum fornecedor cadastrado ainda.';
    const p = document.createElement('p');
    p.textContent = 'Toque no botão azul acima para cadastrar a primeira loja ou prestador da escola.';
    vazio.append(strong, p);
    el.listaFornecedores.appendChild(vazio);
    return;
  }

  for (const forn of fornecedores) {
    const cartao = document.createElement('div');
    cartao.className = 'cartao-fornecedor';

    const info = document.createElement('div');

    const titulo = document.createElement('h3');
    titulo.className = 'forn-titulo';
    titulo.textContent = forn.nome;
    info.appendChild(titulo);

    if (forn.telefone) {
      const tel = document.createElement('p');
      tel.className = 'forn-detalhe';
      tel.textContent = `Telefone / WhatsApp: ${forn.telefone}`;
      info.appendChild(tel);
    }

    if (forn.observacao) {
      const obs = document.createElement('p');
      obs.className = 'forn-detalhe';
      obs.textContent = `Ramo / Observação: ${forn.observacao}`;
      info.appendChild(obs);
    }

    const acoes = document.createElement('div');
    acoes.className = 'forn-acoes';

    if (forn.telefone) {
      const apenasNumeros = forn.telefone.replace(/\D/g, '');
      if (apenasNumeros.length >= 10) {
        const ddi = apenasNumeros.length === 10 || apenasNumeros.length === 11 ? `55${apenasNumeros}` : apenasNumeros;
        const btnWhats = document.createElement('a');
        btnWhats.href = `https://wa.me/${ddi}?text=${encodeURIComponent(`Olá, aqui é da ${estadoUI.dados.escola.nome}. Gostaria de um orçamento.`)}`;
        btnWhats.target = '_blank';
        btnWhats.rel = 'noopener noreferrer';
        btnWhats.className = 'btn-acao-cartao';
        btnWhats.style.backgroundColor = '#F0FDF4';
        btnWhats.style.borderColor = '#BBF7D0';
        btnWhats.style.color = '#15803D';
        btnWhats.append(criarIcone('mensagem', 16), document.createTextNode('WhatsApp'));
        acoes.appendChild(btnWhats);
      }
    }

    const btnVerNotas = document.createElement('button');
    btnVerNotas.type = 'button';
    btnVerNotas.className = 'btn-acao-cartao';
    btnVerNotas.append(criarIcone('nota', 16), document.createTextNode('Ver Notas'));
    btnVerNotas.addEventListener('click', () => {
      estadoUI.verbaSelecionadaId = 'todas';
      estadoUI.filtros.fornecedor = forn.nome;
      el.filtroFornecedor.value = forn.nome;
      estadoUI.painelFiltrosAberto = true;
      el.painelFiltros.hidden = false;
      el.textoBtnFiltros.textContent = 'Fechar Filtros e Busca';
      irParaTela('resumo');
    });
    acoes.appendChild(btnVerNotas);

    const btnApagar = document.createElement('button');
    btnApagar.type = 'button';
    btnApagar.className = 'btn-acao-cartao btn-acao-apagar';
    btnApagar.append(criarIcone('lixeira', 16), document.createTextNode('Apagar'));
    btnApagar.addEventListener('click', () => {
      abrirConfirmacao(
        'Apagar fornecedor?',
        `Tem certeza que deseja apagar o cadastro de "${forn.nome}"? As notas já lançadas continuarão guardadas.`,
        () => {
          removerFornecedor(estadoUI.dados, forn.id);
          renderizarListaFornecedores();
          atualizarOpcoesFiltroFornecedor();
          mostrarAviso('Fornecedor removido com sucesso.');
        }
      );
    });
    acoes.appendChild(btnApagar);

    cartao.append(info, acoes);
    el.listaFornecedores.appendChild(cartao);
  }
}

/* ==========================================================================
   WHATSAPP E FOLHA DE IMPRESSÃO / PDF A4 (PRESTAÇÃO DE CONTAS)
   ========================================================================== */
function gerarTextoCompletoPrestacaoContas() {
  const nomeEscola = estadoUI.dados.escola.nome;
  const mapaVerbas = new Map(estadoUI.dados.verbas.map((v) => [v.id, v]));

  let nomeVerba = 'Todas as Verbas da Escola';
  if (estadoUI.verbaSelecionadaId !== 'todas') {
    const v = mapaVerbas.get(estadoUI.verbaSelecionadaId);
    if (v) nomeVerba = v.nome;
  }

  const notasDaVerba = estadoUI.dados.lancamentos.filter((item) => {
    if (estadoUI.verbaSelecionadaId === 'todas') return true;
    return item.verbaId === estadoUI.verbaSelecionadaId;
  });

  const resumo = calcularResumoFinanceiro(notasDaVerba);
  const dataHoje = formatarDataBR(obterDataHojeIso());

  let texto = `*PRESTAÇÃO DE CONTAS ESCOLAR*\n`;
  texto += `*Escola:* ${nomeEscola}\n`;
  texto += `*Verba:* ${nomeVerba}\n`;
  texto += `*Data:* ${dataHoje}\n\n`;

  texto += `*RESUMO DOS VALORES:*\n`;
  texto += `- Dinheiro Recebido: ${formatarDinheiro(resumo.entradasCentavos)}\n`;
  texto += `- Total Gasto em Notas: ${formatarDinheiro(resumo.gastosCentavos)}\n`;
  texto += `- *Saldo Sobrando: ${formatarDinheiro(resumo.saldoCentavos)}*\n\n`;

  const gastos = notasDaVerba
    .filter((n) => n.tipo === 'gasto')
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''));

  if (gastos.length > 0) {
    texto += `*RELAÇÃO DOS GASTOS REALIZADOS (${gastos.length} notas):*\n`;
    gastos.forEach((g, idx) => {
      const forn = g.fornecedorNome ? ` (${g.fornecedorNome})` : '';
      const foto = g.temNotinha ? ' [Notinha salva]' : ' [Sem comprovante]';
      texto += `${idx + 1}. ${formatarDataBR(g.data)} - ${formatarDinheiro(g.valorCentavos)}: ${g.descricao}${forn}${foto}\n`;
    });
  } else {
    texto += `Nenhum gasto anotado nesta verba até o momento.\n`;
  }

  return texto;
}

function abrirCompartilhamentoWhatsApp() {
  const texto = gerarTextoCompletoPrestacaoContas();
  const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  mostrarAviso('Abrindo o WhatsApp com a prestação de contas completa!');
}

function prepararFolhaDeImpressao() {
  const nomeEscola = estadoUI.dados.escola.nome;
  const mapaVerbas = new Map(estadoUI.dados.verbas.map((v) => [v.id, v]));

  let nomeVerba = 'Todas as Verbas da Escola';
  if (estadoUI.verbaSelecionadaId !== 'todas') {
    const v = mapaVerbas.get(estadoUI.verbaSelecionadaId);
    if (v) nomeVerba = v.nome;
  }

  const notasFiltradas = obterLancamentosFiltrados();
  const resumo = calcularResumoFinanceiro(notasFiltradas);

  el.relatorioNomeEscola.textContent = nomeEscola;
  el.relatorioNomeVerba.textContent = `Demonstrativo de Prestação de Contas — ${nomeVerba}`;
  el.relatorioDataGeracao.textContent = `Relatório gerado em: ${formatarDataBR(obterDataHojeIso())}`;

  el.relatorioTotalEntradas.textContent = formatarDinheiro(resumo.entradasCentavos);
  el.relatorioTotalGastos.textContent = formatarDinheiro(resumo.gastosCentavos);
  el.relatorioSaldoRestante.textContent = formatarDinheiro(resumo.saldoCentavos);

  el.relatorioLinhasTabela.textContent = '';

  for (const nota of notasFiltradas) {
    const tr = document.createElement('tr');

    const tdData = document.createElement('td');
    tdData.textContent = formatarDataBR(nota.data);

    const tdTipo = document.createElement('td');
    tdTipo.textContent = nota.tipo === 'gasto' ? 'Gasto' : 'Entrada';

    const tdDesc = document.createElement('td');
    tdDesc.textContent = nota.descricao || '-';

    const tdForn = document.createElement('td');
    tdForn.textContent = nota.fornecedorNome || '-';

    const tdFoto = document.createElement('td');
    tdFoto.textContent = nota.temNotinha ? 'Anexada' : 'Pendente';

    const tdValor = document.createElement('td');
    tdValor.style.textAlign = 'right';
    const sinal = nota.tipo === 'gasto' ? '- ' : '+ ';
    tdValor.textContent = `${sinal}${formatarDinheiro(nota.valorCentavos)}`;

    tr.append(tdData, tdTipo, tdDesc, tdForn, tdFoto, tdValor);
    el.relatorioLinhasTabela.appendChild(tr);
  }
}

function dispararImpressao() {
  prepararFolhaDeImpressao();
  window.print();
}

/* ==========================================================================
   VISUALIZADOR DE NOTINHA COM ZOOM
   ========================================================================== */
function aplicarZoomNaImagem() {
  const img = el.areaImagemNotinha.querySelector('img');
  if (!img) return;
  img.style.width = `${estadoUI.zoomAtualPercentual}%`;
}

function abrirVisualizadorDeAnexo(anexo) {
  el.areaImagemNotinha.textContent = '';
  estadoUI.zoomAtualPercentual = 100;

  if (anexo.tipo === 'application/pdf') {
    el.controlesZoomNotinha.hidden = true;
    const aviso = document.createElement('div');
    aviso.className = 'preview-pdf-cartao';
    aviso.textContent = `Comprovante em PDF: ${anexo.nomeArquivo || 'notinha.pdf'}`;

    const link = document.createElement('a');
    link.href = anexo.dataUrl;
    link.download = anexo.nomeArquivo || 'notinha.pdf';
    link.className = 'btn-primario-grande';
    link.style.marginTop = '16px';
    link.style.textDecoration = 'none';
    link.textContent = 'Abrir / Baixar PDF da Notinha';

    el.areaImagemNotinha.append(aviso, link);
  } else {
    el.controlesZoomNotinha.hidden = false;
    const img = document.createElement('img');
    img.src = anexo.dataUrl;
    img.alt = 'Foto ampliada da notinha';
    img.style.width = '100%';
    el.areaImagemNotinha.appendChild(img);
  }

  el.modalVisualizarNotinha.hidden = false;
}

async function abrirNotinhaSalva(anexoId) {
  try {
    const anexo = await obterAnexo(anexoId);
    if (!anexo) {
      mostrarAviso('Não encontramos a foto desta notinha neste aparelho.', 'erro');
      return;
    }
    abrirVisualizadorDeAnexo(anexo);
  } catch {
    mostrarAviso('Erro ao abrir a foto da notinha.', 'erro');
  }
}

/* ==========================================================================
   MODAIS AUXILIARES (NOVA VERBA, CONFIRMAÇÃO, ESCOLA E SENHA, FORNECEDOR)
   ========================================================================== */
function abrirModalNovaVerba() {
  el.inputNomeVerba.value = '';
  el.modalNovaVerba.hidden = false;
  setTimeout(() => el.inputNomeVerba.focus(), 50);
}

function fecharModalNovaVerba() {
  el.modalNovaVerba.hidden = true;
}

function abrirConfirmacao(titulo, mensagem, aoConfirmar) {
  el.tituloConfirmacao.textContent = titulo;
  el.textoConfirmacao.textContent = mensagem;
  estadoUI.acaoConfirmacaoPendente = aoConfirmar;
  el.modalConfirmacao.hidden = false;
}

function fecharConfirmacao() {
  el.modalConfirmacao.hidden = true;
  estadoUI.acaoConfirmacaoPendente = null;
}

function abrirModalConfigEscola() {
  el.inputConfigNomeEscola.value = estadoUI.dados.escola.nome;
  el.inputConfigNovoPin.value = '';
  el.inputConfigConfirmaPin.value = '';
  el.modalConfigEscola.hidden = false;
  setTimeout(() => el.inputConfigNomeEscola.focus(), 50);
}

function fecharModalConfigEscola() {
  el.modalConfigEscola.hidden = true;
}

/* ==========================================================================
   CONFIGURAÇÃO DE EVENTOS E INICIALIZAÇÃO
   ========================================================================== */
function configurarEventos() {
  // Teclado numérico do PIN
  document.querySelectorAll('.tecla-pin[data-digito]').forEach((btn) => {
    btn.addEventListener('click', () => digitarNumeroPin(btn.dataset.digito));
  });

  document.getElementById('btn-limpar-pin').addEventListener('click', () => {
    estadoUI.pinDigitado = '';
    atualizarBolinhasPin();
    limparErroPin();
  });

  document.getElementById('btn-apagar-pin').addEventListener('click', () => {
    estadoUI.pinDigitado = estadoUI.pinDigitado.slice(0, -1);
    atualizarBolinhasPin();
    limparErroPin();
  });

  document.addEventListener('keydown', (e) => {
    if (el.telaAcesso.hidden) return;
    if (/^[0-9]$/.test(e.key)) {
      digitarNumeroPin(e.key);
    } else if (e.key === 'Backspace') {
      estadoUI.pinDigitado = estadoUI.pinDigitado.slice(0, -1);
      atualizarBolinhasPin();
    }
  });

  // Botão Letra Maior
  el.btnAumentarLetra.addEventListener('click', () => {
    const novoEstado = !document.body.classList.contains('letra-extra-grande');
    aplicarPreferenciaLetra(novoEstado);
    salvarPreferenciaLetraMaior(novoEstado);
    mostrarAviso(novoEstado ? 'Letras aumentadas para facilitar a leitura!' : 'Tamanho das letras voltou ao normal.');
  });

  // Botão Escola e Senha + Cópia de Segurança
  el.btnConfigEscola.addEventListener('click', abrirModalConfigEscola);
  el.btnCancelarConfig.addEventListener('click', fecharModalConfigEscola);

  const btnBaixarBackup = document.getElementById('btn-baixar-backup');
  const btnRestaurarBackup = document.getElementById('btn-restaurar-backup');
  const inputArquivoBackup = document.getElementById('input-arquivo-backup');

  btnBaixarBackup.addEventListener('click', async () => {
    try {
      const resumo = await exportarBackupCompleto(estadoUI.dados);
      mostrarAviso(
        `Cópia de segurança guardada! (${resumo.totalNotas} notas e ${resumo.totalFotos} fotos).`
      );
    } catch {
      mostrarAviso('Não foi possível gerar a cópia de segurança.', 'erro');
    }
  });

  btnRestaurarBackup.addEventListener('click', () => {
    inputArquivoBackup.value = '';
    inputArquivoBackup.click();
  });

  inputArquivoBackup.addEventListener('change', (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    abrirConfirmacao(
      'Recuperar esta Cópia de Segurança?',
      'Os dados atuais deste aparelho serão substituídos pelos dados salvos no arquivo escolhido. Deseja continuar?',
      async () => {
        try {
          const resultado = await lerEValidarArquivoBackup(arquivo);
          estadoUI.dados = resultado.dados;
          salvarEstadoEscola(estadoUI.dados);
          estadoUI.verbaSelecionadaId = 'todas';
          el.subtituloEscola.textContent = estadoUI.dados.escola.nome;
          atualizarDicaPinAcesso();
          fecharModalConfigEscola();
          renderizarTudo();
          mostrarAviso(
            `Cópia de segurança recuperada com sucesso! (${resultado.totalFotosRestauradas} fotos restauradas).`
          );
        } catch (erro) {
          mostrarAviso(erro.message || 'Erro ao recuperar a cópia de segurança.', 'erro');
        }
      }
    );
  });

  el.formConfigEscola.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = el.inputConfigNomeEscola.value.trim();
    const novoPin = el.inputConfigNovoPin.value.trim();
    const confirmaPin = el.inputConfigConfirmaPin.value.trim();

    if (novoPin || confirmaPin) {
      if (!/^\d{4}$/.test(novoPin)) {
        mostrarAviso('A nova senha precisa ter exatamente 4 números.', 'erro');
        return;
      }
      if (novoPin !== confirmaPin) {
        mostrarAviso('As duas senhas digitadas não são iguais. Digite de novo.', 'erro');
        return;
      }
    }

    try {
      await atualizarConfiguracoesEscola(estadoUI.dados, {
        nomeEscola: nome,
        novoPin: novoPin || null,
      });
      el.subtituloEscola.textContent = estadoUI.dados.escola.nome;
      atualizarDicaPinAcesso();
      renderizarTudo();
      fecharModalConfigEscola();
      mostrarAviso(
        novoPin
          ? 'Nome da escola e nova senha de 4 números salvos com sucesso!'
          : 'Nome da escola atualizado com sucesso!'
      );
    } catch (erro) {
      mostrarAviso(erro.message || 'Não foi possível salvar as alterações.', 'erro');
    }
  });

  // Botão Sair com confirmação
  el.btnSair.addEventListener('click', () => {
    abrirConfirmacao(
      'Sair do sistema?',
      'Na próxima vez que abrir, o sistema vai pedir sua senha de 4 números novamente.',
      sairParaTelaAcesso
    );
  });

  // Menu Principal e Botões Voltar
  document.querySelectorAll('.btn-menu').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.tela === 'lancar') {
        estadoUI.formTipo = 'gasto';
      }
      irParaTela(btn.dataset.tela);
    });
  });

  document.querySelectorAll('[data-voltar]').forEach((btn) => {
    btn.addEventListener('click', () => irParaTela(btn.dataset.voltar));
  });

  // Atalhos gigantes da Tela Inicial
  document.getElementById('btn-atalho-gasto').addEventListener('click', () => {
    estadoUI.formTipo = 'gasto';
    irParaTela('lancar');
  });
  document.getElementById('btn-atalho-entrada').addEventListener('click', () => {
    estadoUI.formTipo = 'entrada';
    irParaTela('lancar');
  });

  // Limpar exemplos
  el.btnLimparExemplos.addEventListener('click', () => {
    abrirConfirmacao(
      'Limpar os exemplos de teste?',
      'Isso apaga apenas as notas de exemplo para você começar a anotar os valores reais da sua escola.',
      () => {
        limparExemplosDemonstracao(estadoUI.dados);
        estadoUI.verbaSelecionadaId = 'todas';
        renderizarTudo();
        mostrarAviso('Pronto! Os exemplos foram limpos e o caixa está zerado.');
      }
    );
  });

  // Ferramentas: Alternar Filtros, WhatsApp e Impressão
  el.btnAlternarFiltros.addEventListener('click', () => {
    estadoUI.painelFiltrosAberto = !estadoUI.painelFiltrosAberto;
    el.painelFiltros.hidden = !estadoUI.painelFiltrosAberto;
    el.textoBtnFiltros.textContent = estadoUI.painelFiltrosAberto
      ? 'Fechar Filtros e Busca'
      : 'Abrir Filtros e Busca';
  });

  el.filtroOrdem.addEventListener('change', (e) => {
    estadoUI.filtros.ordem = e.target.value;
    renderizarTudo();
  });

  el.filtroValorMin.addEventListener('input', (e) => {
    e.target.value = formatarMascaraCentavos(e.target.value);
    estadoUI.filtros.valorMinCentavos = textoParaCentavos(e.target.value);
    renderizarTudo();
  });

  el.filtroFornecedor.addEventListener('change', (e) => {
    estadoUI.filtros.fornecedor = e.target.value;
    renderizarTudo();
  });

  el.filtroComprovante.addEventListener('change', (e) => {
    estadoUI.filtros.comprovante = e.target.value;
    renderizarTudo();
  });

  el.btnLimparFiltros.addEventListener('click', () => {
    estadoUI.filtros.ordem = 'recentes';
    estadoUI.filtros.valorMinCentavos = null;
    estadoUI.filtros.fornecedor = 'todos';
    estadoUI.filtros.comprovante = 'todos';

    el.filtroOrdem.value = 'recentes';
    el.filtroValorMin.value = '';
    el.filtroFornecedor.value = 'todos';
    el.filtroComprovante.value = 'todos';

    renderizarTudo();
    mostrarAviso('Filtros limpos. Mostrando todas as notas da verba.');
  });

  el.btnMandarWhatsapp.addEventListener('click', abrirCompartilhamentoWhatsApp);
  el.btnImprimirRelatorio.addEventListener('click', dispararImpressao);

  // Tela 2: eventos do formulário
  el.btnTipoGasto.addEventListener('click', () => atualizarVisualTipoNota('gasto'));
  el.btnTipoEntrada.addEventListener('click', () => atualizarVisualTipoNota('entrada'));

  el.inputValorNota.addEventListener('input', (e) => {
    e.target.value = formatarMascaraCentavos(e.target.value);
  });

  el.btnTirarFotoCamera.addEventListener('click', () => {
    el.inputCameraNotinha.value = '';
    el.inputCameraNotinha.click();
  });

  el.btnEscolherArquivo.addEventListener('click', () => {
    el.inputArquivoNotinha.value = '';
    el.inputArquivoNotinha.click();
  });

  el.inputCameraNotinha.addEventListener('change', (e) => {
    lidarComEscolhaDeArquivoFormulario(e.target.files?.[0]);
  });

  el.inputArquivoNotinha.addEventListener('change', (e) => {
    lidarComEscolhaDeArquivoFormulario(e.target.files?.[0]);
  });

  el.btnZoomPreview.addEventListener('click', () => {
    if (estadoUI.anexoPendente) {
      abrirVisualizadorDeAnexo(estadoUI.anexoPendente);
    }
  });

  el.btnRemoverPreview.addEventListener('click', () => {
    estadoUI.anexoPendente = null;
    renderizarPreviewNotinha();
    mostrarAviso('Foto removida. Você pode escolher outra se quiser.');
  });

  el.formLancarNota.addEventListener('submit', (e) => {
    e.preventDefault();

    const valorCentavos = textoParaCentavos(el.inputValorNota.value);
    if (!valorCentavos || valorCentavos <= 0) {
      mostrarAviso('Digite o valor em reais antes de salvar.', 'erro');
      el.inputValorNota.focus();
      return;
    }

    if (!el.inputDescricaoNota.value.trim()) {
      mostrarAviso('Escreva ou toque no motivo antes de salvar.', 'erro');
      el.inputDescricaoNota.focus();
      return;
    }

    if (estadoUI.formTipo === 'gasto' && !estadoUI.anexoPendente) {
      el.modalSemNotinha.hidden = false;
      return;
    }

    concluirSalvamentoDaNota();
  });

  el.btnAlertaTirarFoto.addEventListener('click', () => {
    el.modalSemNotinha.hidden = true;
    document.getElementById('secao-anexo-formulario').scrollIntoView({ behavior: 'smooth' });
  });

  el.btnAlertaSalvarSemFoto.addEventListener('click', () => {
    el.modalSemNotinha.hidden = true;
    concluirSalvamentoDaNota();
  });

  // Anexo rápido direto de uma nota sem foto na Tela 1
  el.inputAnexoRapido.addEventListener('change', async (e) => {
    const arquivo = e.target.files?.[0];
    const notaId = estadoUI.notaIdParaAnexoRapido;
    estadoUI.notaIdParaAnexoRapido = null;
    if (!arquivo || !notaId) return;

    try {
      mostrarAviso('Guardando foto da notinha...');
      const processado = await processarArquivoNotinha(arquivo);
      const anexoId = `anexo-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await salvarAnexo(anexoId, processado);
      vincularNotinhaNaNota(estadoUI.dados, notaId, anexoId);
      renderizarTudo();
      mostrarAviso('Foto da notinha salva com sucesso!');
    } catch (erro) {
      mostrarAviso(erro.message || 'Erro ao salvar a foto da notinha.', 'erro');
    }
  });

  // Tela 3: Cadastro de Fornecedor
  el.btnAbrirNovoFornecedor.addEventListener('click', () => {
    el.inputFornNome.value = '';
    el.inputFornTel.value = '';
    el.inputFornObs.value = '';
    el.modalNovoFornecedor.hidden = false;
    setTimeout(() => el.inputFornNome.focus(), 50);
  });

  el.btnCancelarFornecedor.addEventListener('click', () => {
    el.modalNovoFornecedor.hidden = true;
  });

  el.formNovoFornecedor.addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      const novo = adicionarFornecedor(estadoUI.dados, {
        nome: el.inputFornNome.value,
        telefone: el.inputFornTel.value,
        observacao: el.inputFornObs.value,
      });
      el.modalNovoFornecedor.hidden = true;
      renderizarListaFornecedores();
      atualizarOpcoesFiltroFornecedor();
      mostrarAviso(`Fornecedor "${novo.nome}" cadastrado com sucesso!`);
    } catch (erro) {
      mostrarAviso(erro.message || 'Erro ao salvar o fornecedor.', 'erro');
    }
  });

  // Visualizador com Zoom
  el.btnFecharNotinha.addEventListener('click', () => {
    el.modalVisualizarNotinha.hidden = true;
  });
  el.btnZoomMais.addEventListener('click', () => {
    estadoUI.zoomAtualPercentual = Math.min(300, estadoUI.zoomAtualPercentual + 40);
    aplicarZoomNaImagem();
  });
  el.btnZoomMenos.addEventListener('click', () => {
    estadoUI.zoomAtualPercentual = Math.max(60, estadoUI.zoomAtualPercentual - 40);
    aplicarZoomNaImagem();
  });
  el.btnZoomNormal.addEventListener('click', () => {
    estadoUI.zoomAtualPercentual = 100;
    aplicarZoomNaImagem();
  });

  // Modal Nova Verba
  document.querySelectorAll('#grade-icones-verba .opcao-icone').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#grade-icones-verba .opcao-icone').forEach((b) => b.classList.remove('ativo'));
      btn.classList.add('ativo');
      estadoUI.iconeNovaVerba = btn.dataset.icone;
    });
  });

  el.btnCancelarVerba.addEventListener('click', fecharModalNovaVerba);

  el.formNovaVerba.addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      const nova = adicionarNovaVerba(
        estadoUI.dados,
        el.inputNomeVerba.value,
        estadoUI.iconeNovaVerba
      );
      estadoUI.verbaSelecionadaId = nova.id;
      fecharModalNovaVerba();
      renderizarTudo();
      mostrarAviso(`Verba "${nova.nome}" criada com sucesso!`);
    } catch (erro) {
      mostrarAviso(erro.message, 'erro');
    }
  });

  // Modal de Confirmação
  el.btnConfirmacaoNao.addEventListener('click', fecharConfirmacao);
  el.btnConfirmacaoSim.addEventListener('click', () => {
    const acao = estadoUI.acaoConfirmacaoPendente;
    fecharConfirmacao();
    if (typeof acao === 'function') acao();
  });
}

async function iniciar() {
  estadoUI.dados = await carregarEstadoEscola();
  el.subtituloEscola.textContent = estadoUI.dados.escola.nome;
  atualizarDicaPinAcesso();
  aplicarPreferenciaLetra(obterPreferenciaLetraMaior());
  configurarEventos();

  if (obterSessaoLembrada()) {
    abrirAplicacaoPrincipal();
  }

  // Registra o modo aplicativo offline (PWA) quando aberto em HTTPS ou localhost
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

iniciar();
