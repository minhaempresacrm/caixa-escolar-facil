/**
 * Cofre de Notinhas (Imagens e PDFs) usando IndexedDB nativo do navegador.
 * - 100% gratuito e funciona offline
 * - Comprime automaticamente fotos tiradas no celular para economizar espaço
 *   mantendo nitidez suficiente para leitura de CNPJ e valores no zoom
 * - Valida rigorosamente tipo e tamanho do arquivo (Segurança)
 */

import { obterSlugEscolaUrl } from './rpmaster_bridge.js';

const NOME_BANCO_BASE = 'CaixaEscolarNotinhasDB';
const VERSAO_BANCO = 1;
const STORE_ANEXOS = 'anexos';

function obterNomeBancoIsolado() {
  const slug = obterSlugEscolaUrl();
  return slug ? `CaixaEscolarNotinhasDB__${slug}` : NOME_BANCO_BASE;
}

const TIPOS_PERMITIDOS = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const TAMANHO_MAX_PDF_BYTES = 5 * 1024 * 1024; // 5 MB
const TAMANHO_MAX_IMAGEM_ORIGINAL_BYTES = 15 * 1024 * 1024; // 15 MB antes de comprimir
const LARGURA_MAX_IMAGEM = 1400;
const QUALIDADE_JPEG = 0.82;

function abrirBanco() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('Este navegador não suporta o cofre local de notinhas.'));
      return;
    }

    const req = indexedDB.open(obterNomeBancoIsolado(), VERSAO_BANCO);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_ANEXOS)) {
        db.createObjectStore(STORE_ANEXOS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Erro ao abrir o cofre de notinhas.'));
  });
}

/**
 * Valida o tipo e tamanho do arquivo enviado pelo usuário.
 * Exportada também para testes automatizados.
 * @param {{type: string, size: number}} arquivo
 */
export function validarArquivoNotinha(arquivo) {
  if (!arquivo || typeof arquivo.type !== 'string') {
    return { valido: false, erro: 'Nenhum arquivo selecionado.' };
  }

  if (!TIPOS_PERMITIDOS.has(arquivo.type)) {
    return {
      valido: false,
      erro: 'Tipo de arquivo não permitido. Escolha uma foto (JPG, PNG) ou um arquivo PDF.',
    };
  }

  if (arquivo.type === 'application/pdf' && arquivo.size > TAMANHO_MAX_PDF_BYTES) {
    return {
      valido: false,
      erro: 'Este PDF é muito grande (máximo 5 MB). Tente um arquivo menor.',
    };
  }

  if (arquivo.type.startsWith('image/') && arquivo.size > TAMANHO_MAX_IMAGEM_ORIGINAL_BYTES) {
    return {
      valido: false,
      erro: 'Esta foto é muito grande (máximo 15 MB).',
    };
  }

  return { valido: true, erro: null };
}

function lerArquivoComoDataUrl(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(new Error('Não foi possível ler o arquivo escolhido.'));
    leitor.readAsDataURL(arquivo);
  });
}

function comprimirImagemDataUrl(dataUrlOriginal) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > LARGURA_MAX_IMAGEM) {
        height = Math.round((height * LARGURA_MAX_IMAGEM) / width);
        width = LARGURA_MAX_IMAGEM;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ dataUrl: dataUrlOriginal, tipo: 'image/jpeg' });
        return;
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const comprimida = canvas.toDataURL('image/jpeg', QUALIDADE_JPEG);
      resolve({ dataUrl: comprimida, tipo: 'image/jpeg' });
    };
    img.onerror = () => reject(new Error('Não foi possível abrir a foto escolhida.'));
    img.src = dataUrlOriginal;
  });
}

/**
 * Prepara o arquivo (comprime se for imagem, mantém se for PDF) pronto para salvar.
 * @param {File} arquivo
 */
export async function processarArquivoNotinha(arquivo) {
  const validacao = validarArquivoNotinha(arquivo);
  if (!validacao.valido) {
    throw new Error(validacao.erro);
  }

  const dataUrlBruto = await lerArquivoComoDataUrl(arquivo);

  if (arquivo.type === 'application/pdf') {
    return {
      nomeArquivo: arquivo.name || 'notinha.pdf',
      tipo: 'application/pdf',
      dataUrl: dataUrlBruto,
      criadoEm: Date.now(),
    };
  }

  const { dataUrl, tipo } = await comprimirImagemDataUrl(dataUrlBruto);
  return {
    nomeArquivo: arquivo.name || 'notinha.jpg',
    tipo,
    dataUrl,
    criadoEm: Date.now(),
  };
}

export async function salvarAnexo(id, anexoProcessado) {
  const db = await abrirBanco();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ANEXOS, 'readwrite');
    tx.objectStore(STORE_ANEXOS).put({ id, ...anexoProcessado });
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error || new Error('Erro ao guardar a notinha.'));
  });
}

export async function obterAnexo(id) {
  const db = await abrirBanco();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ANEXOS, 'readonly');
    const req = tx.objectStore(STORE_ANEXOS).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error || new Error('Erro ao abrir a notinha salva.'));
  });
}

export async function removerAnexo(id) {
  const db = await abrirBanco();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ANEXOS, 'readwrite');
    tx.objectStore(STORE_ANEXOS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Erro ao apagar a notinha.'));
  });
}

export async function listarTodosAnexos() {
  const db = await abrirBanco();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ANEXOS, 'readonly');
    const req = tx.objectStore(STORE_ANEXOS).getAll();
    req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
    req.onerror = () => reject(req.error || new Error('Erro ao ler as notinhas para cópia de segurança.'));
  });
}
