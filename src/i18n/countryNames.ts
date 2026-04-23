/**
 * Country name translations for 2026 FIFA World Cup (48 teams).
 * Maps English API names → localized names.
 */

const countryNameZh: Record<string, string> = {
  // ─── Group A ───
  'Morocco': '摩洛哥',
  'USA': '美国',
  'United States': '美国',
  'Panama': '巴拿马',
  'Cabo Verde': '佛得角',
  'Cape Verde': '佛得角',

  // ─── Group B ───
  'Portugal': '葡萄牙',
  'Colombia': '哥伦比亚',
  'Bolivia': '玻利维亚',
  'Cote d\'Ivoire': '科特迪瓦',
  'Ivory Coast': '科特迪瓦',

  // ─── Group C ───
  'Belgium': '比利时',
  'Mexico': '墨西哥',
  'Ecuador': '厄瓜多尔',
  'Haiti': '海地',

  // ─── Group D ───
  'Argentina': '阿根廷',
  'Uzbekistan': '乌兹别克斯坦',
  'Peru': '秘鲁',
  'Bahrain': '巴林',

  // ─── Group E ───
  'Denmark': '丹麦',
  'Australia': '澳大利亚',
  'Indonesia': '印度尼西亚',
  'Paraguay': '巴拉圭',

  // ─── Group F ───
  'Brazil': '巴西',
  'Italy': '意大利',
  'Honduras': '洪都拉斯',
  'Slovenia': '斯洛文尼亚',

  // ─── Group G ───
  'France': '法国',
  'Iran': '伊朗',
  'Kenya': '肯尼亚',
  'Uganda': '乌干达',

  // ─── Group H ───
  'Spain': '西班牙',
  'Japan': '日本',
  'Serbia': '塞尔维亚',
  'New Zealand': '新西兰',

  // ─── Group I ───
  'England': '英格兰',
  'Senegal': '塞内加尔',
  'Uruguay': '乌拉圭',
  'Poland': '波兰',

  // ─── Group J ───
  'Germany': '德国',
  'Chile': '智利',
  'South Korea': '韩国',
  'Korea Republic': '韩国',
  'Trinidad and Tobago': '特立尼达和多巴哥',
  'Trinidad & Tobago': '特立尼达和多巴哥',

  // ─── Group K ───
  'Netherlands': '荷兰',
  'Canada': '加拿大',
  'Cameroon': '喀麦隆',
  'Jamaica': '牙买加',

  // ─── Group L ───
  'Croatia': '克罗地亚',
  'Egypt': '埃及',
  'Costa Rica': '哥斯达黎加',
  'Albania': '阿尔巴尼亚',

  // ─── Other common names ───
  'Switzerland': '瑞士',
  'Wales': '威尔士',
  'Scotland': '苏格兰',
  'Nigeria': '尼日利亚',
  'Ghana': '加纳',
  'Tunisia': '突尼斯',
  'Saudi Arabia': '沙特阿拉伯',
  'Qatar': '卡塔尔',
  'Sweden': '瑞典',
  'Norway': '挪威',
  'Ukraine': '乌克兰',
  'Turkey': '土耳其',
  'Austria': '奥地利',
  'Czech Republic': '捷克',
  'Czechia': '捷克',
  'Russia': '俄罗斯',
  'China': '中国',
  'India': '印度',
};

/**
 * Translate a country name based on locale.
 * Falls back to the original (English) name if no mapping is found.
 */
export function translateCountryName(name: string, locale: string): string {
  if (locale === 'zh') {
    return countryNameZh[name] || name;
  }
  return name;
}
