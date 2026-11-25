/**
 * Gráficos Vetoriais Profissionais em SVG (Zero dependências externas, 100% offline e seguro contra XSS).
 * - Gráfico Pizza / Rosca (Donut) simples e colorido para visualizar onde o dinheiro foi gasto
 * - Gráfico de Barras por Verba comparando dinheiro recebido vs. gasto
 */

import { formatarDinheiro } from './money.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export const PALETA_GRAFICO = [
  '#2563EB', // Azul Royal
  '#10B981', // Verde Esmeralda
  '#F59E0B', // Âmbar
  '#8B5CF6', // Violeta
  '#EC4899', // Rosa Executivo
  '#06B6D4', // Ciano
  '#64748B', // Ardósia
];

function criarElSvg(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  return el;
}

/**
 * Renderiza um Gráfico Pizza / Rosca (Donut) elegante com legenda detalhada.
 * @param {HTMLElement} container
 * @param {Array<{rotulo: string, valorCentavos: number}>} fatias
 */
export function renderizarGraficoPizza(container, fatias) {
  container.textContent = '';

  const validas = fatias
    .filter((f) => f.valorCentavos > 0)
    .sort((a, b) => b.valorCentavos - a.valorCentavos);

  const totalCentavos = validas.reduce((acc, item) => acc + item.valorCentavos, 0);

  if (totalCentavos <= 0 || validas.length === 0) {
    const vazio = document.createElement('div');
    vazio.className = 'grafico-vazio';
    vazio.textContent = 'Anote pelo menos um gasto para ver o gráfico pizza aqui.';
    container.appendChild(vazio);
    return;
  }

  const layout = document.createElement('div');
  layout.className = 'pizza-layout';

  // SVG Donut (raio 70, circunferência ~439.82)
  const tamanho = 210;
  const centro = tamanho / 2;
  const raio = 74;
  const espessura = 32;
  const circunferencia = 2 * Math.PI * raio;

  const envoltorioSvg = document.createElement('div');
  envoltorioSvg.className = 'pizza-svg-box';

  const svg = criarElSvg('svg', {
    viewBox: `0 0 ${tamanho} ${tamanho}`,
    class: 'pizza-svg',
    role: 'img',
    'aria-label': `Gráfico pizza de distribuição dos gastos. Total gasto: ${formatarDinheiro(totalCentavos)}`,
  });

  // Anel de fundo suave
  svg.appendChild(
    criarElSvg('circle', {
      cx: centro,
      cy: centro,
      r: raio,
      fill: 'none',
      stroke: '#F1F5F9',
      'stroke-width': espessura,
    })
  );

  let acumulado = 0;

  validas.forEach((fatia, indice) => {
    const cor = PALETA_GRAFICO[indice % PALETA_GRAFICO.length];
    const proporcao = fatia.valorCentavos / totalCentavos;
    const comprimentoArco = proporcao * circunferencia;
    // Pequeno espaço visual entre fatias se houver mais de 1
    const folga = validas.length > 1 ? 3 : 0;
    const dashVisivel = Math.max(2, comprimentoArco - folga);
    const offset = -acumulado * circunferencia;

    const circulo = criarElSvg('circle', {
      cx: centro,
      cy: centro,
      r: raio,
      fill: 'none',
      stroke: cor,
      'stroke-width': espessura,
      'stroke-dasharray': `${dashVisivel} ${circunferencia}`,
      'stroke-dashoffset': offset,
      transform: `rotate(-90 ${centro} ${centro})`,
      class: 'pizza-fatia',
    });

    const tituloTooltip = criarElSvg('title');
    const pct = Math.round(proporcao * 100);
    tituloTooltip.textContent = `${fatia.rotulo}: ${formatarDinheiro(fatia.valorCentavos)} (${pct}%)`;
    circulo.appendChild(tituloTooltip);

    svg.appendChild(circulo);
    acumulado += proporcao;
  });

  // Centro do Donut com Total Gasto
  const centroTexto = document.createElement('div');
  centroTexto.className = 'pizza-centro-texto';

  const labelCentro = document.createElement('span');
  labelCentro.className = 'pizza-centro-label';
  labelCentro.textContent = 'Total Gasto';

  const valorCentro = document.createElement('strong');
  valorCentro.className = 'pizza-centro-valor';
  valorCentro.textContent = formatarDinheiro(totalCentavos);

  centroTexto.append(labelCentro, valorCentro);
  envoltorioSvg.append(svg, centroTexto);

  // Legenda clara ao lado/abaixo
  const legenda = document.createElement('ul');
  legenda.className = 'pizza-legenda';

  validas.forEach((fatia, indice) => {
    const cor = PALETA_GRAFICO[indice % PALETA_GRAFICO.length];
    const pct = Math.round((fatia.valorCentavos / totalCentavos) * 100);

    const li = document.createElement('li');
    li.className = 'pizza-legenda-item';

    const esquerda = document.createElement('div');
    esquerda.className = 'pizza-legenda-esq';

    const ponto = document.createElement('span');
    ponto.className = 'pizza-legenda-cor';
    ponto.style.backgroundColor = cor;

    const nome = document.createElement('span');
    nome.className = 'pizza-legenda-nome';
    nome.textContent = fatia.rotulo;

    esquerda.append(ponto, nome);

    const direita = document.createElement('div');
    direita.className = 'pizza-legenda-dir';

    const val = document.createElement('strong');
    val.textContent = formatarDinheiro(fatia.valorCentavos);

    const badgePct = document.createElement('span');
    badgePct.className = 'pizza-legenda-pct';
    badgePct.textContent = `${pct}%`;

    direita.append(val, badgePct);
    li.append(esquerda, direita);
    legenda.appendChild(li);
  });

  layout.append(envoltorioSvg, legenda);
  container.appendChild(layout);
}

/**
 * Renderiza um gráfico de barras horizontais executivo comparando o uso de cada verba.
 * @param {HTMLElement} container
 * @param {Array<{nome: string, entradasCentavos: number, gastosCentavos: number, saldoCentavos: number}>} itensVerbas
 */
export function renderizarGraficoBarrasVerbas(container, itensVerbas) {
  container.textContent = '';

  if (!itensVerbas || itensVerbas.length === 0) {
    const vazio = document.createElement('div');
    vazio.className = 'grafico-vazio';
    vazio.textContent = 'Nenhuma verba ativa para exibir.';
    container.appendChild(vazio);
    return;
  }

  const lista = document.createElement('div');
  lista.className = 'barras-verbas-lista';

  itensVerbas.forEach((item, indice) => {
    const cor = PALETA_GRAFICO[indice % PALETA_GRAFICO.length];
    const pct = item.entradasCentavos > 0
      ? Math.min(100, Math.round((item.gastosCentavos / item.entradasCentavos) * 100))
      : (item.gastosCentavos > 0 ? 100 : 0);

    const linha = document.createElement('div');
    linha.className = 'barra-verba-item';

    const cab = document.createElement('div');
    cab.className = 'barra-verba-topo';

    const nome = document.createElement('strong');
    nome.className = 'barra-verba-nome';
    nome.textContent = item.nome;

    const numeros = document.createElement('span');
    numeros.className = 'barra-verba-numeros';
    numeros.textContent = `Gasto: ${formatarDinheiro(item.gastosCentavos)} de ${formatarDinheiro(item.entradasCentavos)} (${pct}%)`;

    cab.append(nome, numeros);

    const trilho = document.createElement('div');
    trilho.className = 'barra-verba-trilho';

    const barra = document.createElement('div');
    barra.className = 'barra-verba-preenchimento';
    barra.style.width = `${pct}%`;
    barra.style.backgroundColor = item.saldoCentavos < 0 ? '#DC2626' : cor;

    trilho.appendChild(barra);

    const rodape = document.createElement('div');
    rodape.className = 'barra-verba-rodape';
    rodape.textContent = item.saldoCentavos < 0
      ? `Atenção: estourou em ${formatarDinheiro(Math.abs(item.saldoCentavos))}`
      : `Sobrando nesta verba: ${formatarDinheiro(item.saldoCentavos)}`;

    linha.append(cab, trilho, rodape);
    lista.appendChild(linha);
  });

  container.appendChild(lista);
}
