/**
 * Fide Uygunluk Testi - Google Apps Script Webhook
 *
 * Bu script, fide-gtm.html widget'indan gelen test verilerini
 * Google Sheets'e kaydeder.
 *
 * Kurulum:
 * 1. Google Sheets'te yeni bir tablo olusturun
 * 2. Uzantilar > Apps Script'e gidin
 * 3. Bu kodu yapistirin
 * 4. Yayinla > Web uygulamasi olarak dagit secin
 *    - "Uygulamayi su kullanici olarak calistir" = Kendiniz
 *    - "Erisim" = Herkes (anonim dahil)
 * 5. Dağitim URL'sini kopyalayip fide-gtm.html'deki WEBHOOK_URL'ye yapistirin
 *
 * NOT: Header degisikligi yaptiysaniz, mevcut sayfayi silip yeniden calistirin
 *      veya header satirini manuel guncelleyin.
 */

var SHEET_NAME = 'Fide Test Verileri';

var HEADERS = [
  'Timestamp',
  'Event',
  'Veli Adi',
  'Telefon',
  'Sinif',
  'Skor',
  'Sonuc',
  'Remarketing Haric',
  'CTA Tipi',
  'Cevaplanan Soru',
  'Terk Adimi',
  'S1 - Karar Verme (Cevap)',
  'S1 - Karar Verme (Puan)',
  'S2 - Okulda Sorumluluk (Cevap)',
  'S2 - Okulda Sorumluluk (Puan)',
  'S3 - Okul Kurallari (Cevap)',
  'S3 - Okul Kurallari (Puan)',
  'S4 - Isbirligi (Cevap)',
  'S4 - Isbirligi (Puan)',
  'S5 - Iletisim (Cevap)',
  'S5 - Iletisim (Puan)',
  'S6 - Basari Anlayisi (Cevap)',
  'S6 - Basari Anlayisi (Puan)',
  'S7 - Okulu Konumlandirma (Cevap)',
  'S7 - Okulu Konumlandirma (Puan)'
];

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var sheet = getOrCreateSheet();

    var row = [
      new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }),
      data.event || '',
      data.fide_veli_adi || '',
      data.fide_telefon || '',
      data.fide_sinif || '',
      data.fide_skor !== undefined ? data.fide_skor : '',
      data.fide_sonuc || '',
      data.fide_remarketing_haric !== undefined ? data.fide_remarketing_haric : '',
      data.fide_cta_type || '',
      data.cevaplanan_soru !== undefined ? data.cevaplanan_soru : '',
      data.terk_adimi || ''
    ];

    // Soru cevaplarini ekle (7 soru x 2 sutun = 14 sutun)
    for (var i = 1; i <= 7; i++) {
      row.push(data['soru' + i + '_cevap'] || '');
      row.push(data['soru' + i + '_puan'] !== undefined ? data['soru' + i + '_puan'] : '');
    }

    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', message: 'Veri kaydedildi.' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'Fide webhook aktif.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Sayfayi bulur veya olusturur. Sayfa bossa header satirini ekler.
 */
function getOrCreateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  // Header satiri yoksa ekle
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#1b479d')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }

  return sheet;
}
