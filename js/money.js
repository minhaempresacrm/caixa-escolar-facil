/**
 * Módulo de dinheiro com matemática exata em centavos inteiros.
 * Evita erros clássicos de casas decimais (ex.: 0.1 + 0.2).
 */

const formatadorBRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Converte centavos inteiros (ex.: 15050) para texto amigável (ex.: "R$ 150,50").
 * @param {number} centavos
 * @returns {string}
 */
export function formatarDinheiro(centavos) {
  const valorSeguro = Number.isFinite(centavos) ? Math.round(centavos) : 0;
  return formatadorBRL.format(valorSeguro / 100);
}

/**
 * Converte uma entrada digitada pelo usuário (ex.: "150,50" ou "1.200,00")
 * para centavos inteiros (ex.: 15050). Retorna null se for inválida.
 * @param {string|number} entrada
 * @returns {number|null}
 */
export function textoParaCentavos(entrada) {
  if (typeof entrada === 'number') {
    if (!Number.isFinite(entrada) || entrada < 0) return null;
    return Math.round(entrada * 100);
  }

  if (typeof entrada !== 'string') return null;

  const limpo = entrada
    .replace(/R\$/gi, '')
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) {
    return null;
  }

  const numero = Number(limpo);
  if (!Number.isFinite(numero) || numero < 0) return null;
  return Math.round(numero * 100);
}

/**
 * Calcula totais (entradas, gastos e saldo sobrando) a partir de uma lista de lançamentos.
 * @param {Array<{tipo: 'entrada'|'gasto', valorCentavos: number}>} lancamentos
 * @returns {{entradasCentavos: number, gastosCentavos: number, saldoCentavos: number}}
 */
export function calcularResumoFinanceiro(lancamentos) {
  let entradasCentavos = 0;
  let gastosCentavos = 0;

  for (const item of lancamentos) {
    const valor = Number.isInteger(item.valorCentavos) ? item.valorCentavos : 0;
    if (item.tipo === 'entrada') {
      entradasCentavos += valor;
    } else if (item.tipo === 'gasto') {
      gastosCentavos += valor;
    }
  }

  return {
    entradasCentavos,
    gastosCentavos,
    saldoCentavos: entradasCentavos - gastosCentavos,
  };
}

/**
 * Formata uma data ISO (YYYY-MM-DD) para o padrão brasileiro (DD/MM/AAAA).
 * @param {string} dataIso
 * @returns {string}
 */
export function formatarDataBR(dataIso) {
  if (typeof dataIso !== 'string') return '';
  const partes = dataIso.split('-');
  if (partes.length !== 3) return dataIso;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}
