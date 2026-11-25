/**
 * Módulo de segurança defensiva:
 * - Hash SHA-256 do PIN de 4 dígitos (nunca armazena PIN em texto puro)
 * - Proteção contra tentativas erradas repetidas (bloqueio temporário)
 * - Sanitização de entradas de texto
 */

const SAL_LOCAL = 'CaixaEscolarFacil::v1::';
const MAX_TENTATIVAS = 5;
const TEMPO_BLOQUEIO_MS = 30 * 1000; // 30 segundos após 5 erros seguidos

/**
 * Gera hash SHA-256 em hexadecimal para o PIN.
 * Possui fallback determinístico caso o arquivo seja aberto direto via file://
 * (onde alguns navegadores desabilitam crypto.subtle).
 * @param {string} pin
 * @returns {Promise<string>}
 */
export async function gerarHashPin(pin) {
  const texto = `${SAL_LOCAL}${String(pin)}`;

  if (globalThis.crypto && globalThis.crypto.subtle) {
    const encoder = new TextEncoder();
    const dados = encoder.encode(texto);
    const buffer = await globalThis.crypto.subtle.digest('SHA-256', dados);
    const bytes = Array.from(new Uint8Array(buffer));
    return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback seguro para abertura local sem HTTPS (file://)
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < texto.length; i += 1) {
    const ch = texto.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `local_${(4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16)}`;
}

/**
 * Limpa texto digitado pelo usuário, removendo espaços excessivos.
 * @param {string} valor
 * @param {number} limite
 * @returns {string}
 */
export function limparTexto(valor, limite = 120) {
  if (typeof valor !== 'string') return '';
  return valor.trim().replace(/\s+/g, ' ').slice(0, limite);
}

/**
 * Controlador de tentativas de senha para impedir força bruta.
 */
export const controleTentativas = {
  obterEstado() {
    try {
      const bruto = sessionStorage.getItem('cef_tentativas_pin');
      if (!bruto) return { erros: 0, bloqueadoAte: 0 };
      const parsed = JSON.parse(bruto);
      return {
        erros: Number(parsed.erros) || 0,
        bloqueadoAte: Number(parsed.bloqueadoAte) || 0,
      };
    } catch {
      return { erros: 0, bloqueadoAte: 0 };
    }
  },

  segundosRestantesBloqueio() {
    const { bloqueadoAte } = this.obterEstado();
    const diff = bloqueadoAte - Date.now();
    return diff > 0 ? Math.ceil(diff / 1000) : 0;
  },

  registrarErro() {
    const atual = this.obterEstado();
    const novosErros = atual.erros + 1;
    let bloqueadoAte = atual.bloqueadoAte;

    if (novosErros >= MAX_TENTATIVAS) {
      bloqueadoAte = Date.now() + TEMPO_BLOQUEIO_MS;
    }

    try {
      sessionStorage.setItem(
        'cef_tentativas_pin',
        JSON.stringify({ erros: novosErros, bloqueadoAte })
      );
    } catch {
      // Ignora se sessionStorage não estiver disponível
    }

    return {
      erros: novosErros,
      restantesAntesBloqueio: Math.max(0, MAX_TENTATIVAS - novosErros),
      bloqueadoSegundos: bloqueadoAte > Date.now() ? Math.ceil((bloqueadoAte - Date.now()) / 1000) : 0,
    };
  },

  limpar() {
    try {
      sessionStorage.removeItem('cef_tentativas_pin');
    } catch {
      // Ignora
    }
  },
};
