export const normalize = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function classifyProduct(name, fallback = 'Acessórios e automação') {
  const text = normalize(name);
  if (/cabo.*(alta.*isolacao|alta.*tensao|cerca)|(alta.*isolacao|alta.*tensao).*cabo/.test(text)) return 'Cabos para cerca elétrica';
  if (/concertina|rede laminada|lanca.*muro/.test(text)) return 'Concertinas e proteção perimetral';
  if (/cerca|eletrificador|haste|arame|isolador|aterramento/.test(text)) return 'Cercas elétricas';
  if (/bateria|pilha/.test(text) && !/com bateria|inclu[is]/.test(text)) return 'Baterias e pilhas';
  if (/sensor|infravermelho|barreira/.test(text) && !/kit/.test(text)) {
    if (/barreira|infravermelho ativo/.test(text)) return 'Sensores de barreira';
    if (/abertura|magnetico/.test(text)) return 'Sensores de abertura';
    if (/movimento|presenca|infravermelho passivo|\bivp\b/.test(text)) return 'Sensores de presença';
    return 'Outros sensores';
  }
  if (/sirene|sonalarme|buzzer/.test(text) && !/s\/sirene|sem sirene/.test(text)) return 'Sirenes e sinalizadores';
  if (/kit.*alarme|alarme.*kit/.test(text)) return 'Kits de alarme';
  if (/central.*alarme/.test(text)) return 'Centrais de alarme';
  if (/incendio|fumaca|acionador manual/.test(text)) return 'Detecção de incêndio';
  if (/neblina|botao.*emergencia/.test(text)) return 'Alarme e emergência';
  if (/placa.*dvr|base.*dvr|principal.*dvr|modulo.*alarme/.test(text)) return 'Peças e módulos de segurança';
  if (/\bdvr\b|\bnvr\b|gravador/.test(text)) return 'Gravadores';
  if (/kit.*camera/.test(text)) return 'Kits de câmeras';
  if (/camera/.test(text)) return 'Câmeras';
  if (/fechadura|eletroima|trava eletrica/.test(text)) return 'Fechaduras';
  if (/interfone|porteiro|videoporteiro/.test(text)) return 'Interfones e videoporteiros';
  if (/nobreak|no.break/.test(text)) return 'Energia e nobreaks';
  if (/\bfonte\b|alimentacao.*12/.test(text)) return 'Fontes de alimentação';
  if (/cabo|coaxial|\butp\b/.test(text)) return 'Cabos';
  if (/conector|balun|\bbnc\b|\bp4\b|caixa.*passagem/.test(text)) return 'Conectores e acessórios CFTV';
  if (/switch|poe|rack/.test(text)) return 'Redes e infraestrutura';
  if (/cartao|microsd|disco|ssd|\bhd\b.*\btb\b/.test(text)) return 'Armazenamento';
  if (/controle remoto|receptor|transmissor/.test(text)) return 'Controles e receptores';
  if (/catraca|facial|controlador.*acesso/.test(text)) return 'Controle de acesso e catracas';
  if (/motor|cremalheira|portao|automatizador|cancela/.test(text)) return 'Automatizadores e acessórios';
  return fallback;
}

export const decodeHtml = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

export async function get(url) {
  const response = await fetch(url, {signal:AbortSignal.timeout(30000)});
  if (!response.ok) throw Error(`HTTP ${response.status}: ${url}`);
  return response;
}

export async function inBatches(values, size, callback) {
  for (let start=0; start<values.length; start+=size) await Promise.all(values.slice(start,start+size).map(callback));
}
