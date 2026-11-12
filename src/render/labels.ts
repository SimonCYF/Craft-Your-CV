import type { LocaleId } from '@/i18n';

/* The fixed words inside a downloaded resume (buttons, headings, hints). The resume's own text is whatever the person typed. */
export interface Labels {
  resume: string; yourName: string; skip: string; sections: string; elsewhere: string; contact: string; contactAndSkills: string;
  emailMe: string; email: string; copyEmail: string; copied: string; savePdf: string; all: string; groups: string; backToTop: string;
  levelOf: string; qrFor: string; scanDefault: string; portraitOf: string;
  printHint: string; copyDone: string; copyFail: string;
}

const en: Labels = {
  resume: 'Resume', yourName: 'Your name', skip: 'Skip to content', sections: 'Sections', elsewhere: 'Elsewhere', contact: 'Contact', contactAndSkills: 'Contact and skills',
  emailMe: 'Email me', email: 'Email', copyEmail: 'Copy email', copied: 'Copied', savePdf: 'Save as PDF', all: 'All', groups: '{title} groups', backToTop: 'Back to top',
  levelOf: 'Level {n} of 5', qrFor: 'QR code for {url}', scanDefault: 'Scan to open my profile', portraitOf: 'Portrait of {name}',
  printHint: 'In the print dialog, choose “Save as PDF”. Keep margins on Default.', copyDone: 'Email copied to your clipboard.',
  copyFail: 'Could not copy. Select the address and press Ctrl+C (Cmd+C on Mac).',
};

const LABELS: Record<LocaleId, Labels> = {
  en,
  ms: {
    resume: 'Resume', yourName: 'Nama anda', skip: 'Langkau ke kandungan', sections: 'Bahagian', elsewhere: 'Di tempat lain', contact: 'Hubungi', contactAndSkills: 'Hubungan dan kemahiran',
    emailMe: 'E-mel saya', email: 'E-mel', copyEmail: 'Salin e-mel', copied: 'Disalin', savePdf: 'Simpan sebagai PDF', all: 'Semua', groups: 'Kumpulan {title}', backToTop: 'Kembali ke atas',
    levelOf: 'Tahap {n} daripada 5', qrFor: 'Kod QR untuk {url}', scanDefault: 'Imbas untuk buka profil saya', portraitOf: 'Potret {name}',
    printHint: 'Dalam dialog cetak, pilih “Simpan sebagai PDF”. Biarkan margin pada Lalai.', copyDone: 'E-mel telah disalin ke papan keratan anda.',
    copyFail: 'Tidak dapat menyalin. Pilih alamat dan tekan Ctrl+C (Cmd+C pada Mac).',
  },
  zh: {
    resume: '简历', yourName: '您的姓名', skip: '跳到正文', sections: '栏目', elsewhere: '其他链接', contact: '联系方式', contactAndSkills: '联系方式与技能',
    emailMe: '给我发邮件', email: '邮箱', copyEmail: '复制邮箱', copied: '已复制', savePdf: '保存为 PDF', all: '全部', groups: '{title}分组', backToTop: '回到顶部',
    levelOf: '等级 {n}/5', qrFor: '{url} 的二维码', scanDefault: '扫码打开我的主页', portraitOf: '{name} 的肖像照',
    printHint: '在打印对话框中选择“另存为 PDF”，页边距保持默认。', copyDone: '邮箱已复制到剪贴板。',
    copyFail: '复制失败。请选中地址后按 Ctrl+C（Mac 上为 Cmd+C）。',
  },
  ta: {
    resume: 'விண்ணப்ப விவரம்', yourName: 'உங்கள் பெயர்', skip: 'உள்ளடக்கத்திற்குச் செல்', sections: 'பிரிவுகள்', elsewhere: 'மற்ற இணைப்புகள்', contact: 'தொடர்புக்கு', contactAndSkills: 'தொடர்பும் திறன்களும்',
    emailMe: 'எனக்கு மின்னஞ்சல்', email: 'மின்னஞ்சல்', copyEmail: 'மின்னஞ்சலை நகலெடு', copied: 'நகலெடுக்கப்பட்டது', savePdf: 'PDF ஆகச் சேமி', all: 'அனைத்தும்', groups: '{title} குழுக்கள்', backToTop: 'மேலே செல்',
    levelOf: 'நிலை {n} / 5', qrFor: '{url} க்கான QR குறியீடு', scanDefault: 'என் சுயவிவரத்தைத் திறக்க ஸ்கேன் செய்யுங்கள்', portraitOf: '{name} உருவப்படம்',
    printHint: 'அச்சு உரையாடலில் “PDF ஆகச் சேமி” என்பதைத் தேர்வு செய்யுங்கள். விளிம்புகளை இயல்புநிலையில் வையுங்கள்.', copyDone: 'மின்னஞ்சல் நகலெடுக்கப்பட்டது.',
    copyFail: 'நகலெடுக்க முடியவில்லை. முகவரியைத் தேர்ந்தெடுத்து Ctrl+C (Mac இல் Cmd+C) அழுத்துங்கள்.',
  },
  hi: {
    resume: 'रिज़्यूमे', yourName: 'आपका नाम', skip: 'सामग्री पर जाएँ', sections: 'अनुभाग', elsewhere: 'अन्य लिंक', contact: 'संपर्क', contactAndSkills: 'संपर्क और कौशल',
    emailMe: 'मुझे ईमेल करें', email: 'ईमेल', copyEmail: 'ईमेल कॉपी करें', copied: 'कॉपी हो गया', savePdf: 'PDF के रूप में सहेजें', all: 'सभी', groups: '{title} समूह', backToTop: 'ऊपर जाएँ',
    levelOf: 'स्तर {n}/5', qrFor: '{url} के लिए QR कोड', scanDefault: 'मेरी प्रोफ़ाइल खोलने के लिए स्कैन करें', portraitOf: '{name} का चित्र',
    printHint: 'प्रिंट डायलॉग में “PDF के रूप में सहेजें” चुनें। मार्जिन डिफ़ॉल्ट रखें।', copyDone: 'ईमेल क्लिपबोर्ड पर कॉपी हो गया।',
    copyFail: 'कॉपी नहीं हो सका। पता चुनकर Ctrl+C (Mac पर Cmd+C) दबाएँ।',
  },
  es: {
    resume: 'Currículum', yourName: 'Su nombre', skip: 'Saltar al contenido', sections: 'Secciones', elsewhere: 'En otros sitios', contact: 'Contacto', contactAndSkills: 'Contacto y habilidades',
    emailMe: 'Escríbeme', email: 'Correo', copyEmail: 'Copiar correo', copied: 'Copiado', savePdf: 'Guardar como PDF', all: 'Todo', groups: 'Grupos de {title}', backToTop: 'Volver arriba',
    levelOf: 'Nivel {n} de 5', qrFor: 'Código QR de {url}', scanDefault: 'Escanea para abrir mi perfil', portraitOf: 'Retrato de {name}',
    printHint: 'En el cuadro de impresión, elija “Guardar como PDF”. Deje los márgenes en Predeterminado.', copyDone: 'Correo copiado al portapapeles.',
    copyFail: 'No se pudo copiar. Seleccione la dirección y pulse Ctrl+C (Cmd+C en Mac).',
  },
};

export const labelsFor = (lang: string | undefined): Labels => LABELS[(lang as LocaleId) in LABELS ? (lang as LocaleId) : 'en'];
export const fill = (text: string, vars: Record<string, string | number>): string => text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
