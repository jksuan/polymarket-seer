import { canonicalCountryName } from '@/lib/countryFlags';

/**
 * Country name translations for 2026 FIFA World Cup (48 teams).
 * Maps English API names → localized names.
 */

const countryNameZh: Record<string, string> = {
  // ─── Group A ───
  'Mexico': '墨西哥',
  'South Africa': '南非',
  'Korea Republic': '韩国',
  'South Korea': '韩国',
  'Czechia': '捷克',
  'Czech Republic': '捷克',
  'CZE/DEN/MKD/IRL': '捷克',

  // ─── Group B ───
  'Canada': '加拿大',
  'Bosnia and Herzegovina': '波黑',
  'Bosnia-Herzegovina': '波黑',
  'BIH/ITA/NIR/WAL': '波黑',
  'Qatar': '卡塔尔',
  'Switzerland': '瑞士',

  // ─── Group C ───
  'Brazil': '巴西',
  'Morocco': '摩洛哥',
  'Haiti': '海地',
  'Scotland': '苏格兰',

  // ─── Group D ───
  'United States': '美国',
  'USA': '美国',
  'Paraguay': '巴拉圭',
  'Australia': '澳大利亚',
  'Türkiye': '土耳其',
  'Turkey': '土耳其',
  'Turkiye': '土耳其',
  'KOS/ROU/SVK/TUR': '土耳其',

  // ─── Group E ───
  'Germany': '德国',
  'Curaçao': '库拉索',
  'Curacao': '库拉索',
  'Côte d\'Ivoire': '科特迪瓦',
  'Cote d\'Ivoire': '科特迪瓦',
  'Ivory Coast': '科特迪瓦',
  'Ecuador': '厄瓜多尔',

  // ─── Group F ───
  'Netherlands': '荷兰',
  'Japan': '日本',
  'Sweden': '瑞典',
  'Tunisia': '突尼斯',

  // ─── Group G ───
  'Belgium': '比利时',
  'Egypt': '埃及',
  'IR Iran': '伊朗',
  'Iran': '伊朗',
  'New Zealand': '新西兰',

  // ─── Group H ───
  'Spain': '西班牙',
  'Cabo Verde': '佛得角',
  'Cape Verde': '佛得角',
  'Saudi Arabia': '沙特阿拉伯',
  'Uruguay': '乌拉圭',

  // ─── Group I ───
  'France': '法国',
  'Senegal': '塞内加尔',
  'Iraq': '伊拉克',
  'BOL/IRQ/SUR': '伊拉克',
  'Norway': '挪威',

  // ─── Group J ───
  'Argentina': '阿根廷',
  'Algeria': '阿尔及利亚',
  'Austria': '奥地利',
  'Jordan': '约旦',

  // ─── Group K ───
  'Portugal': '葡萄牙',
  'DR Congo': '刚果(金)',
  'Congo DR': '刚果(金)',
  'DRC/JAM/NCL': '刚果(金)',
  'Uzbekistan': '乌兹别克斯坦',
  'Colombia': '哥伦比亚',

  // ─── Group L ───
  'England': '英格兰',
  'Croatia': '克罗地亚',
  'Ghana': '加纳',
  'Panama': '巴拿马',

  // ─── Historic (2022, 2018, 2014) ───
  'Wales': '威尔士',
  'Poland': '波兰',
  'Denmark': '丹麦',
  'Costa Rica': '哥斯达黎加',
  'Cameroon': '喀麦隆',
  'Serbia': '塞尔维亚',
  'Russia': '俄罗斯',
  'Nigeria': '尼日利亚',
  'Iceland': '冰岛',
  'Chile': '智利',
  'Greece': '希腊',
  'Italy': '意大利',
  'Honduras': '洪都拉斯',
  'Peru': '秘鲁',

  // ─── Continents (for Fun Bets) ───
  'Europe': '欧洲',
  'South America': '南美洲',
  'Africa': '非洲',
  'Asia': '亚洲',
  'North America': '北美洲',
  'Oceania': '大洋洲',
};

const shortCountryNameZh: Record<string, string> = {
  'Uzbekistan': '乌兹别克',
  'Saudi Arabia': '沙特',
  'Bosnia and Herzegovina': '波黑',
  'Bosnia-Herzegovina': '波黑',
  'BIH/ITA/NIR/WAL': '波黑',
};

/**
 * Translate a country name based on locale.
 * Falls back to the original (English) name if no mapping is found.
 */
export function translateCountryName(name: string, locale: string, short: boolean = false): string {
  if (locale.startsWith('zh')) {
    if (short && shortCountryNameZh[name]) {
      return shortCountryNameZh[name];
    }
    return countryNameZh[name] || countryNameZh[canonicalCountryName(name)] || name;
  }
  return canonicalCountryName(name);
}
