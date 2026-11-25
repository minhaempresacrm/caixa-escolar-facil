/**
 * Biblioteca interna de ícones vetoriais SVG profissionais (estilo Lucide).
 * - 100% offline, leve e nítido em qualquer resolução
 * - Criado via createElementNS (seguro contra XSS, sem innerHTML)
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

const DEFINICOES_ICONES = {
  escola: [
    ['path', { d: 'M3 21h18' }],
    ['path', { d: 'M5 21V9l7-4 7 4v12' }],
    ['path', { d: 'M9 21v-6h6v6' }],
    ['path', { d: 'M12 5V2' }],
  ],
  resumo: [
    ['rect', { x: '3', y: '3', width: '7', height: '7', rx: '1' }],
    ['rect', { x: '14', y: '3', width: '7', height: '7', rx: '1' }],
    ['rect', { x: '14', y: '14', width: '7', height: '7', rx: '1' }],
    ['rect', { x: '3', y: '14', width: '7', height: '7', rx: '1' }],
  ],
  nota: [
    ['path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }],
    ['polyline', { points: '14 2 14 8 20 8' }],
    ['line', { x1: '8', y1: '13', x2: '16', y2: '13' }],
    ['line', { x1: '8', y1: '17', x2: '13', y2: '17' }],
  ],
  fornecedor: [
    ['path', { d: 'M3 9l1.5-5h15L21 9' }],
    ['path', { d: 'M3 9v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9' }],
    ['path', { d: 'M9 21v-7h6v7' }],
  ],
  mais: [
    ['line', { x1: '12', y1: '5', x2: '12', y2: '19' }],
    ['line', { x1: '5', y1: '12', x2: '19', y2: '12' }],
  ],
  menos: [
    ['line', { x1: '5', y1: '12', x2: '19', y2: '12' }],
  ],
  entrada: [
    ['line', { x1: '12', y1: '19', x2: '12', y2: '5' }],
    ['polyline', { points: '5 12 12 5 19 12' }],
  ],
  gasto: [
    ['line', { x1: '12', y1: '5', x2: '12', y2: '19' }],
    ['polyline', { points: '19 12 12 19 5 12' }],
  ],
  saldo: [
    ['rect', { x: '2', y: '5', width: '20', height: '14', rx: '2' }],
    ['line', { x1: '2', y1: '10', x2: '22', y2: '10' }],
  ],
  camera: [
    ['path', { d: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z' }],
    ['circle', { cx: '12', cy: '13', r: '4' }],
  ],
  arquivo: [
    ['path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }],
    ['polyline', { points: '17 8 12 3 7 8' }],
    ['line', { x1: '12', y1: '3', x2: '12', y2: '15' }],
  ],
  clipe: [
    ['path', { d: 'M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48' }],
  ],
  alerta: [
    ['circle', { cx: '12', cy: '12', r: '10' }],
    ['line', { x1: '12', y1: '8', x2: '12', y2: '12' }],
    ['line', { x1: '12', y1: '16', x2: '12.01', y2: '16' }],
  ],
  lupa: [
    ['circle', { cx: '11', cy: '11', r: '8' }],
    ['line', { x1: '21', y1: '21', x2: '16.65', y2: '16.65' }],
  ],
  editar: [
    ['path', { d: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' }],
    ['path', { d: 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' }],
  ],
  lixeira: [
    ['polyline', { points: '3 6 5 6 21 6' }],
    ['path', { d: 'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' }],
    ['path', { d: 'M10 11v6' }],
    ['path', { d: 'M14 11v6' }],
    ['path', { d: 'M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2' }],
  ],
  voltar: [
    ['line', { x1: '19', y1: '12', x2: '5', y2: '12' }],
    ['polyline', { points: '12 19 5 12 12 5' }],
  ],
  calendario: [
    ['rect', { x: '3', y: '4', width: '18', height: '18', rx: '2' }],
    ['line', { x1: '16', y1: '2', x2: '16', y2: '6' }],
    ['line', { x1: '8', y1: '2', x2: '8', y2: '6' }],
    ['line', { x1: '3', y1: '10', x2: '21', y2: '10' }],
  ],
  mensagem: [
    ['path', { d: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z' }],
  ],
  imprimir: [
    ['polyline', { points: '6 9 6 2 18 2 18 9' }],
    ['path', { d: 'M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2' }],
    ['rect', { x: '6', y: '14', width: '12', height: '8' }],
  ],
  verba: [
    ['path', { d: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z' }],
  ],
  merenda: [
    ['path', { d: 'M18 8h1a4 4 0 0 1 0 8h-1' }],
    ['path', { d: 'M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z' }],
    ['line', { x1: '6', y1: '1', x2: '6', y2: '4' }],
    ['line', { x1: '10', y1: '1', x2: '10', y2: '4' }],
    ['line', { x1: '14', y1: '1', x2: '14', y2: '4' }],
  ],
  reparo: [
    ['path', { d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' }],
  ],
  livros: [
    ['path', { d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20' }],
    ['path', { d: 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' }],
  ],
  telefone: [
    ['path', { d: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z' }],
  ],
};

/**
 * Normaliza ícones legados (caso existam emojis salvos no localStorage)
 * para chaves de ícones SVG limpos.
 */
export function resolverChaveIcone(valor) {
  if (typeof valor !== 'string') return 'verba';
  if (DEFINICOES_ICONES[valor]) return valor;
  if (valor.includes('🍎')) return 'merenda';
  if (valor.includes('🔨')) return 'reparo';
  if (valor.includes('📦') || valor.includes('📚')) return 'livros';
  if (valor.includes('🏫')) return 'escola';
  return 'verba';
}

/**
 * Cria um elemento <svg> seguro e nítido.
 * @param {string} nome
 * @param {number} tamanho
 */
export function criarIcone(nome, tamanho = 20) {
  const chave = resolverChaveIcone(nome);
  const formas = DEFINICOES_ICONES[chave] || DEFINICOES_ICONES.verba;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', String(tamanho));
  svg.setAttribute('height', String(tamanho));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.1');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('icone-svg');

  for (const [tag, attrs] of formas) {
    const elem = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      elem.setAttribute(k, v);
    }
    svg.appendChild(elem);
  }

  return svg;
}
