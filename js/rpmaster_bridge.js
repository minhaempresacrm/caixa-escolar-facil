/**
 * Ponte Multi-Escola RPMASTER <-> Caixa Escolar Fácil (Full-Cloud Zero-Trust)
 * - Detecta ?escola=<slug> (sem ?escola= mantém 100% o modo demonstração local)
 * - Usa fetch() nativo compatível com CSP estrita (connect-src 'self' https://*.supabase.co)
 * - Isola sessão por slug (localStorage) e impersonação por aba (sessionStorage + history.replaceState)
 * - Controle de versão otimista (state_version) e proteção fail-closed quando offline
 */

const SUPABASE_URL = 'https://zlnaushxdvuznlwmongk.supabase.co';
const SUPABASE_ANON = 'sb_publishable_U_vT8rFuKXlwF4_yUlfaUQ_WcXYtcbx';

let _stateVersion = 1;
let _escolaPublica = null;
let _isMasterOrigin = false;

export function obterSlugEscolaUrl() {
  if (typeof window === 'undefined' || !window.location) return '';
  const params = new URLSearchParams(window.location.search || '');
  return (params.get('escola') || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
}

export function modoNuvemAtivo() {
  return Boolean(obterSlugEscolaUrl());
}

export function safeHex(val, fallback) {
  return /^#[0-9A-Fa-f]{6}$/.test(String(val || '').trim()) ? String(val).trim() : fallback;
}

function tokenKey(slug) {
  return `cef_token__${slug}`;
}

export function obterTokenNuvemAtivo() {
  const slug = obterSlugEscolaUrl();
  if (!slug || typeof window === 'undefined') return '';
  try {
    const impTk = sessionStorage.getItem('cef_impersonate_token') || '';
    const impSlug = sessionStorage.getItem('cef_impersonate_slug') || '';
    if (impTk && impSlug === slug) {
      _isMasterOrigin = true;
      return impTk;
    }
    return localStorage.getItem(tokenKey(slug)) || sessionStorage.getItem(tokenKey(slug)) || '';
  } catch {
    return '';
  }
}

export function salvarTokenNuvem(token, lembrar) {
  const slug = obterSlugEscolaUrl();
  if (!slug || typeof window === 'undefined') return;
  try {
    if (lembrar) {
      localStorage.setItem(tokenKey(slug), token);
      sessionStorage.removeItem(tokenKey(slug));
    } else {
      sessionStorage.setItem(tokenKey(slug), token);
      localStorage.removeItem(tokenKey(slug));
    }
  } catch {
    // Ignora
  }
}

export function limparTokenNuvem() {
  const slug = obterSlugEscolaUrl();
  _isMasterOrigin = false;
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem('cef_impersonate_token');
    sessionStorage.removeItem('cef_impersonate_slug');
    if (slug) {
      localStorage.removeItem(tokenKey(slug));
      sessionStorage.removeItem(tokenKey(slug));
    }
  } catch {
    // Ignora
  }
}

export function consumirImpersonacaoUrl() {
  if (typeof window === 'undefined' || !window.location) return false;
  const slug = obterSlugEscolaUrl();
  const params = new URLSearchParams(window.location.search || '');
  const tk = (params.get('rpm_cef_token') || '').trim();
  if (!tk || !slug) return false;

  try {
    sessionStorage.setItem('cef_impersonate_token', tk);
    sessionStorage.setItem('cef_impersonate_slug', slug);
    _isMasterOrigin = true;
  } catch {
    // Ignora
  }

  params.delete('rpm_cef_token');
  const qs = params.toString();
  const cleanUrl = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
  try {
    window.history.replaceState({}, document.title, cleanUrl);
  } catch {
    // Ignora
  }
  return true;
}

export function estaEmImpersonacao() {
  return _isMasterOrigin;
}

export function obterEscolaPublicaAtual() {
  return _escolaPublica;
}

export function obterVersaoEstadoAtual() {
  return _stateVersion;
}

async function chamarRpc(nome, payload) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('Sem conexão com a internet. Reconecte para sincronizar os dados da escola.');
  }
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${nome}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload || {}),
  });
  const data = await resp.json().catch(() => null);
  if (!resp.ok) {
    throw new Error((data && (data.message || data.error)) || `Erro HTTP ${resp.status}`);
  }
  return data;
}

export async function obterInfoPublicaEscola(slug) {
  const res = await chamarRpc('cef_get_public_info', { p_slug: slug });
  if (res && res.ok && res.escola) {
    _escolaPublica = res.escola;
  }
  return res;
}

export async function entrarComPinNuvem(pin, lembrar) {
  const slug = obterSlugEscolaUrl();
  const res = await chamarRpc('cef_login_pin', { p_slug: slug, p_pin: pin });
  if (res && res.ok && res.token) {
    _isMasterOrigin = false;
    _escolaPublica = res.escola || _escolaPublica;
    _stateVersion = Number(res.state_version || 1);
    salvarTokenNuvem(res.token, lembrar);
  }
  return res;
}

export async function buscarEstadoNuvem() {
  const tk = obterTokenNuvemAtivo();
  if (!tk) return { ok: false, error: 'Sessão ausente.' };
  const res = await chamarRpc('cef_pull_state', { p_token: tk });
  if (res && res.ok) {
    _isMasterOrigin = Boolean(res.is_master_origin);
    _escolaPublica = res.escola || _escolaPublica;
    _stateVersion = Number(res.state_version || _stateVersion);
  }
  return res;
}

export async function salvarEstadoNuvem(estadoDados, meta = null) {
  const tk = obterTokenNuvemAtivo();
  if (!tk) return { ok: false, error: 'Sessão expirada. Entre novamente.' };
  const res = await chamarRpc('cef_push_state', {
    p_token: tk,
    p_estado: estadoDados,
    p_meta: meta,
    p_expected_version: _stateVersion,
  });
  if (res && res.ok && res.state_version) {
    _stateVersion = Number(res.state_version);
  }
  return res;
}

export async function sairSessaoNuvem() {
  const tk = obterTokenNuvemAtivo();
  limparTokenNuvem();
  if (tk) {
    try {
      await chamarRpc('cef_logout', { p_token: tk });
    } catch {
      // Ignora erro de rede ao sair
    }
  }
}

export function aplicarIdentidadeVisualEscola(escola) {
  if (!escola || typeof document === 'undefined') return;
  const p1 = safeHex(escola.cor_primaria, '#1D4ED8');
  const p2 = safeHex(escola.cor_destaque, '#059669');
  document.documentElement.style.setProperty('--azul', p1);
  document.documentElement.style.setProperty('--azul-escuro', p1);
  document.documentElement.style.setProperty('--verde', p2);
  document.title = `${escola.nome_escola || 'Caixa Escolar Fácil'} — Gestão de Verbas Escolares`;
}

export function moduloCefAtivo(chave) {
  if (!modoNuvemAtivo() || !_escolaPublica) return true;
  const mods = _escolaPublica.modulos;
  if (!mods || typeof mods !== 'object') return true;
  if (chave in mods) return Boolean(mods[chave]);
  return true;
}
