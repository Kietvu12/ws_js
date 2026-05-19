/**
 * Japan location hierarchy: Region (地域) → Prefecture (都道府県) → City/Ward (市区町村)
 * Prefectures from JIS X 0401 API (madefor.github.io/jisx0401)
 * Cities fetched from JIS X 0402 API (madefor.github.io/jisx0402/api/v1/{prefCode}.json)
 */

/** 47 prefectures: code (01-47) → { ja, en } */
export const JAPAN_PREFECTURES = {
  '01': { ja: '北海道', en: 'Hokkaido' },
  '02': { ja: '青森県', en: 'Aomori' },
  '03': { ja: '岩手県', en: 'Iwate' },
  '04': { ja: '宮城県', en: 'Miyagi' },
  '05': { ja: '秋田県', en: 'Akita' },
  '06': { ja: '山形県', en: 'Yamagata' },
  '07': { ja: '福島県', en: 'Fukushima' },
  '08': { ja: '茨城県', en: 'Ibaraki' },
  '09': { ja: '栃木県', en: 'Tochigi' },
  '10': { ja: '群馬県', en: 'Gunma' },
  '11': { ja: '埼玉県', en: 'Saitama' },
  '12': { ja: '千葉県', en: 'Chiba' },
  '13': { ja: '東京都', en: 'Tokyo' },
  '14': { ja: '神奈川県', en: 'Kanagawa' },
  '15': { ja: '新潟県', en: 'Niigata' },
  '16': { ja: '富山県', en: 'Toyama' },
  '17': { ja: '石川県', en: 'Ishikawa' },
  '18': { ja: '福井県', en: 'Fukui' },
  '19': { ja: '山梨県', en: 'Yamanashi' },
  '20': { ja: '長野県', en: 'Nagano' },
  '21': { ja: '岐阜県', en: 'Gifu' },
  '22': { ja: '静岡県', en: 'Shizuoka' },
  '23': { ja: '愛知県', en: 'Aichi' },
  '24': { ja: '三重県', en: 'Mie' },
  '25': { ja: '滋賀県', en: 'Shiga' },
  '26': { ja: '京都府', en: 'Kyoto' },
  '27': { ja: '大阪府', en: 'Osaka' },
  '28': { ja: '兵庫県', en: 'Hyogo' },
  '29': { ja: '奈良県', en: 'Nara' },
  '30': { ja: '和歌山県', en: 'Wakayama' },
  '31': { ja: '鳥取県', en: 'Tottori' },
  '32': { ja: '島根県', en: 'Shimane' },
  '33': { ja: '岡山県', en: 'Okayama' },
  '34': { ja: '広島県', en: 'Hiroshima' },
  '35': { ja: '山口県', en: 'Yamaguchi' },
  '36': { ja: '徳島県', en: 'Tokushima' },
  '37': { ja: '香川県', en: 'Kagawa' },
  '38': { ja: '愛媛県', en: 'Ehime' },
  '39': { ja: '高知県', en: 'Kochi' },
  '40': { ja: '福岡県', en: 'Fukuoka' },
  '41': { ja: '佐賀県', en: 'Saga' },
  '42': { ja: '長崎県', en: 'Nagasaki' },
  '43': { ja: '熊本県', en: 'Kumamoto' },
  '44': { ja: '大分県', en: 'Oita' },
  '45': { ja: '宮崎県', en: 'Miyazaki' },
  '46': { ja: '鹿児島県', en: 'Kagoshima' },
  '47': { ja: '沖縄県', en: 'Okinawa' },
};

/** Regions (地域): ja, en, prefecture codes (01-47) */
export const JAPAN_REGIONS = [
  { id: 'hokkaido', ja: '北海道', en: 'Hokkaido', prefectureCodes: ['01'] },
  { id: 'tohoku', ja: '東北', en: 'Tohoku', prefectureCodes: ['02', '03', '04', '05', '06', '07'] },
  { id: 'kanto', ja: '関東', en: 'Kanto', prefectureCodes: ['08', '09', '10', '11', '12', '13', '14'] },
  { id: 'chubu', ja: '中部', en: 'Chubu', prefectureCodes: ['15', '16', '17', '18', '19', '20', '21', '22', '23'] },
  { id: 'kinki', ja: '近畿', en: 'Kinki', prefectureCodes: ['24', '25', '26', '27', '28', '29', '30'] },
  { id: 'chugoku', ja: '中国', en: 'Chugoku', prefectureCodes: ['31', '32', '33', '34', '35'] },
  { id: 'shikoku', ja: '四国', en: 'Shikoku', prefectureCodes: ['36', '37', '38', '39'] },
  { id: 'kyushu_okinawa', ja: '九州・沖縄', en: 'Kyushu & Okinawa', prefectureCodes: ['40', '41', '42', '43', '44', '45', '46', '47'] },
];

const JISX0402_BASE = 'https://madefor.github.io/jisx0402/api/v1';

/** Hepburn: katakana/hiragana → romaji (basic + dakuten). For display when language === 'en'. */
export function kanaToRomaji(str) {
  if (!str || typeof str !== 'string') return str || '';
  const kana = [
    'ア', 'イ', 'ウ', 'エ', 'オ', 'カ', 'キ', 'ク', 'ケ', 'コ', 'サ', 'シ', 'ス', 'セ', 'ソ', 'タ', 'チ', 'ツ', 'テ', 'ト', 'ナ', 'ニ', 'ヌ', 'ネ', 'ノ', 'ハ', 'ヒ', 'フ', 'ヘ', 'ホ', 'マ', 'ミ', 'ム', 'メ', 'モ', 'ヤ', 'ユ', 'ヨ', 'ラ', 'リ', 'ル', 'レ', 'ロ', 'ワ', 'ヲ', 'ン',
    'ァ', 'ィ', 'ゥ', 'ェ', 'ォ', 'ッ', 'ャ', 'ュ', 'ョ', 'ー', 'ガ', 'ギ', 'グ', 'ゲ', 'ゴ', 'ザ', 'ジ', 'ズ', 'ゼ', 'ゾ', 'ダ', 'ヂ', 'ヅ', 'デ', 'ド', 'バ', 'ビ', 'ブ', 'ベ', 'ボ', 'パ', 'ピ', 'プ', 'ペ', 'ポ', 'ヴ',
    'あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ', 'さ', 'し', 'す', 'せ', 'そ', 'た', 'ち', 'つ', 'て', 'と', 'な', 'に', 'ぬ', 'ね', 'の', 'は', 'ひ', 'ふ', 'へ', 'ほ', 'ま', 'み', 'む', 'め', 'も', 'や', 'ゆ', 'よ', 'ら', 'り', 'る', 'れ', 'ろ', 'わ', 'を', 'ん',
    'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ', 'っ', 'ゃ', 'ゅ', 'ょ', 'が', 'ぎ', 'ぐ', 'げ', 'ご', 'ざ', 'じ', 'ず', 'ぜ', 'ぞ', 'だ', 'ぢ', 'づ', 'で', 'ど', 'ば', 'び', 'ぶ', 'べ', 'ぼ', 'ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ',
  ];
  const romaji = [
    'a', 'i', 'u', 'e', 'o', 'ka', 'ki', 'ku', 'ke', 'ko', 'sa', 'shi', 'su', 'se', 'so', 'ta', 'chi', 'tsu', 'te', 'to', 'na', 'ni', 'nu', 'ne', 'no', 'ha', 'hi', 'fu', 'he', 'ho', 'ma', 'mi', 'mu', 'me', 'mo', 'ya', 'yu', 'yo', 'ra', 'ri', 'ru', 're', 'ro', 'wa', 'wo', 'n',
    'a', 'i', 'u', 'e', 'o', '', 'ya', 'yu', 'yo', '-', 'ga', 'gi', 'gu', 'ge', 'go', 'za', 'ji', 'zu', 'ze', 'zo', 'da', 'ji', 'zu', 'de', 'do', 'ba', 'bi', 'bu', 'be', 'bo', 'pa', 'pi', 'pu', 'pe', 'po', 'vu',
    'a', 'i', 'u', 'e', 'o', 'ka', 'ki', 'ku', 'ke', 'ko', 'sa', 'shi', 'su', 'se', 'so', 'ta', 'chi', 'tsu', 'te', 'to', 'na', 'ni', 'nu', 'ne', 'no', 'ha', 'hi', 'fu', 'he', 'ho', 'ma', 'mi', 'mu', 'me', 'mo', 'ya', 'yu', 'yo', 'ra', 'ri', 'ru', 're', 'ro', 'wa', 'wo', 'n',
    'a', 'i', 'u', 'e', 'o', '', 'ya', 'yu', 'yo', 'ga', 'gi', 'gu', 'ge', 'go', 'za', 'ji', 'zu', 'ze', 'zo', 'da', 'ji', 'zu', 'de', 'do', 'ba', 'bi', 'bu', 'be', 'bo', 'pa', 'pi', 'pu', 'pe', 'po',
  ];
  const map = {};
  kana.forEach((k, i) => { map[k] = romaji[i]; });
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    const c2 = str.slice(i, i + 2);
    if (map[c2]) { out += map[c2]; i++; continue; }
    if (map[c] !== undefined) out += map[c];
    else out += c;
  }
  const cleaned = out.replace(/-+/g, '-').replace(/-$/, '').replace(/^-(.)/g, (_, x) => x);
  return cleaned.replace(/(^|[\s-])([a-z])/g, (_, sep, letter) => sep + letter.toUpperCase());
}

/** Ward (区) under a city: fullName e.g. さいたま市西区, wardName e.g. 西区 */
export function parseCityWard(cityStr) {
  if (!cityStr || typeof cityStr !== 'string') return null;
  const match = cityStr.match(/^(.+市)(.+区)$/);
  return match ? { parentCity: match[1], wardName: match[2], fullName: cityStr } : null;
}

/**
 * Fetch cities/wards for a prefecture from JIS X 0402 API.
 * Returns { flat, tree }:
 * - flat: array of { code, city, prefecture } (all items, for backward compat).
 * - tree: array of { name (市名), wards: [{ fullName, wardName, code }], standalone } for cities;
 *   cities that have wards (政令指定都市 etc.) have wards[]; others have standalone: true.
 */
export async function fetchJapanCitiesByPrefecture(prefectureCode) {
  const code = String(prefectureCode).padStart(2, '0');
  const url = `${JISX0402_BASE}/${code}.json`;
  const res = await fetch(url);
  if (!res.ok) return { flat: [], tree: [] };
  const data = await res.json();
  const seen = new Set();
  const flat = [];
  const cityToWards = new Map(); // parent city name -> [{ fullName, wardName, code }]
  const standaloneCities = new Set(); // cities that appear as single entry (no wards)

  for (const [fullCode, item] of Object.entries(data)) {
    const cityName = item?.city || item?.name;
    if (!cityName) continue;
    const key = cityName;
    if (seen.has(key)) continue;
    seen.add(key);

    const parsed = parseCityWard(cityName);
    const cityKana = item?.city_kana || item?.prefecture_kana || '';
    if (parsed) {
      const { parentCity, wardName, fullName } = parsed;
      if (!cityToWards.has(parentCity)) cityToWards.set(parentCity, []);
      cityToWards.get(parentCity).push({ fullName, wardName, code: fullCode, fullNameKana: cityKana });
    } else {
      flat.push({
        code: fullCode,
        city: cityName,
        prefecture: item?.prefecture || JAPAN_PREFECTURES[code]?.ja || '',
        cityKana,
      });
      if (cityName.endsWith('市')) standaloneCities.add(cityName);
    }
  }

  flat.sort((a, b) => String(a.city).localeCompare(String(b.city), 'ja'));

  const tree = [];
  const addedParents = new Set();
  for (const entry of flat) {
    const name = entry.city;
    const nameKana = entry.cityKana || '';
    if (name.endsWith('市')) {
      if (addedParents.has(name)) continue;
      addedParents.add(name);
      const wards = (cityToWards.get(name) || []).sort((a, b) => String(a.wardName).localeCompare(String(b.wardName), 'ja'));
      tree.push({
        name,
        nameKana,
        wards,
        standalone: standaloneCities.has(name) && wards.length === 0,
      });
    } else {
      tree.push({ name, nameKana, wards: [], standalone: true });
    }
  }
  for (const [parentName, wards] of cityToWards) {
    if (addedParents.has(parentName)) continue;
    addedParents.add(parentName);
    const sortedWards = wards.sort((a, b) => String(a.wardName).localeCompare(String(b.wardName), 'ja'));
    tree.push({
      name: parentName,
      nameKana: '',
      wards: sortedWards,
      standalone: false,
    });
  }
  tree.sort((a, b) => String(a.name).localeCompare(String(b.name), 'ja'));

  return { flat, tree };
}
