/**
 * Camada de armazenamento desacoplada.
 * Hoje salva localmente no aparelho (100% gratuito e instantâneo).
 * Na etapa de Nuvem (Supabase Free Tier), apenas este arquivo será expandido
 * para sincronizar automaticamente entre celular e computador.
 */

import { gerarHashPin, limparTexto } from './security.js';

const CHAVE_DADOS = 'cef_dados_escola_v1';
const CHAVE_SESSAO_LEMBRAR = 'cef_sessao_lembrar_v1';
const CHAVE_PREF_LETRA = 'cef_letra_extra_grande_v1';

const VERBAS_PADRAO = [
  { id: 'verba-pdde', nome: 'PDDE Básico', icone: 'escola', arquivada: false },
  { id: 'verba-merenda', nome: 'Merenda Escolar', icone: 'merenda', arquivada: false },
  { id: 'verba-reparos', nome: 'Pequenos Reparos', icone: 'reparo', arquivada: false },
  { id: 'verba-pedagogico', nome: 'Material Pedagógico', icone: 'livros', arquivada: false },
];

function criarExemplosIniciais() {
  const hoje = new Date();
  const formatarDia = (diasAtras) => {
    const d = new Date(hoje);
    d.setDate(d.getDate() - diasAtras);
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  return [
    {
      id: 'nota-ex-1',
      tipo: 'entrada',
      verbaId: 'verba-pdde',
      valorCentavos: 1200000, // R$ 12.000,00
      data: formatarDia(10),
      descricao: 'Repasse Semestral PDDE Básico',
      fornecedorNome: 'FNDE / Secretaria de Educação',
      temNotinha: true,
    },
    {
      id: 'nota-ex-2',
      tipo: 'entrada',
      verbaId: 'verba-merenda',
      valorCentavos: 450000, // R$ 4.500,00
      data: formatarDia(8),
      descricao: 'Verba Mensal da Merenda Escolar',
      fornecedorNome: 'Secretaria Municipal de Educação',
      temNotinha: true,
    },
    {
      id: 'nota-ex-3',
      tipo: 'entrada',
      verbaId: 'verba-reparos',
      valorCentavos: 250000, // R$ 2.500,00
      data: formatarDia(7),
      descricao: 'Verba para Manutenção e Pequenos Reparos',
      fornecedorNome: 'Caixa Escolar',
      temNotinha: true,
    },
    {
      id: 'nota-ex-4',
      tipo: 'gasto',
      verbaId: 'verba-pdde',
      valorCentavos: 84590, // R$ 845,90
      data: formatarDia(5),
      descricao: 'Compra de 20 caixas de papel sulfite A4 e cartolinas',
      fornecedorNome: 'Papelaria Central Ltda',
      temNotinha: true,
    },
    {
      id: 'nota-ex-5',
      tipo: 'gasto',
      verbaId: 'verba-merenda',
      valorCentavos: 132050, // R$ 1.320,50
      data: formatarDia(3),
      descricao: 'Frutas, legumes e verduras frescas da semana',
      fornecedorNome: 'Hortifruti Bom Preço',
      temNotinha: true,
    },
    {
      id: 'nota-ex-6',
      tipo: 'gasto',
      verbaId: 'verba-reparos',
      valorCentavos: 38000, // R$ 380,00
      data: formatarDia(1),
      descricao: 'Troca de 4 torneiras do pátio e conserto de vazamento',
      fornecedorNome: 'Sr. José — Encanador',
      temNotinha: false,
    },
  ];
}

/**
 * Carrega o estado completo da escola. Se for a primeira vez, inicializa com
 * PIN padrão "1234" (em hash SHA-256) e exemplos escolares realistas.
 */
export async function carregarEstadoEscola() {
  try {
    const salvo = localStorage.getItem(CHAVE_DADOS);
    if (salvo) {
      const dados = JSON.parse(salvo);
      if (dados && Array.isArray(dados.verbas) && Array.isArray(dados.lancamentos)) {
        return dados;
      }
    }
  } catch {
    // Se houver corrupção de JSON, recria estado limpo com segurança
  }

  const pinHashPadrao = await gerarHashPin('1234');
  const estadoInicial = {
    escola: {
      nome: 'E.M. Prof. Maria Helena',
      pinHash: pinHashPadrao,
      usandoPinPadrao: true,
    },
    modoDemonstracao: true,
    verbas: structuredClone(VERBAS_PADRAO),
    lancamentos: criarExemplosIniciais(),
    fornecedores: [
      { id: 'forn-1', nome: 'Papelaria Central Ltda', telefone: '(11) 99999-1111', observacao: 'Material de expediente' },
      { id: 'forn-2', nome: 'Hortifruti Bom Preço', telefone: '(11) 98888-2222', observacao: 'Merenda semanal' },
      { id: 'forn-3', nome: 'Sr. José — Encanador', telefone: '(11) 97777-3333', observacao: 'Pequenos reparos hidráulicos' },
    ],
  };

  salvarEstadoEscola(estadoInicial);
  return estadoInicial;
}

export function salvarEstadoEscola(estado) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(CHAVE_DADOS, JSON.stringify(estado));
  }
}

export function adicionarNovaVerba(estado, nome, icone) {
  const nomeLimpo = limparTexto(nome, 40);
  if (!nomeLimpo) {
    throw new Error('Digite um nome para a nova verba.');
  }

  const jaExiste = estado.verbas.some(
    (v) => v.nome.toLowerCase() === nomeLimpo.toLowerCase() && !v.arquivada
  );
  if (jaExiste) {
    throw new Error('Já existe uma verba com esse nome.');
  }

  const novaVerba = {
    id: `verba-${Date.now()}`,
    nome: nomeLimpo,
    icone: icone || 'verba',
    arquivada: false,
  };

  estado.verbas.push(novaVerba);
  salvarEstadoEscola(estado);
  return novaVerba;
}

/**
 * Edita o nome e o ícone de uma verba existente (inclusive as pré-definidas).
 */
export function editarVerba(estado, verbaId, { nome, icone }) {
  const verba = estado.verbas.find((v) => v.id === verbaId);
  if (!verba) {
    throw new Error('Verba não encontrada.');
  }

  const nomeLimpo = limparTexto(nome, 40);
  if (!nomeLimpo) {
    throw new Error('Digite um nome válido para a verba.');
  }

  const jaExiste = estado.verbas.some(
    (v) => v.id !== verbaId && !v.arquivada && v.nome.toLowerCase() === nomeLimpo.toLowerCase()
  );
  if (jaExiste) {
    throw new Error('Já existe outra verba com esse nome.');
  }

  verba.nome = nomeLimpo;
  if (icone) {
    verba.icone = icone;
  }

  salvarEstadoEscola(estado);
  return verba;
}

/**
 * Remove uma verba se estiver vazia, ou arquiva se já possuir notas lançadas
 * (protegendo o histórico financeiro da escola).
 */
export function removerOuArquivarVerba(estado, verbaId) {
  const verbasAtivas = estado.verbas.filter((v) => !v.arquivada);
  if (verbasAtivas.length <= 1) {
    throw new Error('A escola precisa ter pelo menos 1 verba ativa.');
  }

  const indice = estado.verbas.findIndex((v) => v.id === verbaId);
  if (indice === -1) {
    throw new Error('Verba não encontrada.');
  }

  const temNotas = estado.lancamentos.some((n) => n.verbaId === verbaId);
  if (temNotas) {
    estado.verbas[indice].arquivada = true;
    salvarEstadoEscola(estado);
    return { acao: 'arquivada' };
  }

  estado.verbas.splice(indice, 1);
  salvarEstadoEscola(estado);
  return { acao: 'excluida' };
}

/**
 * Adiciona um novo fornecedor ou prestador de serviço.
 */
export function adicionarFornecedor(estado, { nome, telefone, observacao }) {
  const nomeLimpo = limparTexto(nome, 80);
  if (!nomeLimpo) {
    throw new Error('Digite o nome do fornecedor ou prestador.');
  }

  const jaExiste = estado.fornecedores.some(
    (f) => f.nome.toLowerCase() === nomeLimpo.toLowerCase()
  );
  if (jaExiste) {
    throw new Error('Já existe um fornecedor com esse nome cadastrado.');
  }

  const novoFornecedor = {
    id: `forn-${Date.now()}`,
    nome: nomeLimpo,
    telefone: limparTexto(telefone || '', 25),
    observacao: limparTexto(observacao || '', 120),
  };

  estado.fornecedores.push(novoFornecedor);
  salvarEstadoEscola(estado);
  return novoFornecedor;
}

/**
 * Remove um fornecedor do cadastro.
 */
export function removerFornecedor(estado, fornecedorId) {
  const indice = estado.fornecedores.findIndex((f) => f.id === fornecedorId);
  if (indice === -1) return false;
  estado.fornecedores.splice(indice, 1);
  salvarEstadoEscola(estado);
  return true;
}

/**
 * Arquiva ou desarquiva uma verba (não apaga o histórico do dinheiro).
 */
export function alternarStatusVerba(estado, verbaId) {
  const verba = estado.verbas.find((v) => v.id === verbaId);
  if (!verba) return false;
  verba.arquivada = !verba.arquivada;
  salvarEstadoEscola(estado);
  return verba.arquivada;
}

export function limparExemplosDemonstracao(estado) {
  estado.lancamentos = [];
  estado.modoDemonstracao = false;
  salvarEstadoEscola(estado);
}

/**
 * Adiciona uma nova nota (gasto ou entrada) validando todos os campos essenciais.
 */
export function adicionarLancamento(estado, dadosNota) {
  const tipo = dadosNota.tipo === 'entrada' ? 'entrada' : 'gasto';
  const valorCentavos = Number(dadosNota.valorCentavos);

  if (!Number.isInteger(valorCentavos) || valorCentavos <= 0) {
    throw new Error('Digite um valor em reais maior que zero.');
  }

  const verbaValida = estado.verbas.some((v) => v.id === dadosNota.verbaId && !v.arquivada);
  if (!verbaValida) {
    throw new Error('Escolha uma verba válida para esta nota.');
  }

  const descricao = limparTexto(dadosNota.descricao, 140);
  if (!descricao) {
    throw new Error('Escreva ou toque no motivo desta nota.');
  }

  const data = typeof dadosNota.data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dadosNota.data)
    ? dadosNota.data
    : new Date().toISOString().slice(0, 10);

  const fornecedorNome = limparTexto(dadosNota.fornecedorNome || '', 80);

  const novaNota = {
    id: `nota-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    tipo,
    verbaId: dadosNota.verbaId,
    categoriaPdde: dadosNota.categoriaPdde || 'custeio',
    valorCentavos,
    data,
    descricao,
    fornecedorNome,
    temNotinha: Boolean(dadosNota.anexoId),
    anexoId: dadosNota.anexoId || null,
  };

  estado.lancamentos.push(novaNota);
  salvarEstadoEscola(estado);
  return novaNota;
}

/**
 * Atualiza uma nota já existente (correção de valor, data, verba, descrição, fornecedor ou foto).
 */
export function atualizarLancamento(estado, notaId, dadosAtualizados) {
  const nota = estado.lancamentos.find((item) => item.id === notaId);
  if (!nota) {
    throw new Error('Nota não encontrada para correção.');
  }

  const tipo = dadosAtualizados.tipo === 'entrada' ? 'entrada' : 'gasto';
  const valorCentavos = Number(dadosAtualizados.valorCentavos);

  if (!Number.isInteger(valorCentavos) || valorCentavos <= 0) {
    throw new Error('Digite um valor em reais maior que zero.');
  }

  const verbaValida = estado.verbas.some((v) => v.id === dadosAtualizados.verbaId && !v.arquivada);
  if (!verbaValida) {
    throw new Error('Escolha uma verba válida para esta nota.');
  }

  const descricao = limparTexto(dadosAtualizados.descricao, 140);
  if (!descricao) {
    throw new Error('Escreva ou toque no motivo desta nota.');
  }

  const data = typeof dadosAtualizados.data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dadosAtualizados.data)
    ? dadosAtualizados.data
    : nota.data;

  nota.tipo = tipo;
  nota.verbaId = dadosAtualizados.verbaId;
  nota.categoriaPdde = dadosAtualizados.categoriaPdde || nota.categoriaPdde || 'custeio';
  nota.valorCentavos = valorCentavos;
  nota.data = data;
  nota.descricao = descricao;
  nota.fornecedorNome = limparTexto(dadosAtualizados.fornecedorNome || '', 80);

  if (dadosAtualizados.anexoId !== undefined) {
    nota.anexoId = dadosAtualizados.anexoId;
    nota.temNotinha = Boolean(dadosAtualizados.anexoId);
  }

  salvarEstadoEscola(estado);
  return nota;
}

/**
 * Vincula uma foto/PDF de notinha a uma nota já existente.
 */
export function vincularNotinhaNaNota(estado, notaId, anexoId) {
  const nota = estado.lancamentos.find((item) => item.id === notaId);
  if (!nota) {
    throw new Error('Nota não encontrada.');
  }
  nota.temNotinha = true;
  nota.anexoId = anexoId;
  salvarEstadoEscola(estado);
  return nota;
}

/**
 * Remove uma nota e retorna o objeto removido (para limpeza do anexo se existir).
 */
export function removerLancamento(estado, notaId) {
  const indice = estado.lancamentos.findIndex((item) => item.id === notaId);
  if (indice === -1) return null;
  const [removida] = estado.lancamentos.splice(indice, 1);
  salvarEstadoEscola(estado);
  return removida;
}

/**
 * Atualiza o nome da escola e/ou a senha de 4 números (em hash SHA-256).
 */
export async function atualizarConfiguracoesEscola(estado, { nomeEscola, novoPin }) {
  const nomeLimpo = limparTexto(nomeEscola, 80);
  if (!nomeLimpo) {
    throw new Error('Digite o nome da escola.');
  }

  estado.escola.nome = nomeLimpo;

  if (novoPin) {
    if (!/^\d{4}$/.test(novoPin)) {
      throw new Error('A nova senha precisa ter exatamente 4 números.');
    }
    estado.escola.pinHash = await gerarHashPin(novoPin);
    estado.escola.usandoPinPadrao = false;
  }

  salvarEstadoEscola(estado);
  return estado.escola;
}

export function obterSessaoLembrada() {
  return localStorage.getItem(CHAVE_SESSAO_LEMBRAR) === 'sim';
}

export function definirSessaoLembrada(lembrar) {
  if (lembrar) {
    localStorage.setItem(CHAVE_SESSAO_LEMBRAR, 'sim');
  } else {
    localStorage.removeItem(CHAVE_SESSAO_LEMBRAR);
  }
}

export function obterPreferenciaLetraMaior() {
  return localStorage.getItem(CHAVE_PREF_LETRA) === 'sim';
}

export function salvarPreferenciaLetraMaior(ativa) {
  localStorage.setItem(CHAVE_PREF_LETRA, ativa ? 'sim' : 'nao');
}
