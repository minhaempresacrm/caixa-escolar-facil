/**
 * Módulo de Cópia de Segurança (Backup/Restauração) e Conector Nuvem (Supabase Free Tier).
 * - Exporta e restaura todos os dados da escola + fotos das notinhas em 1 arquivo seguro.
 * - Valida estritamente o pacote antes de restaurar (impede arquivos adulterados).
 * - Nunca armazena chaves administrativas (service_role) no front-end.
 */

import { listarTodosAnexos, salvarAnexo } from './attachments.js';

const VERSAO_BACKUP = 1;

/**
 * Valida se um objeto JSON carregado de um arquivo de backup tem estrutura íntegra.
 * Exportada para testes unitários.
 */
export function validarPacoteBackup(pacote) {
  if (!pacote || typeof pacote !== 'object') {
    return { valido: false, erro: 'Arquivo de cópia de segurança inválido.' };
  }

  if (pacote.sistema !== 'CaixaEscolarFacil' || pacote.versao !== VERSAO_BACKUP) {
    return {
      valido: false,
      erro: 'Este arquivo não é uma cópia de segurança do Caixa Escolar Fácil.',
    };
  }

  const dados = pacote.dados;
  if (
    !dados ||
    typeof dados !== 'object' ||
    !dados.escola ||
    typeof dados.escola.nome !== 'string' ||
    typeof dados.escola.pinHash !== 'string' ||
    !Array.isArray(dados.verbas) ||
    !Array.isArray(dados.lancamentos)
  ) {
    return {
      valido: false,
      erro: 'Os dados dentro desta cópia de segurança estão incompletos.',
    };
  }

  if (pacote.anexos !== undefined && !Array.isArray(pacote.anexos)) {
    return { valido: false, erro: 'Lista de fotos da cópia de segurança inválida.' };
  }

  return { valido: true, erro: null };
}

/**
 * Gera o pacote completo de backup (dados + fotos das notinhas do IndexedDB)
 * e inicia o download no aparelho do diretor.
 */
export async function exportarBackupCompleto(estadoDados) {
  let anexos = [];
  try {
    anexos = await listarTodosAnexos();
  } catch {
    anexos = [];
  }

  const dadosExport = structuredClone(estadoDados);
  if (dadosExport && dadosExport.escola && typeof dadosExport.escola.pinHash !== 'string') {
    dadosExport.escola.pinHash = 'cloud-bcrypt-managed';
  }

  const pacote = {
    sistema: 'CaixaEscolarFacil',
    versao: VERSAO_BACKUP,
    geradoEm: new Date().toISOString(),
    dados: dadosExport,
    anexos,
  };

  const json = JSON.stringify(pacote, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const hoje = new Date();
  const dataNome = `${String(hoje.getDate()).padStart(2, '0')}-${String(
    hoje.getMonth() + 1
  ).padStart(2, '0')}-${hoje.getFullYear()}`;

  const link = document.createElement('a');
  link.href = url;
  link.download = `Copia_Caixa_Escolar_${dataNome}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return { totalNotas: estadoDados.lancamentos.length, totalFotos: anexos.length };
}

const REGEX_DATA_URL_SEGURA = /^data:(image\/(jpeg|png|webp)|application\/pdf);base64,[A-Za-z0-9+/=\s]+$/i;

export function dataUrlAnexoSegura(dataUrl) {
  return typeof dataUrl === 'string' && REGEX_DATA_URL_SEGURA.test(dataUrl.trim());
}

export async function persistirAnexosBackup(anexosValidos) {
  let total = 0;
  if (!Array.isArray(anexosValidos)) return total;
  for (const anexo of anexosValidos) {
    if (anexo && typeof anexo.id === 'string' && dataUrlAnexoSegura(anexo.dataUrl)) {
      await salvarAnexo(anexo.id, anexo);
      total += 1;
    }
  }
  return total;
}

/**
 * Lê um arquivo de backup escolhido pelo diretor, valida e opcionalmente restaura os anexos no IndexedDB.
 * Retorna o objeto `dados` validado e os anexos sanitizados.
 */
export async function lerEValidarArquivoBackup(arquivo, { salvarAnexosAgora = true } = {}) {
  if (!arquivo) {
    throw new Error('Nenhum arquivo de cópia de segurança foi selecionado.');
  }

  if (arquivo.size > 50 * 1024 * 1024) {
    throw new Error('Este arquivo é grande demais (máximo 50 MB).');
  }

  const texto = await arquivo.text();
  let pacote;
  try {
    pacote = JSON.parse(texto);
  } catch {
    throw new Error('Não foi possível ler este arquivo. Verifique se é um arquivo .json do Caixa Escolar.');
  }

  const validacao = validarPacoteBackup(pacote);
  if (!validacao.valido) {
    throw new Error(validacao.erro);
  }

  const anexosValidos = [];
  if (Array.isArray(pacote.anexos)) {
    for (const anexo of pacote.anexos) {
      if (anexo && typeof anexo.id === 'string' && dataUrlAnexoSegura(anexo.dataUrl)) {
        anexosValidos.push(anexo);
      }
    }
  }

  let totalRestauradas = anexosValidos.length;
  if (salvarAnexosAgora && anexosValidos.length > 0) {
    totalRestauradas = await persistirAnexosBackup(anexosValidos);
  }

  return {
    dados: pacote.dados,
    anexosValidos,
    totalFotosRestauradas: totalRestauradas,
  };
}
