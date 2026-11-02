// v88: scrive in piccoli_imperi.html la riga `const BANDIERE = {...}`: un'unica immagine
// (WebP) con le bandiere di tutti i paesi, una casella 64x48 ciascuna.
// - i paesi di oggi: le bandiere di flag-icons (https://github.com/lipis/flag-icons, licenza MIT)
// - gli stati storici delle epoche: disegnate qui sotto (TABELLA), semplificate, una per ogni
//   nome e, se la bandiera e' cambiata, per ogni periodo; chi una bandiera non l'aveva (tribu',
//   popoli, sultanati di cui non resta un vessillo) riceve un drappo col suo simbolo
// Va rilanciato quando cambiano gli stati delle epoche o i paesi.
// uso: node build_bandiere.js [cartella di flag-icons]   (senza: la scarica con npm pack)
"use strict";
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const FILE = path.join(__dirname, 'piccoli_imperi.html');
const CELLA_W = 64, CELLA_H = 48, COLONNE = 24;

// ---------- flag-icons ----------
let FI = process.argv[2];
if (!FI) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'flagicons-'));
  cp.execSync('npm pack flag-icons@7.2.3 --silent', { cwd: tmp, stdio: ['ignore', 'pipe', 'inherit'] });
  cp.execSync('tar xzf flag-icons-7.2.3.tgz', { cwd: tmp });
  FI = path.join(tmp, 'package');
}
const svgIso = cc => fs.readFileSync(path.join(FI, 'flags', '4x3', cc + '.svg'), 'utf8');

// ---------- i dati del gioco ----------
let html = fs.readFileSync(FILE, 'utf8');
const riga = nome => { const m = html.match(new RegExp('^const ' + nome + ' = (.*);$', 'm')); return m && m[1]; };
const EPOCHE = JSON.parse(riga('EPOCHE'));
const MAPPE = JSON.parse(riga('MAPPE_FISSE'));
const iniz = html.indexOf('const COUNTRY_NAMES = {'), fine = html.indexOf('};', iniz);
const nomiOggi = [...html.slice(iniz, fine).matchAll(/\b([A-Z]{2}):'/g)].map(m => m[1]);
const iso = new Set([...nomiOggi, 'VA']);
for (const t of Object.values(MAPPE)) for (const p of t.paesi) if (/^[A-Z]{2}$/.test(p)) iso.add(p);

// ---------- le bandiere storiche ----------
// Una bandiera e' una lista di pezzi separati da ' + ', disegnati in ordine su 640x480:
//   iso:xx           la bandiera di oggi del paese xx (flag-icons)
//   bg:c             tutto il drappo di un colore
//   H:c1/c2/..       strisce orizzontali uguali   V:c1/c2/..  strisce verticali
//   Hn:c1/c2:n       n strisce orizzontali alternate
//   croce:c          croce centrata   nord:c  croce scandinava   decusse:c  croce di Sant'Andrea
//   tri:c            triangolo all'asta   bordo:c  cornice   banda:c  banda diagonale
//   scacchi:c1/c2:n  scacchiera n x n (scacchetto: piccola, al centro)   quadro:c  rettangolo nel cantone in alto
//   aquila:c aquila2:c leone:c giglio:c gigli:c torre:c corona:c luna:c lunastella:c
//   stella:c disco:c anelli:c arpa:c tridente:c palle:c ermellino:c mori:c catene:c tenda:c
//   (un simbolo puo' avere @x,y,s: centro e grandezza, in frazioni della bandiera)
//   unione1606 savoia scudoSavoia borgogna portogallo aragona   (le bandiere ricorrenti)
// Il valore e' una bandiera, oppure [[dal_anno, bandiera], ...] se e' cambiata col tempo.
const ITALIA_REGNO = 'V:#009246/#fff/#ce2b37 + scudoSavoia';
const SPAGNA = [[1000, 'borgogna'], [1785, 'H:#c60b1e/#ffc400/#ffc400/#c60b1e'], [1931, 'H:#c60b1e/#ffc400/#6c3b8c'],
  [1938, 'H:#c60b1e/#ffc400/#ffc400/#c60b1e + aquila:#000@0.5,0.5,0.4'], [1977, 'iso:es']];
const AUSTRIA_IMP = 'H:#000/#fc0';
const REICH = 'H:#000/#fff/#dd0000';
const PRUSSIA = 'bg:#fff + aquila:#111';
const POLONIA = 'bg:#dc143c + aquila:#fff';
const ISLAM = c => `bg:${c} + lunastella:#fff`;
const TABELLA = {
  'ADE|Aden britannica': 'iso:gb', 'APR|Protettorato di Aden': 'iso:gb',
  'AFG|Afghanistan': [[1886, 'bg:#000 + disco:#fff'], [1929, 'V:#000/#d32011/#007a36 + disco:#fff@0.5,0.5,0.4'],
    [1978, 'bg:#c00 + disco:#fc0@0.2,0.25,0.3'], [1980, 'H:#000/#d32011/#007a36 + disco:#fc0@0.2,0.25,0.3'],
    [1992, 'H:#007a36/#fff/#000'], [1996, 'bg:#fff'], [2002, 'iso:af']],
  'AFG|Emirato dell\'Afghanistan': 'bg:#000 + disco:#fff', 'AFG|Impero durrani': 'H:#000/#007a36 + lunastella:#fff',
  'ALB|Albania': 'iso:al', 'ALB|Principato d\'Albania': 'iso:al', 'ALB|Regno d\'Albania': 'iso:al', 'ALB|Repubblica albanese': 'iso:al',
  'ALF|Algeria francese': 'iso:fr', 'ALG|Algeria francese': 'iso:fr', 'ALG|Algeria': 'iso:dz',
  'ALG|Reggenza di Algeri': 'H:#c00/#fc0/#007a36/#fc0/#c00',
  'ALH|Califfato almohade': 'bg:#c8102e + scacchetto:#000/#fff:4', 'ALM|Califfato almohade': 'bg:#c8102e + scacchetto:#000/#fff:4',
  'ALM|Impero almoravide': 'bg:#fff + luna:#b8860b',
  'ANG|Impero angioino': 'bg:#c8102e + leone:#fcd116',
  'AOF|Africa occidentale francese': 'iso:fr', 'AOF|Sudan francese': 'iso:fr',
  'ARA|Contea d\'Aragona': 'aragona', 'ARA|Corona d\'Aragona': 'aragona',
  'ARM|Armenia': 'iso:am', 'ARM|Regno di Armenia': 'bg:#d90012 + leone:#f2a800',
  'ASS|Assia': 'H:#e2001a/#fff',
  'AUH|Impero austro-ungarico': AUSTRIA_IMP, 'AUS|Impero austro-ungarico': AUSTRIA_IMP, 'AUS|Impero d\'Austria': AUSTRIA_IMP,
  'AUS|Monarchia asburgica': AUSTRIA_IMP, 'AUT|Repubblica d\'Austria': 'iso:at',
  'AYY|Sultanato ayyubide': 'bg:#f5c400 + aquila:#c8102e',
  'AZE|Azerbaigian': 'iso:az',
  'BAD|Granducato di Baden': 'H:#fc0/#e2001a/#fc0', 'BAD|Margraviato di Baden': 'H:#fc0/#e2001a/#fc0',
  'BAT|Repubblica batava': 'iso:nl', 'OLA|Repubblica batava': 'iso:nl',
  'BAV|Elettorato di Baviera': 'scacchi:#fff/#0098d4:6', 'BAV|Regno di Baviera': 'scacchi:#fff/#0098d4:6',
  'BEL|Regno del Belgio': 'iso:be', 'BIE|Bielorussia': 'iso:by', 'BIH|Bosnia ed Erzegovina': 'iso:ba',
  'BIZ|Impero bizantino': 'bg:#9b111e + aquila2:#f2c300', 'BIZ|Impero di Nicea': 'bg:#9b111e + aquila2:#f2c300',
  'BOR|Contea di Borgogna': 'bg:#1d3f94 + leone:#f2c300', 'BOR|Franca Contea': 'borgogna',
  'BOS|Regno di Bosnia': 'bg:#1d3f94 + gigli:#f2c300', 'BOS|Bosnia-Erzegovina austriaca': 'H:#c00/#fc0', 'BOS|Bosnia-Erzegovina': 'H:#c00/#fc0',
  'BRE|Ducato di Bretagna': 'bg:#fff + ermellino:#000',
  'BUL|Bulgaria': 'iso:bg', 'BUL|Principato di Bulgaria': 'iso:bg', 'BUL|Regno di Bulgaria': 'iso:bg',
  'BUL|Impero bulgaro': 'bg:#9b111e + leone:#f2c300',
  'CAM|Camerun': 'iso:cm', 'CAM|Camerun francese': 'iso:fr', 'CBR|Camerun britannico': 'iso:gb', 'KAM|Camerun tedesco': REICH,
  'CAS|Contea di Castiglia': 'bg:#c8102e + torre:#f2c300', 'CAS|Regno di Castiglia': 'bg:#c8102e + torre:#f2c300',
  'CAS|Corona di Castiglia': 'bg:#c8102e + torre:#f2c300', 'LEO|Regno di León e Castiglia': 'bg:#c8102e + torre:#f2c300',
  'LEO|Regno di León': 'bg:#fff + leone:#7b2d8e',
  'CEC|Cecoslovacchia': 'iso:cz', 'CEK|Repubblica Ceca': 'iso:cz',
  'CIA|Ciad': 'iso:td', 'CIA|Ciad francese': 'iso:fr', 'CIP|Cipro': 'iso:cy', 'CIP|Cipro britannica': 'iso:gb',
  'CIS|Cisgiordania': 'iso:jo', 'CIS|Repubblica cisalpina': 'iso:it',
  'CIS|Regno d\'Italia napoleonico': 'bg:#c8102e + rombo:#fff + quadrino:#009246',
  'CIV|Costa d\'Avorio francese': 'iso:fr', 'COR|Califfato di Cordova': 'bg:#fff + luna:#007a36',
  'CRI|Khanato di Crimea': 'bg:#00a3dd + tridente:#fcd116',
  'CRO|Croazia': 'iso:hr', 'CRO|Regno di Croazia': 'scacchi:#e2001a/#fff:5',
  'DAH|Benin': [[1975, 'bg:#008751 + stella:#e8112d@0.2,0.2,0.3'], [1990, 'iso:bj']], 'DAH|Dahomey': 'iso:bj', 'DAH|Dahomey francese': 'iso:fr',
  'DAN|Danimarca e Norvegia': 'iso:dk', 'DAN|Regno di Danimarca': 'iso:dk',
  'DAZ|Città libera di Danzica': 'bg:#e2001a + croce2:#fff + corona:#f2c300@0.25,0.18,0.25',
  'DDR|Germania, zona sovietica': 'iso:de', 'DDR|Germania Est': [[1949, 'iso:de'], [1959, 'iso:de + disco:#fcd116@0.5,0.5,0.35']],
  'EAU|Emirati Arabi Uniti': 'iso:ae', 'EAU|Stati della Tregua': 'bg:#fff + quadrotto:#c8102e', 'TRU|Stati della Tregua': 'bg:#fff + quadrotto:#c8102e',
  'EGI|Egitto ottomano': 'iso:tr', 'EGI|Egitto di Mehmet Ali': 'bg:#c8102e + lune3:#fff', 'EGI|Chedivato d\'Egitto': 'bg:#c8102e + lune3:#fff',
  'EGI|Sultanato d\'Egitto': 'bg:#c8102e + lune3:#fff', 'EGI|Regno d\'Egitto': 'bg:#00843d + lunastella:#fff',
  'EGI|Repubblica egiziana': 'H:#ce1126/#fff/#000 + aquila:#c09300@0.5,0.5,0.3', 'EGI|Repubblica Araba Unita': 'iso:sy',
  'EGI|Egitto': [[1971, 'H:#ce1126/#fff/#000 + disco:#c09300@0.5,0.5,0.25'], [1984, 'iso:eg']],
  'ELV|Repubblica elvetica': 'H:#009a3d/#e2001a/#fcd116', 'SVI|Repubblica elvetica': 'H:#009a3d/#e2001a/#fcd116',
  'ENG|Regno d\'Inghilterra': 'iso:gb-eng', 'ENG|Inghilterra e Irlanda': 'iso:gb-eng', 'ENG|Commonwealth d\'Inghilterra': 'iso:gb-eng',
  'ENG|Regno d\'Inghilterra e d\'Irlanda': 'unione1606', 'GBR|Regno di Gran Bretagna': 'unione1606',
  'GBR|Regno Unito di Gran Bretagna e Irlanda': 'iso:gb', 'GBR|Regno Unito': 'iso:gb',
  'ERI|Eritrea': 'iso:er', 'ERI|Eritrea britannica': 'iso:gb', 'ERI|Eritrea italiana': ITALIA_REGNO,
  'EST|Estonia': 'iso:ee',
  'ETI|Etiopia': [[1974, 'H:#078930/#fcdd09/#da121a'], [1996, 'iso:et']], 'ETI|Impero etiope': 'H:#078930/#fcdd09/#da121a + leone:#da121a@0.5,0.5,0.4',
  'ETI|Impero d\'Etiopia': 'H:#078930/#fcdd09/#da121a',
  'FAS|Federazione dell\'Arabia del Sud': 'H:#000/#00843d/#00a3dd + lunastella:#fff',
  'FAT|Califfato fatimide': 'bg:#00843d + luna:#fff',
  'FIN|Finlandia': 'iso:fi', 'FIR|Repubblica di Firenze': 'bg:#fff + giglio:#c8102e',
  'FRA|Regno di Francia': [[1000, 'bg:#1d3f94 + gigli:#f2c300'], [1815, 'bg:#fff + gigli:#c9a227']],
  'FRA|Repubblica francese': 'iso:fr', 'FRA|Impero francese': 'iso:fr', 'FRA|Francia di Vichy': 'iso:fr',
  'GAL|Principato di Galizia-Volinia': 'bg:#1d3f94 + leone:#f2c300',
  'GAM|Gambia': 'iso:gm', 'GAM|Gambia britannica': 'iso:gb', 'GAM|Gambia britannico': 'iso:gb',
  'GBI|Guinea portoghese': [[1886, 'portogallo'], [1910, 'iso:pt']], 'GPO|Guinea portoghese': 'portogallo', 'GBI|Guinea-Bissau': 'iso:gw',
  'GEN|Repubblica di Genova': 'iso:gb-eng',
  'GEO|Georgia': 'iso:ge', 'GEO|Regno di Georgia': 'iso:ge',
  'GER|Impero tedesco': REICH, 'PRU|Impero tedesco': REICH, 'GER|Repubblica di Weimar': 'iso:de', 'GER|Germania nazista': REICH,
  'GIB|Gibuti': 'iso:dj', 'GIB|Somalia francese': 'iso:fr', 'GIB|Territorio degli Afar e degli Issa': 'iso:fr',
  'GIO|Regno di Giordania': 'iso:jo', 'GIO|Transgiordania britannica': 'iso:jo',
  'GRA|Emirato di Granada': 'bg:#c8102e + banda:#f2c300',
  'GRE|Regno di Grecia': 'bg:#0d5eaf + croce:#fff', 'GRE|Repubblica ellenica': 'iso:gr',
  'GUI|Guinea': 'iso:gn', 'GUI|Guinea francese': 'iso:fr',
  'HAN|Elettorato di Hannover': 'H:#fc0/#fff', 'HAN|Regno di Hannover': 'H:#fc0/#fff',
  'IND|India britannica': 'iso:gb', 'RAJ|Raj britannico': 'iso:gb',
  'IRL|Irlanda': 'iso:ie', 'IRL|Stato libero d\'Irlanda': 'iso:ie', 'IRL|Regno d\'Irlanda': 'bg:#169b62 + arpa:#f2c300',
  'IRQ|Iraq britannico': 'H:#000/#fff/#007a3d + tri:#ce1126', 'IRQ|Regno dell\'Iraq': 'H:#000/#fff/#007a3d + tri:#ce1126',
  'IRQ|Iraq': [[1958, 'V:#000/#fff/#007a3d + stella:#ce1126'], [1963, 'H:#ce1126/#fff/#000 + stelle3:#007a3d'], [2008, 'iso:iq']],
  'ISL|Islanda': 'iso:is', 'ISL|Regno d\'Islanda': 'iso:is', 'ISL|Islanda danese': 'iso:dk',
  'ISR|Israele': 'iso:il',
  'ITA|Regno d\'Italia': ITALIA_REGNO, 'SAR|Regno d\'Italia': ITALIA_REGNO, 'ITA|Repubblica italiana': 'iso:it',
  'JUG|Jugoslavia': 'H:#003893/#fff/#de0000 + stella:#de0000', 'JUG|Regno dei Serbi, Croati e Sloveni': 'H:#003893/#fff/#de0000',
  'JUG|Regno di Jugoslavia': 'H:#003893/#fff/#de0000', 'JUG|Serbia e Montenegro': 'H:#003893/#fff/#de0000',
  'KAL|Unione di Kalmar': 'bg:#fcd116 + nord:#c8102e',
  'KAZ|Kazakistan': 'iso:kz', 'KUW|Kuwait': 'iso:kw',
  'KIE|Rus\' di Kiev': 'bg:#c8102e + tridente:#f2c300', 'KIE|Principato di Kiev': 'bg:#c8102e + tridente:#f2c300',
  'RUS|Rus\' di Kiev': 'bg:#c8102e + tridente:#f2c300',
  'LAT|Impero latino': 'bg:#c8102e + croce:#f2c300',
  'LBA|Libia italiana': ITALIA_REGNO, 'LBA|Libia sotto gli Alleati': 'iso:gb', 'LBA|Regno di Libia': 'iso:ly',
  'LBA|Libia': [[1969, 'H:#ce1126/#fff/#000'], [1977, 'bg:#009a3d'], [2011, 'iso:ly']],
  'LET|Lettonia': 'iso:lv', 'LIB|Libano': 'iso:lb', 'LIB|Libano francese': 'iso:fr',
  'LIT|Granducato di Lituania': 'bg:#c1272d + leone:#fff', 'LIT|Lituania': 'iso:lt',
  'LOV|Regno Lombardo-Veneto': AUSTRIA_IMP, 'LUB|Città libera di Lubecca': 'H:#fff/#e2001a', 'LUX|Granducato di Lussemburgo': 'iso:lu',
  'MAC|Macedonia': 'iso:mk', 'MAM|Sultanato mamelucco': 'bg:#f5c400 + luna:#fff',
  'MAR|Marocco francese': 'iso:ma', 'MAR|Regno del Marocco': 'iso:ma', 'MAR|Sultanato del Marocco': 'bg:#c1272d',
  'MAR|Sultanato merinide del Marocco': 'bg:#c1272d + bordo:#f2c300',
  'MAU|Mauritania': 'iso:mr', 'MAU|Mauritania francese': 'iso:fr',
  'MEC|Ducato di Meclemburgo': 'H:#0057b8/#fcd116/#e2001a', 'MEC|Granducato di Meclemburgo': 'H:#0057b8/#fcd116/#e2001a',
  'MIL|Ducato di Milano': 'iso:gb-eng', 'MLI|Mali': 'iso:ml',
  'MOD|Ducato di Modena': 'bg:#fff + aquila:#1d3f94',
  'MOL|Moldavia': 'iso:md', 'MOL|Principato di Moldavia': 'bg:#c8102e + toro:#f2c300',
  'MON|Montenegro': 'iso:me', 'MON|Principato del Montenegro': 'H:#c8102e/#1d3f94/#fff', 'MON|Regno del Montenegro': 'H:#c8102e/#1d3f94/#fff',
  'MOS|Zarato di Russia': 'bg:#f2c300 + aquila2:#000', 'RUS|Zarato di Russia': 'bg:#f2c300 + aquila2:#000',
  'MOS|Granducato di Mosca': 'bg:#c8102e + aquila2:#f2c300',
  'MSP|Marocco spagnolo': 'bg:#c1272d + quadro:#fff + stella:#007a36@0.18,0.22,0.28', 'MSP|Marocco spagnolo del Sud': 'bg:#c1272d + quadro:#fff + stella:#007a36@0.18,0.22,0.28',
  'NAP|Regno delle Due Sicilie': 'bg:#fff + gigli:#c9a227@0.5,0.5,0.5', 'NAP|Regno di Napoli e Sicilia': 'bg:#fff + gigli:#c9a227@0.5,0.5,0.5',
  'NAV|Regno di Navarra': 'bg:#c8102e + catene:#f2c300', 'NAV|Regno d\'Aragona e Navarra': 'aragona',
  'NEA|Regno di Napoli': 'borgogna',
  'NEG|Emirati del Neged': 'iso:sa', 'NEG|Regno del Hegiaz e Neged': 'iso:sa', 'NEJ|Emirato del Najd': 'iso:sa', 'SAU|Arabia Saudita': 'iso:sa',
  'NGA|Nigeria': 'iso:ng', 'NGA|Nigeria britannica': 'iso:gb', 'NGA|Nigeria settentrionale britannica': 'iso:gb',
  'NIG|Niger': 'iso:ne', 'NIG|Niger francese': 'iso:fr',
  'NOR|Regno di Norvegia': [[1100, 'bg:#c8102e + leone:#f2c300'], [1821, 'iso:no']],
  'OLA|Repubblica delle Sette Province Unite': [[1581, 'H:#f47c00/#fff/#1d3f94'], [1660, 'iso:nl']],
  'OLA|Regno Unito dei Paesi Bassi': 'iso:nl', 'OLA|Regno dei Paesi Bassi': 'iso:nl',
  'OLD|Ducato di Oldenburg': 'bg:#0057b8 + nord:#e2001a',
  'OMA|Oman': 'iso:om', 'OMA|Sultanato di Mascate e Oman': 'bg:#c8102e', 'OMA|Imamato dell\'Oman': 'bg:#fff + spada:#c8102e',
  'OTT|Impero ottomano': 'iso:tr', 'OTT|Turchia': 'iso:tr', 'OTT|Sultanato ottomano': 'bg:#c8102e + luna:#fff',
  'PAB|Paesi Bassi asburgici': 'borgogna', 'PAB|Paesi Bassi spagnoli': 'borgogna', 'PAB|Paesi Bassi austriaci': 'borgogna',
  'PAK|Pakistan': 'iso:pk', 'PAL|Palestina britannica': 'iso:gb',
  'PAP|Stato della Chiesa': 'iso:va',
  'PAR|Ducato di Parma': 'bg:#f2c300 + gigli:#1d3f94',
  'PER|Impero safavide': 'bg:#00843d + leone:#f2c300', 'SAF|Impero safavide': 'bg:#00843d + leone:#f2c300',
  'PER|Persia': 'H:#239f40/#fff/#da0000 + leone:#c09300@0.5,0.5,0.3', 'PER|Iran': [[1935, 'H:#239f40/#fff/#da0000 + leone:#c09300@0.5,0.5,0.3'], [1980, 'iso:ir']],
  'PLL|Polonia-Lituania': POLONIA, 'PLL|Confederazione polacco-lituana': POLONIA, 'POL|Confederazione polacco-lituana': POLONIA,
  'POL|Ducati di Polonia': POLONIA, 'POL|Ducato di Polonia': POLONIA, 'POL|Regno di Polonia': POLONIA, 'POL|Polonia': 'iso:pl',
  'VAR|Ducato di Varsavia': 'iso:pl',
  'POR|Regno di Portogallo': 'portogallo', 'POR|Repubblica portoghese': 'iso:pt',
  'PRU|Ducato di Prussia': PRUSSIA, 'PRU|Brandeburgo-Prussia': PRUSSIA, 'PRU|Regno di Prussia': PRUSSIA,
  'QAT|Qatar': 'iso:qa', 'QAT|Qatar britannico': 'iso:qa',
  'RFT|Germania': 'iso:de', 'RFT|Germania Ovest': 'iso:de', 'RFT|Germania, zone occidentali': 'iso:de',
  'ROM|Principati Uniti di Romania': [[1859, 'H:#c8102e/#fcd116/#002b7f'], [1866, 'iso:ro']], 'ROM|Regno di Romania': 'iso:ro', 'ROM|Romania': 'iso:ro',
  'RUS|Impero russo': [[1721, 'bg:#f2c300 + aquila2:#000'], [1858, 'H:#000/#fcd116/#fff'], [1883, 'iso:ru']],
  'RUS|Russia sovietica': 'bg:#cc0000', 'RUS|Unione Sovietica': 'bg:#cc0000 + stella:#fcd116@0.17,0.2,0.22',
  'RUS|Federazione Russa': 'iso:ru',
  'SAH|Africa occidentale spagnola': SPAGNA, 'SAH|Sahara spagnolo': SPAGNA,
  'SAR|Sardegna': 'mori', 'SAR|Regno di Sardegna': [[1530, 'borgogna'], [1720, 'savoia'], [1848, ITALIA_REGNO]],
  'SAS|Elettorato di Sassonia': 'H:#fff/#009a3d', 'SAS|Regno di Sassonia': 'H:#fff/#009a3d',
  'SAV|Ducato di Savoia': 'savoia', 'SAV|Regno di Sardegna': 'savoia', 'SAV|Regno di Sicilia (Savoia)': 'savoia',
  'SCO|Regno di Scozia': 'iso:gb-sct',
  'SEN|Senegal': 'iso:sn', 'SEN|Senegal francese': 'iso:fr',
  'SER|Principato di Serbia': [[1000, 'bg:#c8102e + aquila2:#fff'], [1835, 'H:#c6363c/#0c4076/#fff']],
  'SER|Regno di Serbia': [[1300, 'bg:#c8102e + aquila2:#fff'], [1882, 'H:#c6363c/#0c4076/#fff']], 'SER|Serbia': 'iso:rs',
  'SIC|Regno di Sicilia': [[1200, 'bg:#f2c300 + aquila:#000'], [1282, 'aragona']], 'SIC|Regno di Napoli': 'bg:#1d3f94 + gigli:#f2c300',
  'SIR|Siria': [[1946, 'H:#007a3d/#fff/#000 + stelle3:#ce1126'], [1958, 'iso:sy']], 'SIR|Siria francese': 'iso:fr',
  'SLE|Sierra Leone britannica': 'iso:gb', 'SLK|Slovacchia': 'iso:sk', 'SLO|Slovenia': 'iso:si', 'SOB|Somalia britannica': 'iso:gb',
  'SOI|Somalia italiana': [[1890, ITALIA_REGNO], [1950, 'iso:it'], [1954, 'iso:so']], 'SOM|Somalia': 'iso:so',
  'SPA|Regno di Spagna': SPAGNA, 'SPA|Repubblica spagnola': 'H:#c60b1e/#ffc400/#6c3b8c', 'SPA|Spagna franchista': 'H:#c60b1e/#ffc400/#ffc400/#c60b1e + aquila:#000@0.5,0.5,0.4',
  'SRI|Sacro Romano Impero': [[1000, 'bg:#f2c300 + aquila:#000'], [1430, 'bg:#f2c300 + aquila2:#000']],
  'SUD|Sudan': [[1956, 'H:#0033a0/#fcd116/#007a3d'], [1970, 'iso:sd']], 'SUD|Sudan anglo-egiziano': 'iso:gb',
  'SVE|Circolo di Svevia': 'bg:#f2c300 + leone:#000',
  'SVI|Confederazione svizzera': 'iso:ch', 'SVI|Svizzera': 'iso:ch',
  'SVN|Svezia e Norvegia': 'iso:se', 'SWE|Svezia e Norvegia': 'iso:se', 'SWE|Impero svedese': 'iso:se',
  'SWE|Regno di Svezia': [[1000, 'bg:#006aa7 + corona:#fecc00'], [1520, 'iso:se']],
  'TEU|Ordine teutonico': 'bg:#fff + croce:#000',
  'TIM|Impero timuride': 'bg:#000 + anelli:#c8102e', 'TIM|Emirati timuridi': 'bg:#000 + anelli:#c8102e',
  'TKM|Turkmenistan': 'iso:tm', 'TOL|Contea di Tolosa': 'bg:#c8102e + croce:#f2c300',
  'TOS|Granducato di Toscana': 'bg:#f2c300 + palle:#c8102e',
  'TRE|Impero di Trebisonda': 'bg:#f2c300 + aquila:#c8102e',
  'TUN|Beilicato di Tunisi': [[1715, 'H:#c8102e/#007a36/#f2c300/#c8102e'], [1831, 'iso:tn']], 'TUN|Tunisia': 'iso:tn', 'TUN|Tunisia francese': 'iso:tn',
  'UCR|Ucraina': 'iso:ua',
  'UNG|Regno d\'Ungheria': [[1000, 'Hn:#c8102e/#fff:8'], [1848, 'iso:hu']], 'UNG|Ungheria': 'iso:hu', 'UZB|Uzbekistan': 'iso:uz',
  'VAL|Principato di Valacchia': 'bg:#1d3f94 + aquila:#f2c300',
  'VEN|Repubblica di Venezia': 'bg:#c8102e + leone:#f2c300',
  'VOL|Burkina Faso': 'iso:bf', 'VOL|Alto Volta': 'H:#000/#fff/#c8102e', 'VOL|Alto Volta francese': 'iso:fr',
  'WUR|Ducato del Württemberg': 'H:#000/#e2001a', 'WUR|Regno del Württemberg': 'H:#000/#e2001a',
  'YDS|Yemen del Sud': 'H:#ce1126/#fff/#000 + tri:#00a3dd + stella:#ce1126@0.12,0.5,0.22',
  'YEM|Regno dello Yemen': 'bg:#c8102e + spada:#fff', 'YEM|Repubblica Araba dello Yemen': 'H:#ce1126/#fff/#000 + stella:#007a3d@0.5,0.5,0.22',
  'YEM|Yemen': [[1000, ISLAM('#00843d')], [1990, 'iso:ye']],
  'MAK|Regno di Makuria': 'bg:#fff + croce:#7b2d8e', 'ALW|Regno di Alodia': 'bg:#fff + croce:#1d3f94',
  'SEL|Impero selgiuchide': 'bg:#1d3f94 + aquila2:#fff', 'SEL|Sultanato selgiuchide': 'bg:#1d3f94 + aquila2:#fff',
  'SEL|Sultanato selgiuchide di Rum': 'bg:#1d3f94 + aquila2:#fff',
  'ORD|Orda d\'Oro': 'bg:#f2c300 + tridente:#c8102e',
};
// chi non e' in tabella: un drappo col simbolo dello stato e due colori scelti dal suo codice
const DRAPPI = {
  '🌙': [['#00843d', 'lunastella:#fff'], ['#c8102e', 'lunastella:#fff'], ['#1d3f94', 'lunastella:#fff'], ['#000', 'lunastella:#fff'], ['#f2c300', 'lunastella:#c8102e'], ['#fff', 'lunastella:#00843d']],
  '⛺': [['#8b5a2b', 'tenda:#f3e2b3'], ['#556b2f', 'tenda:#f3e2b3'], ['#a0522d', 'tenda:#fff'], ['#6b4226', 'tenda:#f2c300'], ['#7a6a3a', 'tenda:#fff'], ['#2f4f4f', 'tenda:#f2c300']],
  '🏰': [['#c8102e', 'torre:#f2c300'], ['#1d3f94', 'torre:#fff'], ['#00843d', 'torre:#f2c300'], ['#7b2d8e', 'torre:#f2c300'], ['#000', 'torre:#f2c300'], ['#fff', 'torre:#c8102e']],
  '👑': [['#7b2d8e', 'corona:#f2c300'], ['#c8102e', 'corona:#f2c300'], ['#1d3f94', 'corona:#f2c300'], ['#00843d', 'corona:#f2c300']],
  '🏛️': [['#1d3f94', 'stella:#fff'], ['#c8102e', 'stella:#fff'], ['#00843d', 'stella:#fff']],
  '⛪': [['#fff', 'croce:#c8102e']], '⚓': [['#1d3f94', 'stella:#f2c300']], '🚩': [['#cc0000', 'stella:#fcd116@0.2,0.25,0.25']],
};
function drappo(cc, emblema) {
  const l = DRAPPI[emblema] || DRAPPI['🏰'];
  let h = 0; for (const ch of cc) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [bg, simbolo] = l[h % l.length];
  return `bg:${bg} + ${simbolo}`;
}

// ---------- che cosa disegnare ----------
const pezzi = [];         // { chiave, spec }
const indice = {};        // per l'iso: { 'it': n }, per gli storici: { 'COD|Nome': [[anno, n], ...] }
const perSpec = {};       // le bandiere uguali si disegnano una volta
const aggiungi = spec => (spec in perSpec) ? perSpec[spec] : (perSpec[spec] = pezzi.push(spec) - 1);
const usati = new Set();
for (const cc of [...iso].sort()) indice[cc.toLowerCase()] = aggiungi('iso:' + (cc === 'UK' ? 'gb' : cc.toLowerCase()));
const anni = Object.keys(EPOCHE).map(Number).sort((a, b) => a - b);
for (const a of anni) for (const [cc, st] of Object.entries(EPOCHE[a].stati)) {
  const k = cc + '|' + st.nome;
  usati.add(k);
  let v = TABELLA[k] || drappo(cc, st.emblema);
  if (typeof v === 'string') v = [[0, v]];
  let scelta = v[0][1];
  for (const [da, s] of v) if (a >= da) scelta = s;
  const n = aggiungi(scelta), l = indice[k] || (indice[k] = []);
  if (!l.length || l[l.length - 1][1] !== n) l.push([a, n]);
}
for (const k of Object.keys(TABELLA)) if (!usati.has(k)) console.warn('in tabella ma non nelle epoche:', k);
const isoUsati = new Set();
for (const s of pezzi) for (const m of s.matchAll(/iso:([a-z-]+)/g)) isoUsati.add(m[1]);
const sorgenti = {};
for (const c of isoUsati) sorgenti[c] = svgIso(c);
sorgenti.__al = svgIso('al'); sorgenti.__lk = svgIso('lk');

// ---------- disegno, nel browser ----------
(async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<html><body></body></html>');
  const out = await page.evaluate(async ({ pezzi, sorgenti, W, H, COL }) => {
    const ns = 'http://www.w3.org/2000/svg';
    // i simboli presi da flag-icons (l'aquila bicipite albanese, il leone dello Sri Lanka), in tinta unita
    const prendi = (src, sel) => {
      const d = new DOMParser().parseFromString(src, 'image/svg+xml');
      const g = d.querySelector(sel);
      const box = document.createElementNS(ns, 'svg');
      box.setAttribute('viewBox', '0 0 640 480');
      box.innerHTML = g.outerHTML;
      document.body.appendChild(box);
      const b = box.firstElementChild.getBBox();
      box.remove();
      return { g: g.outerHTML.replace(/ (fill|stroke|stroke-width|id)="[^"]*"/g, ''), b };
    };
    const al = new DOMParser().parseFromString(sorgenti.__al, 'image/svg+xml');
    const pathAl = al.querySelector('#al-a').getAttribute('d');
    const AQUILA2 = prendi(`<svg xmlns="${ns}"><g id="x"><path d="${pathAl}"/><path transform="matrix(-1 0 0 1 640 0)" d="${pathAl}"/></g></svg>`, '#x');
    const lk = new DOMParser().parseFromString(sorgenti.__lk, 'image/svg+xml');
    const LEONE = prendi(`<svg xmlns="${ns}"><g id="x">${lk.querySelector('#lk-b').innerHTML}</g></svg>`, '#x');
    let uid = 0;
    // un simbolo dentro un riquadro di lato s*480, centrato in (x*640, y*480)
    const metti = (vb, corpo, c, x, y, s) => {
      const h = s * 480, w = h * vb[2] / vb[3];
      return `<svg x="${x * 640 - w / 2}" y="${y * 480 - h / 2}" width="${w}" height="${h}" viewBox="${vb.join(' ')}" fill="${c}">${corpo}</svg>`;
    };
    const daBox = (sim, c, x, y, s) => {
      const b = sim.b, lato = Math.max(b.width, b.height);
      return metti([b.x - (lato - b.width) / 2, b.y - (lato - b.height) / 2, lato, lato], sim.g, c, x, y, s);
    };
    const stella = (cx, cy, r) => {
      const p = [];
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.4 : r; p.push((cx + rr * Math.cos(a)).toFixed(1) + ',' + (cy + rr * Math.sin(a)).toFixed(1)); }
      return `<polygon points="${p.join(' ')}"/>`;
    };
    const luna = (cx, cy, r, ruota = 0) => {
      const id = 'm' + (uid++);
      return `<mask id="${id}"><rect x="-1000" y="-1000" width="3000" height="3000" fill="#000"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff"/><circle cx="${cx + r * 0.35}" cy="${cy - r * 0.05}" r="${r * 0.82}" fill="#000"/></mask><rect x="-1000" y="-1000" width="3000" height="3000" mask="url(#${id})" transform="rotate(${ruota} ${cx} ${cy})"/>`;
    };
    const SIMBOLI = {
      // in un riquadro 100x100
      aquila: [[0, 0, 100, 100], '<circle cx="50" cy="16" r="8"/><polygon points="57,14 66,18 57,20"/><rect x="45" y="20" width="10" height="10"/><ellipse cx="50" cy="48" rx="12" ry="20"/>'
        + '<polygon points="42,34 6,14 12,28 2,32 12,40 4,46 14,52 8,58 42,58"/><polygon points="58,34 94,14 88,28 98,32 88,40 96,46 86,52 92,58 58,58"/>'
        + '<polygon points="42,64 58,64 66,92 50,84 34,92"/><polygon points="40,60 26,76 32,78 44,66"/><polygon points="60,60 74,76 68,78 56,66"/>'],
      giglio: [[0, 0, 100, 100], '<path d="M50 4C40 22 38 40 46 56H42C32 40 12 38 8 54C6 66 20 72 26 62C20 64 16 58 22 54C30 50 38 56 40 60H32V68H68V60H60C62 56 70 50 78 54C84 58 80 64 74 62C80 72 94 66 92 54C88 38 68 40 58 56H54C62 40 60 22 50 4Z"/><path d="M45 68H55L54 90C53 96 47 96 46 90Z"/>'],
      torre: [[0, 0, 100, 100], '<path d="M14 92V44H22V36H32V44H40V36H44V18H38V8H46V14H54V8H62V18H56V36H60V44H68V36H78V44H86V92Z"/>'],
      corona: [[0, 0, 100, 100], '<path d="M10 78V30L30 52L50 18L70 52L90 30V78Z"/><rect x="8" y="80" width="84" height="10"/>'],
      tenda: [[0, 0, 100, 100], '<path d="M50 8L94 90H6Z"/><rect x="47" y="2" width="6" height="12"/>'],
      tridente: [[0, 0, 100, 100], '<path d="M44 96V60H22C14 60 10 52 10 44V8H20V44C20 48 22 50 26 50H44V22L50 6L56 22V50H74C78 50 80 48 80 44V8H90V44C90 52 86 60 78 60H56V96Z"/>'],
      arpa: [[0, 0, 100, 100], '<path d="M20 8C40 4 60 14 90 10L82 24C60 26 40 20 30 22L30 90H18Z"/><path d="M28 88L80 22L86 26L34 92Z"/><path d="M40 30V78M52 28V64M64 26V50" stroke-width="3" stroke="currentColor"/>'],
      spada: [[0, 0, 100, 100], '<polygon points="8,62 80,40 92,38 82,46 10,68"/><rect x="18" y="50" width="6" height="26" transform="rotate(-17 21 63)"/>'],
      anelli: [[0, 0, 100, 100], '<g fill="none" stroke-width="9" stroke="currentColor"><circle cx="50" cy="30" r="17"/><circle cx="28" cy="68" r="17"/><circle cx="72" cy="68" r="17"/></g>'],
      toro: [[0, 0, 100, 100], '<path d="M30 30C20 30 8 22 6 8C14 16 22 18 32 18H68C78 18 86 16 94 8C92 22 80 30 70 30L66 70C64 84 58 92 50 92C42 92 36 84 34 70Z"/>'],
    };
    const pezzo = (op, arg, pos) => {
      const cs = (arg || '').split('/');
      const c = cs[0];
      const [px, py, ps] = pos || [];
      const x = px ?? 0.5, y = py ?? 0.5;
      switch (op) {
        case 'iso': return `<svg x="0" y="0" width="640" height="480" viewBox="0 0 640 480">${sorgenti[arg].replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')}</svg>`;
        case 'bg': return `<rect width="640" height="480" fill="${c}"/>`;
        case 'H': return cs.map((k, i) => `<rect y="${480 * i / cs.length}" width="640" height="${480 / cs.length + 0.5}" fill="${k}"/>`).join('');
        case 'V': return cs.map((k, i) => `<rect x="${640 * i / cs.length}" width="${640 / cs.length + 0.5}" height="480" fill="${k}"/>`).join('');
        case 'Hn': { const [a, n] = arg.split(':'), [k1, k2] = a.split('/'); let s = ''; for (let i = 0; i < +n; i++) s += `<rect y="${480 * i / n}" width="640" height="${480 / n + 0.5}" fill="${i % 2 ? k2 : k1}"/>`; return s; }
        case 'croce': return `<rect x="270" width="100" height="480" fill="${c}"/><rect y="190" width="640" height="100" fill="${c}"/>`;
        case 'croce2': return `<g fill="${c}"><rect x="140" y="120" width="40" height="130"/><rect x="95" y="165" width="130" height="40"/><rect x="140" y="290" width="40" height="130"/><rect x="95" y="335" width="130" height="40"/></g>`;
        case 'nord': return `<rect x="180" width="90" height="480" fill="${c}"/><rect y="195" width="640" height="90" fill="${c}"/>`;
        case 'decusse': return `<path d="M0 0L640 480M640 0L0 480" stroke="${c}" stroke-width="70"/>`;
        case 'tri': return `<path d="M0 0L${ps ? ps * 640 : 260} 240L0 480Z" fill="${c}"/>`;
        case 'bordo': return `<rect x="20" y="20" width="600" height="440" fill="none" stroke="${c}" stroke-width="40"/>`;
        case 'banda': return `<path d="M0 0L640 480" stroke="${c}" stroke-width="110"/>`;
        case 'quadro': return `<rect width="280" height="210" fill="${c}"/>`;
        case 'quadrotto': return `<rect x="110" y="90" width="420" height="300" fill="${c}"/>`;
        case 'rombo': return `<polygon points="320,40 600,240 320,440 40,240" fill="${c}"/>`;
        case 'quadrino': return `<rect x="220" y="140" width="200" height="200" fill="${c}"/>`;
        case 'scacchi': case 'scacchetto': { // tutto il drappo (Croazia, Baviera) o un quadro al centro (almohadi)
          const [a, n] = arg.split(':'), [k1, k2] = a.split('/'), m = +n, tutto = op === 'scacchi';
          const w = tutto ? 640 : 220, h = tutto ? 480 : 220, x0 = 320 - w / 2, y0 = 240 - h / 2;
          let s = ''; for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) s += `<rect x="${x0 + w * j / m}" y="${y0 + h * i / m}" width="${w / m + 0.5}" height="${h / m + 0.5}" fill="${(i + j) % 2 ? k2 : k1}"/>`; return s; }
        case 'aquila2': return daBox(AQUILA2, c, x, y, ps || 0.75);
        case 'leone': return daBox(LEONE, c, x, y, ps || 0.72);
        case 'gigli': { const s = ps || 0.5; return ['0.3,0.3', '0.7,0.3', '0.5,0.7'].map(p => { const [a, b] = p.split(',').map(Number); return metti(...SIMBOLI.giglio, c, x + (a - 0.5) * s * 1.1, y + (b - 0.5) * s * 1.2, s * 0.5); }).join(''); }
        case 'stella': return `<g fill="${c}">${stella(x * 640, y * 480, (ps || 0.45) * 240)}</g>`;
        case 'stelle3': return `<g fill="${c}">${[0.3, 0.5, 0.7].map(a => stella(a * 640, 240, 60)).join('')}</g>`;
        case 'disco': return `<circle cx="${x * 640}" cy="${y * 480}" r="${(ps ?? 0.45) * 240}" fill="${c}"/>`;
        case 'luna': return `<g fill="${c}">${luna(x * 640, y * 480, (ps || 0.55) * 240)}</g>`;
        case 'lunastella': return `<g fill="${c}">${luna(x * 640 - 30, y * 480, (ps || 0.5) * 240)}${stella(x * 640 + 70, y * 480, (ps || 0.5) * 90)}</g>`;
        case 'lune3': return `<g fill="${c}">${[[0.3, 0.5], [0.52, 0.3], [0.52, 0.7]].map(([a, b]) => luna(a * 640, b * 480, 70) + stella(a * 640 + 50, b * 480, 26)).join('')}</g>`;
        case 'palle': return `<g fill="${c}">${[[0.5, 0.2], [0.35, 0.4], [0.65, 0.4], [0.35, 0.62], [0.65, 0.62], [0.5, 0.82]].map(([a, b]) => `<circle cx="${a * 640}" cy="${b * 480}" r="42"/>`).join('')}</g>`;
        case 'ermellino': { let s = ''; for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { const cx = 90 + i * 150 + (j % 2) * 75, cy = 90 + j * 150; s += `<path d="M${cx} ${cy - 40}L${cx + 18} ${cy + 30}L${cx} ${cy + 20}L${cx - 18} ${cy + 30}Z"/><circle cx="${cx}" cy="${cy - 46}" r="9"/><circle cx="${cx - 16}" cy="${cy - 36}" r="9"/><circle cx="${cx + 16}" cy="${cy - 36}" r="9"/>`; } return `<g fill="${c}">${s}</g>`; }
        case 'catene': return `<g fill="none" stroke="${c}" stroke-width="34"><rect x="40" y="40" width="560" height="400"/><path d="M320 40V440M40 240H600M40 40L600 440M600 40L40 440"/></g><circle cx="320" cy="240" r="50" fill="#00843d"/>`;
        case 'unione1606': return '<rect width="640" height="480" fill="#012169"/><path d="M0 0L640 480M640 0L0 480" stroke="#fff" stroke-width="80"/><rect x="250" width="140" height="480" fill="#fff"/><rect y="170" width="640" height="140" fill="#fff"/><rect x="275" width="90" height="480" fill="#c8102e"/><rect y="195" width="640" height="90" fill="#c8102e"/>';
        case 'savoia': return '<rect width="640" height="480" fill="#d52b1e"/><rect x="270" width="100" height="480" fill="#fff"/><rect y="190" width="640" height="100" fill="#fff"/>';
        case 'scudoSavoia': return '<path d="M245 130H395V260C395 310 360 345 320 360C280 345 245 310 245 260Z" fill="#1d3f94"/><path d="M257 142H383V258C383 300 355 330 320 344C285 330 257 300 257 258Z" fill="#d52b1e"/><rect x="306" y="142" width="28" height="200" fill="#fff"/><rect x="257" y="215" width="126" height="28" fill="#fff"/>';
        case 'borgogna': return '<rect width="640" height="480" fill="#fff"/><path d="M60 40L580 440M580 40L60 440" stroke="#c8102e" stroke-width="56" stroke-dasharray="70 14"/>';
        case 'portogallo': return '<rect width="320" height="480" fill="#0039a6"/><rect x="320" width="320" height="480" fill="#fff"/><path d="M250 170H390V280C390 320 360 345 320 355C280 345 250 320 250 280Z" fill="#fff" stroke="#c8102e" stroke-width="18"/><g fill="#0039a6"><rect x="305" y="205" width="30" height="34"/><rect x="305" y="255" width="30" height="34"/><rect x="272" y="230" width="30" height="34"/><rect x="338" y="230" width="30" height="34"/></g><path d="M260 160V110L290 135L320 95L350 135L380 110V160Z" fill="#f2c300"/>';
        case 'aragona': return Array.from({ length: 9 }, (_, i) => `<rect x="${640 * i / 9}" width="${640 / 9 + 0.5}" height="480" fill="${i % 2 ? '#da121a' : '#fcdd09'}"/>`).join('');
        case 'mori': return '<rect width="640" height="480" fill="#fff"/><rect x="290" width="60" height="480" fill="#c8102e"/><rect y="210" width="640" height="60" fill="#c8102e"/><g fill="#000">' + [[145, 105], [495, 105], [145, 375], [495, 375]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="55"/>`).join('') + '</g>';
        default:
          if (SIMBOLI[op]) return metti(...SIMBOLI[op], c, x, y, ps || 0.62).replace('<svg ', `<svg color="${c}" `);
          throw new Error('pezzo sconosciuto: ' + op);
      }
    };
    const disegna = spec => spec.split(' + ').map(t => {
      const [testa, pos] = t.split('@');
      const i = testa.indexOf(':');
      const op = i < 0 ? testa : testa.slice(0, i), arg = i < 0 ? '' : testa.slice(i + 1);
      return pezzo(op, arg, pos && pos.split(',').map(Number));
    }).join('');
    const righe = Math.ceil(pezzi.length / COL);
    const cv = document.createElement('canvas');
    cv.width = COL * W; cv.height = righe * H;
    const ctx = cv.getContext('2d');
    for (let n = 0; n < pezzi.length; n++) {
      const svg = `<svg xmlns="${ns}" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 640 480" width="${W * 4}" height="${H * 4}">${disegna(pezzi[n])}</svg>`;
      const img = new Image();
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      await img.decode().catch(e => { throw new Error('bandiera ' + n + ' ' + pezzi[n] + ': ' + e.message); });
      ctx.drawImage(img, (n % COL) * W, Math.floor(n / COL) * H, W, H);
    }
    return { webp: cv.toDataURL('image/webp', 0.9), png: cv.toDataURL('image/png'), righe };
  }, { pezzi, sorgenti, W: CELLA_W, H: CELLA_H, COL: COLONNE });
  await browser.close();
  const img = out.webp;
  fs.writeFileSync(path.join(os.tmpdir(), 'bandiere.png'), Buffer.from(out.png.split(',')[1], 'base64'));
  const dati = { img, w: CELLA_W, h: CELLA_H, col: COLONNE, righe: out.righe, k: indice };
  const nuova = 'const BANDIERE = ' + JSON.stringify(dati) + ';\n';
  const RIGA = /^const BANDIERE = .*\n/m;
  if (RIGA.test(html)) html = html.replace(RIGA, () => nuova);
  else html = html.replace(/^(const EPOCHE = .*\n)/m, m => m + nuova);
  fs.writeFileSync(FILE, html);
  console.log(`${pezzi.length} bandiere (${iso.size} di oggi), immagine ${(img.length / 1024).toFixed(0)} KB; anteprima in ${path.join(os.tmpdir(), 'bandiere.png')}`);
})().catch(e => { console.error(e); process.exit(1); });
