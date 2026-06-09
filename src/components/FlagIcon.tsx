import React from 'react';

// Chuyển đổi cờ Emoji hoặc tên đặc biệt sang đường dẫn ảnh cờ từ FlagCDN
export const getFlagImageUrl = (flag: string): string => {
  if (!flag) return '';
  const flagText = flag.trim();

  // Nếu cờ đã là một URL hình ảnh hoặc đường dẫn file
  if (flagText.startsWith('http') || flagText.startsWith('/') || flagText.includes('.')) {
    return flagText;
  }

  // Tách ký tự emoji đầu tiên để phân tích
  const charArray = Array.from(flagText);
  const emoji = charArray[0];
  if (!emoji) return '';

  const codePoints = Array.from(emoji).map(c => c.codePointAt(0) || 0);

  // Nhận diện cờ tiêu chuẩn từ 2 ký tự Regional Indicator Symbol (Unicode 127462 - 127487)
  if (
    codePoints.length >= 2 &&
    codePoints[0] >= 127462 && codePoints[0] <= 127487 &&
    codePoints[1] >= 127462 && codePoints[1] <= 127487
  ) {
    const code1 = codePoints[0] - 127462 + 97; // 97 là ASCII 'a'
    const code2 = codePoints[1] - 127462 + 97;
    const countryCode = String.fromCharCode(code1, code2);
    return `https://flagcdn.com/w40/${countryCode}.png`;
  }

  // Fallback cho cờ Vương Quốc Anh và các vùng lãnh thổ (England, Scotland, Wales)
  if (flagText === '🏴󠁧󠁢󠁥󠁮󠁧󠁿' || flagText.includes('Anh')) return 'https://flagcdn.com/w40/gb-eng.png';
  if (flagText === '🏴󠁧󠁢󠁳󠁣󠁴󠁿' || flagText.includes('Scotland')) return 'https://flagcdn.com/w40/gb-sct.png';
  if (flagText === '🏴󠁧󠁢󠁷󠁬󠁳󠁿' || flagText.includes('Wales')) return 'https://flagcdn.com/w40/gb-wls.png';

  // Bản đồ dự phòng (fallback map) cho các flag emoji phổ biến khác
  const fallbackMap: { [key: string]: string } = {
    '🇺🇸': 'us',
    '🇲🇽': 'mx',
    '🇨🇦': 'ca',
    '🇨🇷': 'cr',
    '🇦🇷': 'ar',
    '🇵🇹': 'pt',
    '🇩🇪': 'de',
    '🇫🇷': 'fr',
    '🇮🇹': 'it',
    '🇧🇷': 'br',
    '🇪🇸': 'es',
    '🇯🇵': 'jp',
    '🇰🇷': 'kr',
    '🇿🇦': 'za',
    '🇨🇿': 'cz',
    '🇧🇦': 'ba',
    '🇵🇾': 'py',
    '🇭🇹': 'ht',
    '🇦🇺': 'au',
    '🇹🇷': 'tr',
    '🇲🇦': 'ma',
    '🇶🇦': 'qa',
    '🇨🇭': 'ch',
    '🇨🇮': 'ci',
    '🇨🇼': 'cw',
    '🇳🇱': 'nl',
    '🇸🇪': 'se',
    '🇹🇳': 'tn',
    '🇮🇷': 'ir',
    '🇳🇿': 'nz',
    '🇨🇻': 'cv',
    '🇧🇪': 'be',
    '🇪🇬': 'eg',
    '🇸🇦': 'sa',
    '🇺🇾': 'uy',
    '🇸🇳': 'sn',
    '🇮🇶': 'iq',
    '🇳🇴': 'no',
    '🇩🇿': 'dz',
    '🇦🇹': 'at',
    '🇯🇴': 'jo',
    '🇨🇩': 'cd',
    '🇭🇷': 'hr',
    '🇺🇿': 'uz',
    '🇨🇴': 'co',
    '🇵🇦': 'pa',
    '🇬🇭': 'gh'
  };

  const code = fallbackMap[flagText];
  if (code) {
    return `https://flagcdn.com/w40/${code}.png`;
  }

  return '';
};

interface FlagIconProps {
  flag: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const FlagIcon: React.FC<FlagIconProps> = ({ flag, alt = '', className = '', style }) => {
  const url = getFlagImageUrl(flag);

  if (!url) {
    return <span className={className} style={style}>{flag}</span>;
  }

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      style={{
        width: '24px',
        height: '16px',
        objectFit: 'cover',
        borderRadius: '2px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        display: 'inline-block',
        verticalAlign: 'middle',
        ...style
      }}
      onError={(e) => {
        // Fallback sang emoji text nếu không tải được ảnh cờ
        (e.target as HTMLElement).style.display = 'none';
        const parent = (e.target as HTMLElement).parentElement;
        if (parent) {
          const span = document.createElement('span');
          span.textContent = flag;
          parent.appendChild(span);
        }
      }}
    />
  );
};
