import crypto from 'crypto';
import axios from 'axios';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const MIXIN_KEY_ENC_TABLE = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61,
  26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36,
  20, 44, 52, 34,
];

const HEADERS = {
  'User-Agent': UA,
  Referer: 'https://www.bilibili.com',
};

interface WbiKeys {
  img_key: string;
  sub_key: string;
}

let cachedKeys: WbiKeys | null = null;
let cacheTime = 0;
const CACHE_TTL = 4 * 60 * 60 * 1000;

function getMixinKey(keys: WbiKeys): string {
  const combined = keys.img_key + keys.sub_key;
  let result = '';
  for (const idx of MIXIN_KEY_ENC_TABLE) {
    if (idx < combined.length) result += combined[idx];
  }
  return result.slice(0, 32);
}

async function getWbiKeys(): Promise<WbiKeys | null> {
  const now = Date.now();
  if (cachedKeys && now - cacheTime < CACHE_TTL) return cachedKeys;

  try {
    const resp = await axios.get('https://api.bilibili.com/x/web-interface/nav', {
      headers: HEADERS,
      timeout: 5000,
    });

    const wbi = resp.data?.data?.wbi_img;
    if (!wbi) return cachedKeys;

    const imgKey = (wbi.img_url as string).split('/').pop()?.split('.')[0] ?? '';
    const subKey = (wbi.sub_url as string).split('/').pop()?.split('.')[0] ?? '';

    if (!imgKey || !subKey) return cachedKeys;

    cachedKeys = { img_key: imgKey, sub_key: subKey };
    cacheTime = now;
    return cachedKeys;
  } catch {
    return cachedKeys;
  }
}

function filterValue(v: string | number): string {
  // Remove characters that break WBI signing: !'()*
  return String(v).replace(/[!'()*]/g, '');
}

/**
 * Sign params with WBI. Returns a new params object with w_rid and wts.
 */
export async function signParams(
  params: Record<string, string | number>,
): Promise<Record<string, string | number>> {
  const keys = await getWbiKeys();
  if (!keys) return params;

  const mixinKey = getMixinKey(keys);
  const wts = Math.floor(Date.now() / 1000);

  const signed: Record<string, string | number> = { ...params, wts };
  const sorted = Object.keys(signed)
    .sort()
    .map((k) => `${k}=${encodeURIComponent(filterValue(signed[k]))}`)
    .join('&');

  const hash = crypto.createHash('md5').update(sorted + mixinKey).digest('hex');
  signed['w_rid'] = hash;

  return signed;
}

export { HEADERS, UA };
