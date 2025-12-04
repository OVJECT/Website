export function getCurrentLang() {
  // Supported languages (excluding default 'en')
  const supported = ['ko', 'de', 'vi', 'es', 'ja', 'zh', 'th', 'fr'];
  
  const browserLang = navigator.language || navigator.userLanguage || 'en';
  const shortLang = browserLang.substring(0, 2).toLowerCase(); // 'ko-KR' -> 'ko'

  // Special case for Chinese if specific distinction is needed later, 
  // but generally 'zh' covers Simplified for basic locale matching.
  
  return supported.includes(shortLang) ? shortLang : 'en';
}
