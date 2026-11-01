# Costruisce gli stati storici delle epoche di Piccoli Imperi: istantanee dal 1000 al 1960
# (v80: 1000 1100 1200 1300 1400 1500 1530 1600 1650 1700 1715 1783 1800 1815 1880 1900 1914 1920
# 1930 1938 1945 1960); nel gioco si sceglie un anno qualsiasi e vale l'istantanea precedente.
#
# Fonte: historical-basemaps di Andre Ourednik (https://github.com/aourednik/historical-basemaps),
# un GeoJSON per anno con i confini degli stati del mondo. Licenza GPL-3.0: i dati derivati
# (la riga "const EPOCHE = ..." del gioco) restano sotto GPL-3.0.
#
# Passi:
#   1) scarica i GeoJSON in una cartella DIR:
#        for y in 1000 1100 1200 1300 1400 1500 1530 1600 1650 1700 1715 1783 1800 1815 1880 1900 1914 1920 1930 1938 1945 1960; do curl -s -o DIR/world_$y.geojson \
#          https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/world_$y.geojson; done
#   2) esporta le caselle di terra (fiumi compresi) di ogni taglia:
#        cat stub.js game.js export_tiles.js > _run.js && FIUMI=1 OUT=tiles.json node _run.js
#   3) python3 build_epoche.py DIR tiles.json piccoli_imperi.html [ANTEPRIME]
#        assegna a ogni casella lo stato della sua epoca e riscrive la riga "const EPOCHE = ..."
#        nel gioco; con ANTEPRIME scrive anche un'immagine per epoca (serve Pillow)
#
# Regole: una casella prende lo stato del poligono piu' piccolo che la contiene; se nessun
# poligono la contiene (coste un po' diverse, isolette) prende il piu' vicino con un nome entro
# 1.5 gradi. I poligoni
# senza nome (il Sahara, per esempio) restano terra di nessuno. CORREZIONI forza lo stato sulle
# caselle di un paese di oggi, dove i dati sono sbagliati. Gli stati con meno di MIN_CASELLE
# caselle sulla mappa piccola si uniscono al vicino che li circonda di piu'.
# Dipendenze: pip install shapely numpy (Pillow per le anteprime)
import sys, re, json
import numpy as np

MIN_CASELLE = 3
NEAREST_GRADI = 1.5

# emblemi: 👑 impero  🏰 regno o principato  🌙 stato islamico  ⛺ popoli e orde
#          🏛️ repubblica  ⛪ Stato della Chiesa  ⚓ Venezia  🚩 Unione Sovietica
EPOCHE = {
  '1000': {
    'titolo': "L'anno Mille",
    'stati': {
      'UGR': ('Popoli ugrofinnici della taiga', '⛺'), 'RUS': ("Rus' di Kiev", '🏰'),
      'FAT': ('Califfato fatimide', '🌙'), 'VBU': ('Bulgari del Volga', '🌙'),
      'BIZ': ('Impero bizantino', '👑'), 'SRI': ('Sacro Romano Impero', '👑'),
      'PEC': ('Peceneghi', '⛺'), 'COR': ('Califfato di Cordova', '🌙'),
      'FRA': ('Regno di Francia', '🏰'), 'BUL': ('Impero bulgaro', '🏰'),
      'KHZ': ('Cazari', '⛺'), 'SAM': ('Sami', '⛺'), 'UNG': ("Regno d'Ungheria", '🏰'),
      'KIP': ('Khaganato dei Kimek e dei Kipchak', '⛺'), 'ENG': ("Regno d'Inghilterra", '🏰'),
      'KAR': ('Careliani', '⛺'), 'CEL': ('Regni celtici', '🏰'), 'LEO': ('Regno di León', '🏰'),
      'ALA': ('Alani', '⛺'), 'BOR': ('Regno di Borgogna', '🏰'), 'GEO': ('Regno di Georgia', '🏰'),
      'SCO': ('Regno di Scozia', '🏰'), 'ARM': ('Regno di Armenia', '🏰'),
      'BUY': ('Emirati buyidi', '🌙'), 'POM': ('Pomerania', '🏰'), 'CAS': ('Contea di Castiglia', '🏰'),
      'SER': ('Principato di Serbia', '🏰'), 'POL': ('Ducato di Polonia', '🏰'),
      'NAV': ('Regno di Navarra', '🏰'), 'CRO': ('Regno di Croazia', '🏰'),
      'BEN': ('Principato di Benevento', '🏰'), 'BRE': ('Ducato di Bretagna', '🏰'),
      'SIC': ('Emirato di Sicilia', '🌙'), 'SAR': ('Giudicati di Sardegna', '🏰'),
      'CIU': ('Ciudi', '⛺'), 'ARA': ("Contea d'Aragona", '🏰'), 'COS': ('Corsica', '🏰'),
      'FIN': ('Finni', '⛺'), 'DAN': ('Danimarca e Norvegia', '🏰'),
      'VEN': ('Repubblica di Venezia', '⚓'), 'GUA': ('Guanci', '⛺'), 'BAL': ('Tribù baltiche', '⛺'),
      # le terre aggiunte nella v65
      'ISL': ('Stato libero islandese', '🏛️'), 'SWE': ('Regno di Svezia', '🏰'),
    },
    'nomi': {
      'Finno-Ugric taiga hunter-gatherers': 'UGR', 'Paleo-Siberian hunter-gatherers': 'UGR',
      'Kyivan Rus': 'RUS', 'Fatimid Caliphate': 'FAT', 'Volga Bulgars': 'VBU', 'Byzantine Empire': 'BIZ',
      'Cyprus': 'BIZ', 'Holy Roman Empire': 'SRI', 'Duchy of Swabia': 'SRI', 'Peshemegs': 'PEC',
      'Caliphate of Córdoba': 'COR', 'Kingdom of France': 'FRA', 'Bulgar Khanate': 'BUL', 'Khazars': 'KHZ',
      'Samis': 'SAM', 'Magyars': 'UNG', 'Kimek-Kipchak khaganate': 'KIP', 'England': 'ENG',
      'Karelians': 'KAR', 'Celtic kingdoms': 'CEL', 'León': 'LEO', 'Alans': 'ALA', 'Burgandy': 'BOR',
      'Kingdom of Georgia': 'GEO', 'Scotland': 'SCO', 'Armenia': 'ARM', 'Buwayhid Emirates': 'BUY',
      'Pomerania': 'POM', 'Castilla': 'CAS', 'Serbia': 'SER', 'Poland': 'POL', 'Navarre': 'NAV',
      'Croatia': 'CRO', 'Duchy of Benevento': 'BEN', 'Britany': 'BRE', 'Emirate of Sicily': 'SIC',
      'Sardinia': 'SAR', 'Chuds': 'CIU', 'Aragón': 'ARA', 'Corsica': 'COS', 'Suomi': 'FIN',
      'Denmark-Norway': 'DAN', 'Venice': 'VEN', 'Guanches': 'GUA', 'Baltic tribes': 'BAL',
      'Icelandic Commonwealth': 'ISL', 'Sweden': 'SWE', 'Kurs': 'BAL', 'Prussians': 'BAL',
    },
    'correzioni': {},
  },
  '1500': {
    'titolo': 'Il Rinascimento',
    'stati': {
      'MOS': ('Granducato di Mosca', '🏰'), 'ORD': ("Orda d'Oro", '⛺'), 'OTT': ('Impero ottomano', '🌙'),
      'SRI': ('Sacro Romano Impero', '👑'), 'MAM': ('Sultanato mamelucco', '🌙'),
      'PLL': ('Polonia-Lituania', '🏰'), 'FRA': ('Regno di Francia', '🏰'),
      'CRI': ('Khanato di Crimea', '🌙'), 'OBI': ('Orda Bianca', '⛺'), 'CAS': ('Corona di Castiglia', '🏰'),
      'UNG': ("Regno d'Ungheria", '🏰'), 'ZAY': ('Regno di Tlemcen', '🌙'),
      'ENG': ("Regno d'Inghilterra", '🏰'), 'ARA': ("Corona d'Aragona", '🏰'),
      'HAF': ('Sultanato hafside', '🌙'), 'AKK': ('Ak Koyunlu, i Montoni Bianchi', '🌙'),
      'WAT': ('Sultanato wattaside', '🌙'), 'KAL': ('Unione di Kalmar', '🏰'),
      'POR': ('Regno di Portogallo', '🏰'), 'SCO': ('Regno di Scozia', '🏰'),
      'GEO': ('Regno di Georgia', '🏰'), 'VEN': ('Repubblica di Venezia', '⚓'),
      'PAP': ('Stato della Chiesa', '⛪'), 'PSK': ('Repubblica di Pskov', '🏛️'),
      'SVI': ('Confederazione svizzera', '🏛️'), 'RYA': ('Principato di Rjazan', '🏰'),
      'BRE': ('Ducato di Bretagna', '🏰'), 'NAV': ('Regno di Navarra', '🏰'), 'SAM': ('Sami', '⛺'),
    },
    'nomi': {
      'Grand Duchy of Moscow': 'MOS', 'Novgorod-Seversky': 'MOS', 'Golden Horde': 'ORD',
      'Ottoman Empire': 'OTT', 'Holy Roman Empire': 'SRI', 'Mamluke Sultanate': 'MAM',
      'Poland-Lithuania': 'PLL', 'Teutonic Knights': 'PLL', 'France': 'FRA', 'Crimean Khanate': 'CRI',
      'White Horde': 'OBI', 'Castille': 'CAS', 'Guanches': 'CAS', 'Imperial Hungary': 'UNG',
      'Zayyanid Caliphate': 'ZAY', 'England': 'ENG', 'Aragón': 'ARA', 'Hafsid Caliphate': 'HAF',
      'Emirate of the White Sheep Turks': 'AKK', 'Wattasid Caliphate': 'WAT', 'Kalmar Union': 'KAL',
      'Portugal': 'POR', 'Scotland': 'SCO', 'Georgia': 'GEO', 'Venice': 'VEN', 'Cyprus': 'VEN',
      'Papal States': 'PAP', 'Pskov': 'PSK', 'Swiss Confederation': 'SVI', 'Ryazan': 'RYA',
      'Britany': 'BRE', 'Navarre': 'NAV', 'Sámi': 'SAM',
    },
    'correzioni': {},
  },
  '1800': {
    'titolo': "L'età napoleonica",
    'stati': {
      'RUS': ('Impero russo', '👑'), 'OTT': ('Impero ottomano', '🌙'), 'FRA': ('Repubblica francese', '🏛️'),
      'AUS': ('Monarchia asburgica', '👑'), 'SPA': ('Regno di Spagna', '🏰'),
      'MAR': ('Sultanato del Marocco', '🌙'), 'ALG': ('Reggenza di Algeri', '🌙'),
      'GBR': ('Regno di Gran Bretagna', '🏰'), 'KAZ': ('Khanati kazaki', '⛺'),
      'IRL': ("Regno d'Irlanda", '🏰'), 'SVE': ('Circolo di Svevia', '🏰'),
      'NAP': ('Regno di Napoli e Sicilia', '🏰'), 'PRU': ('Regno di Prussia', '🏰'),
      'TUN': ('Beilicato di Tunisi', '🌙'), 'POR': ('Regno di Portogallo', '🏰'),
      'TRI': ('Reggenza di Tripoli', '🌙'), 'HAN': ('Elettorato di Hannover', '🏰'),
      'SAR': ('Regno di Sardegna', '🏰'), 'BAT': ('Repubblica batava', '🏛️'),
      'SAS': ('Elettorato di Sassonia', '🏰'), 'PAP': ('Stato della Chiesa', '⛪'),
      'BAV': ('Elettorato di Baviera', '🏰'), 'ELV': ('Repubblica elvetica', '🏛️'),
      'TOS': ('Granducato di Toscana', '🏰'), 'MEC': ('Ducato di Meclemburgo', '🏰'),
      'SWE': ('Regno di Svezia', '🏰'), 'CIS': ('Repubblica cisalpina', '🏛️'),
      'WUR': ('Ducato del Württemberg', '🏰'), 'BAD': ('Margraviato di Baden', '🏰'),
      'DAN': ('Danimarca e Norvegia', '🏰'), 'MOD': ('Ducato di Modena', '🏰'),
      'PAR': ('Ducato di Parma', '🏰'), 'OLD': ('Ducato di Oldenburg', '🏰'),
      'GER': ('Stati tedeschi minori', '🏰'), 'PER': ('Persia', '🌙'),
    },
    'nomi': {
      'Russian Empire': 'RUS', 'Ottoman Empire': 'OTT', 'France': 'FRA', 'Austrian Netherlands': 'FRA',
      'Luxembourg': 'FRA', 'Austrian Empire': 'AUS', 'Venetia': 'AUS', 'Spain': 'SPA', 'Guanches': 'SPA',
      'Morocco': 'MAR', 'Algiers': 'ALG', 'United Kingdom': 'GBR', 'central Asian khanates': 'KAZ',
      'Kingdom of Ireland': 'IRL', 'Swabia': 'SVE', 'Kingdom of the Two Sicilies': 'NAP',
      'Prussia': 'PRU', 'Tunis': 'TUN', 'Portugal': 'POR', 'Tripolitania': 'TRI', 'Cyrenaica': 'TRI',
      # nei dati l'Hannover (della corona britannica) e' scritto Mecklenburg-Strelitz
      'Mecklenburg-Strelitz': 'HAN', 'Hanover': 'HAN', 'Kingdom of Sardinia': 'SAR',
      'Batavian Republic': 'BAT', 'Saxony': 'SAS', 'Papal States': 'PAP', 'Bavaria': 'BAV',
      'Helvetic Republic': 'ELV', 'Tuscany': 'TOS', 'Lucca': 'TOS', 'Pontremoli': 'TOS',
      'Mecklenburg-Schwerin': 'MEC', 'Sweden': 'SWE', 'Lombardy': 'CIS', 'Württemberg': 'WUR',
      'Baden': 'BAD', 'Holstein': 'DAN', 'Denmark-Norway': 'DAN', 'Modena': 'MOD', 'Parma': 'PAR',
      'Oldenburg': 'OLD', 'Anhalt': 'GER', 'Thuringia': 'GER', 'Lippe-Detmold': 'GER',
      'Brunswick': 'GER', 'Waldeck': 'GER', 'Hamburg': 'GER', 'Schaumburg-Lippe': 'GER',
      'Hohenzollern': 'GER', 'Persia': 'PER', 'Finnmark': 'DAN',
    },
    'correzioni': {},
  },
  '1914': {
    'titolo': 'La vigilia della Grande Guerra',
    'stati': {
      'RUS': ('Impero russo', '👑'), 'ALG': ('Algeria francese', '🏰'), 'OTT': ('Impero ottomano', '🌙'),
      'LIB': ('Libia italiana', '🏰'), 'FRA': ('Repubblica francese', '🏛️'),
      'AUH': ('Impero austro-ungarico', '👑'), 'SPA': ('Regno di Spagna', '🏰'),
      'GER': ('Impero tedesco', '👑'), 'GBR': ('Regno Unito', '👑'), 'EGI': ("Sultanato d'Egitto", '🌙'),
      'MAR': ('Marocco francese', '🌙'), 'ITA': ("Regno d'Italia", '🏰'), 'ROM': ('Regno di Romania', '🏰'),
      'BUL': ('Regno di Bulgaria', '🏰'), 'TUN': ('Tunisia francese', '🌙'), 'SER': ('Regno di Serbia', '🏰'),
      'GRE': ('Regno di Grecia', '🏰'), 'POR': ('Repubblica portoghese', '🏛️'), 'SVI': ('Svizzera', '🏛️'),
      'OLA': ('Regno dei Paesi Bassi', '🏰'), 'BEL': ('Regno del Belgio', '🏰'),
      'MSP': ('Marocco spagnolo', '🏰'), 'ALB': ("Principato d'Albania", '🏰'),
      'MON': ('Regno del Montenegro', '🏰'), 'NOR': ('Regno di Norvegia', '🏰'),
      'LUX': ('Granducato di Lussemburgo', '🏰'), 'PER': ('Persia', '🌙'),
      'SWE': ('Regno di Svezia', '🏰'), 'DAN': ('Regno di Danimarca', '🏰'),
    },
    'nomi': {
      # Georgia, Finlandia e Azerbaigian nel 1914 erano parte dell'Impero russo
      'Russian Empire': 'RUS', 'Georgia': 'RUS', 'Finland': 'RUS', 'Azerbaijan': 'RUS',
      'Algeria': 'ALG', 'Ottoman Empire': 'OTT', 'Libya': 'LIB', 'France': 'FRA',
      'Austro-Hungarian Empire': 'AUH', 'Spain': 'SPA', 'German Empire': 'GER',
      'United Kingdom of Great Britain and Ireland': 'GBR', 'Egypt': 'EGI', 'Morocco': 'MAR',
      'Kingdom of Italy': 'ITA', 'Romania': 'ROM', 'Bulgaria': 'BUL', 'Tunisia': 'TUN', 'Serbia': 'SER',
      'Greece': 'GRE', 'Portugal': 'POR', 'Switzerland': 'SVI', 'Netherlands': 'OLA', 'Belgium': 'BEL',
      'Spanish Morocco': 'MSP', 'Spanish Sahara': 'MSP', 'Albania': 'ALB', 'Montenegro': 'MON',
      'Norway': 'NOR', 'Luxembourg': 'LUX', 'Persia': 'PER',
      # l'Islanda nel 1914 era parte del Regno di Danimarca, Malta dell'Impero britannico
      'Sweden': 'SWE', 'Denmark': 'DAN', 'Iceland': 'DAN', 'Armenia': 'RUS', 'Malta': 'GBR',
    },
    'correzioni': {},
  },
  '1938': {
    'titolo': 'La vigilia della Seconda guerra mondiale',
    'stati': {
      'URS': ('Unione Sovietica', '🚩'), 'ALG': ('Algeria francese', '🏰'), 'LIB': ('Libia italiana', '🏰'),
      'FRA': ('Repubblica francese', '🏛️'), 'GER': ('Germania', '🏰'), 'SPA': ('Spagna', '🏰'),
      'TUR': ('Repubblica di Turchia', '🏛️'), 'MAR': ('Marocco francese', '🌙'),
      'EGI': ("Regno d'Egitto", '🏰'), 'ROM': ('Regno di Romania', '🏰'), 'ITA': ("Regno d'Italia", '🏰'),
      'GBR': ('Regno Unito', '👑'), 'JUG': ('Regno di Jugoslavia', '🏰'), 'TUN': ('Tunisia francese', '🌙'),
      'GRE': ('Regno di Grecia', '🏰'), 'BUL': ('Regno di Bulgaria', '🏰'), 'POL': ('Polonia', '🏛️'),
      'SIR': ('Siria francese', '🏰'), 'UNG': ("Regno d'Ungheria", '🏰'), 'POR': ('Portogallo', '🏛️'),
      'IRL': ('Irlanda', '🏛️'), 'FIN': ('Finlandia', '🏛️'), 'OLA': ('Regno dei Paesi Bassi', '🏰'),
      'SVI': ('Svizzera', '🏛️'), 'BEL': ('Regno del Belgio', '🏰'), 'ALB': ("Regno d'Albania", '🏰'),
      'CEC': ('Cecoslovacchia', '🏛️'), 'NOR': ('Regno di Norvegia', '🏰'),
      'LUX': ('Granducato di Lussemburgo', '🏰'),
      'SWE': ('Regno di Svezia', '🏰'), 'DAN': ('Regno di Danimarca', '🏰'), 'EST': ('Estonia', '🏛️'),
      'LET': ('Lettonia', '🏛️'), 'LIT': ('Lituania', '🏛️'),
    },
    'nomi': {
      'USSR': 'URS', 'Armenia': 'URS', 'Algeria (France)': 'ALG', 'Libya': 'LIB', 'France': 'FRA',
      'Germany': 'GER', 'Spain': 'SPA', 'Spanish Sahara': 'SPA', 'Turkey': 'TUR',
      'Morocco (France)': 'MAR', 'Egypt': 'EGI', 'Romania': 'ROM', 'Italy': 'ITA', 'United Kingdom': 'GBR',
      'Yugoslavia': 'JUG', 'Tunisia': 'TUN', 'Greece': 'GRE', 'Bulgaria': 'BUL', 'Poland': 'POL',
      'Syria (France)': 'SIR', 'Hungary': 'UNG', 'Portugal': 'POR', 'Ireland': 'IRL', 'Finland': 'FIN',
      'Netherlands': 'OLA', 'Switzerland': 'SVI', 'Belgium': 'BEL', 'Albania': 'ALB',
      'Czechoslovakia': 'CEC', 'Norway': 'NOR', 'Luxembourg': 'LUX',
      'Sweden': 'SWE', 'Denmark': 'DAN', 'Estonia': 'EST', 'Latvia': 'LET', 'Lithuania': 'LIT',
    },
    # nei dati la Turchia si ferma a 39.4°E: il resto e' "Armenia" sovietica o "Siria"
    'correzioni': {'TR': 'TUR'},
  },
  # v80: altre istantanee, cosi' ogni anno scelto nel menu ha i confini piu' vicini
  '1100': {
    'titolo': 'Il tempo della prima crociata',
    'stati': {
      'KIE': ("Rus' di Kiev", '🏰'), 'CUM': ('Cumani e Kipchak', '⛺'),
      'UGR': ('Popoli ugrofinnici della taiga', '⛺'), 'SAM': ('Sami', '⛺'),
      'FAT': ('Califfato fatimide', '🌙'), 'ALM': ('Impero almoravide', '🌙'),
      'BIZ': ('Impero bizantino', '👑'), 'SRI': ('Sacro Romano Impero', '👑'),
      'VBU': ('Bulgari del Volga', '🌙'), 'FRA': ('Regno di Francia', '🏰'),
      'NOR': ('Regno di Norvegia', '🏰'), 'POL': ('Regno di Polonia', '🏰'),
      'UNG': ("Regno d'Ungheria", '🏰'), 'OGU': ('Oghuz', '⛺'), 'SWE': ('Regno di Svezia', '🏰'),
      'ALA': ('Alani', '⛺'), 'ISL': ('Stato libero islandese', '🏛️'), 'BAL': ('Tribù baltiche', '⛺'),
      'ENG': ("Regno d'Inghilterra", '🏰'), 'CEL': ('Regni celtici', '🏰'),
      'LEO': ('Regno di León e Castiglia', '🏰'), 'DAN': ('Regno di Danimarca', '🏰'),
      'SCO': ('Regno di Scozia', '🏰'), 'GEO': ('Regno di Georgia', '🏰'), 'ARM': ('Principati armeni', '🏰'),
      'KLO': ('Cappucci Neri', '⛺'), 'SEL': ('Impero selgiuchide', '🌙'),
      'NOM': ("Normanni dell'Italia del Sud", '🏰'), 'SER': ('Principato di Serbia', '🏰'),
      'PAP': ('Stato della Chiesa', '⛪'), 'CRO': ('Regno di Croazia', '🏰'),
      'NAV': ("Regno d'Aragona e Navarra", '🏰'), 'BRE': ('Ducato di Bretagna', '🏰'),
      'SAR': ('Giudicati di Sardegna', '🏰'), 'SHI': ('Shirvan', '🌙'),
    },
    'nomi': {
      'Kievan Rus': 'KIE', 'Principality of Polotsk': 'KIE', 'Cuman-Kipchak confederation': 'CUM',
      'Finno-Ugric taiga hunter-gatherers': 'UGR', 'Paleo-Siberian hunter-gatherers': 'UGR',
      'Sámi': 'SAM', 'Fatimid Caliphate': 'FAT', 'Almoravid dynasty': 'ALM', 'Guanches': 'ALM',
      # la Bulgaria dal 1018 al 1185 era bizantina
      'Byzantine Empire': 'BIZ', 'Bulgar Khanate': 'BIZ', 'Cyprus': 'BIZ',
      'Holy Roman Empire': 'SRI', 'Burgandy': 'SRI', 'Venice': 'SRI', 'Volga Bulgars': 'VBU',
      'Kingdom of France': 'FRA', 'Norway': 'NOR', 'Poland': 'POL', 'Hungary': 'UNG', 'Oghuz': 'OGU',
      'Karkhanids': 'OGU', 'Sweden': 'SWE', 'Alans': 'ALA', 'Icelandic Commonwealth': 'ISL',
      'Prussians': 'BAL', 'England': 'ENG', 'Celtic kingdoms': 'CEL', 'León': 'LEO', 'Castilla': 'LEO',
      'Denmark': 'DAN', 'Scotland': 'SCO', 'Kingdom of Georgia': 'GEO', 'Kakheti-Hereti': 'GEO',
      'Armenia': 'ARM', 'Syunik': 'ARM', 'Tashir': 'ARM', 'Artsakh': 'ARM', 'Goghtn': 'ARM',
      'Karakalpaks': 'KLO', 'Seljuk Empire': 'SEL', 'Duchy of Benevento': 'NOM', 'Serbia': 'SER',
      'Papal States': 'PAP', 'Croatia': 'CRO', 'Navarre': 'NAV', 'Aragón': 'NAV', 'Britany': 'BRE',
      'Sardinia': 'SAR', 'Corsica': 'SAR', 'Shirvan': 'SHI', 'Arran': 'SHI', 'Maskat': 'SHI',
    },
    'correzioni': {},
  },
  '1200': {
    'titolo': 'Il tempo dei Comuni',
    'stati': {
      'CUM': ('Khanati cumani', '⛺'), 'UGR': ('Popoli ugrofinnici della taiga', '⛺'),
      'FAT': ('Califfato fatimide', '🌙'), 'SAM': ('Sami', '⛺'), 'BIZ': ('Impero bizantino', '👑'),
      'TUA': ('Tribù tuareg', '⛺'), 'SRI': ('Sacro Romano Impero', '👑'), 'NOR': ('Regno di Norvegia', '🏰'),
      'RUS': ("Altri principati della Rus'", '🏰'), 'ALM': ('Califfato almohade', '🌙'),
      'VBU': ('Bulgari del Volga', '🌙'), 'NOV': ('Repubblica di Novgorod', '🏛️'),
      'VLA': ('Principato di Vladimir-Suzdal', '🏰'), 'BER': ('Tribù berbere', '⛺'),
      'POL': ('Ducati di Polonia', '🏰'), 'UNG': ("Regno d'Ungheria", '🏰'), 'SWE': ('Regno di Svezia', '🏰'),
      'BUL': ('Impero bulgaro', '🏰'), 'ANG': ('Impero angioino', '👑'), 'GAL': ('Principato di Galizia-Volinia', '🏰'),
      'FRA': ('Regno di Francia', '🏰'), 'CEL': ('Regni celtici', '🏰'), 'SEL': ('Sultanato selgiuchide', '🌙'),
      'KIE': ('Principato di Kiev', '🏰'), 'DAN': ('Regno di Danimarca', '🏰'), 'IBA': ('Ibaditi', '🌙'),
      'ARM': ('Regno di Armenia', '🏰'), 'TOL': ('Contea di Tolosa', '🏰'), 'LEO': ('Regno di León', '🏰'),
      'SCO': ('Regno di Scozia', '🏰'), 'BOR': ('Contea di Borgogna', '🏰'), 'POR': ('Regno di Portogallo', '🏰'),
      'SIC': ('Regno di Sicilia', '🏰'), 'GEO': ('Regno di Georgia', '🏰'), 'CAS': ('Regno di Castiglia', '🏰'),
      'ARA': ("Corona d'Aragona", '🏰'), 'PAP': ('Stato della Chiesa', '⛪'), 'CRO': ('Regno di Croazia', '🏰'),
      'NAV': ('Regno di Navarra', '🏰'), 'BRE': ('Ducato di Bretagna', '🏰'), 'SAR': ('Giudicati di Sardegna', '🏰'),
    },
    'nomi': {
      'Cuman Khanates': 'CUM', 'Finno-Ugric taiga hunter-gatherers': 'UGR',
      'Paleo-Siberian hunter-gatherers': 'UGR', 'Fatimid Caliphate': 'FAT', 'Sámi': 'SAM',
      'Byzantine Empire': 'BIZ', 'Cyprus': 'BIZ', 'Tuareg Nomadic Tribes': 'TUA', 'Holy Roman Empire': 'SRI',
      'Venice': 'SRI', 'Norway': 'NOR', 'Other Rus Principalities': 'RUS', 'Almohad Caliphate': 'ALM',
      'Guanches': 'ALM', 'Volga Bulgars': 'VBU', 'Principality of Novgorod': 'NOV',
      'Principality of Vladimir-Suzdal': 'VLA', 'Berber Tribes': 'BER', 'Poland': 'POL', 'Hungary': 'UNG',
      'Sweden': 'SWE', 'Bulgar Khanate': 'BUL', 'Angevin Empire': 'ANG',
      'Principality of Galicia-Volhynia': 'GAL', 'Kingdom of France': 'FRA', 'Celtic kingdoms': 'CEL',
      'Buwayhid Emirates': 'SEL', 'Kara Khitai Khaganate': 'CUM', 'Principality of Kyiv': 'KIE',
      'Denmark': 'DAN', 'Ibadites': 'IBA', 'Armenia': 'ARM', 'Comté de Toulouse': 'TOL', 'León': 'LEO',
      'Scotland': 'SCO', 'Burgandy': 'BOR', 'Portugal': 'POR', 'Duchy of Benevento': 'SIC', 'Georgia': 'GEO',
      'Castilla': 'CAS', 'Aragón': 'ARA', 'Papal States': 'PAP', 'Croatia': 'CRO', 'Navarre': 'NAV',
      'Britany': 'BRE', 'Sardinia': 'SAR', 'Corsica': 'SAR',
    },
    'correzioni': {},
  },
  '1300': {
    'titolo': 'Il tempo di Dante',
    'stati': {
      'ORD': ("Orda d'Oro", '⛺'), 'RYA': ('Principati russi', '🏰'), 'NOV': ('Repubblica di Novgorod', '🏛️'),
      'SRI': ('Sacro Romano Impero', '👑'), 'SAM': ('Sami', '⛺'), 'SIB': ('Popoli siberiani', '⛺'),
      'NOR': ('Regno di Norvegia', '🏰'), 'HAF': ('Califfato hafside', '🌙'), 'MAM': ('Sultanato mamelucco', '🌙'),
      'UNG': ("Regno d'Ungheria", '🏰'), 'BIZ': ('Impero bizantino', '👑'), 'FRA': ('Regno di Francia', '🏰'),
      'ENG': ("Regno d'Inghilterra", '🏰'), 'ILK': ('Ilkhanato', '🌙'), 'SWE': ('Regno di Svezia', '🏰'),
      'SEL': ('Sultanato selgiuchide di Rum', '🌙'), 'CAS': ('Regno di Castiglia', '🏰'),
      'MAR': ('Sultanato merinide del Marocco', '🌙'), 'LIT': ('Granducato di Lituania', '🏰'),
      'TEU': ('Ordine teutonico', '⛪'), 'POL': ('Regno di Polonia', '🏰'), 'DAN': ('Regno di Danimarca', '🏰'),
      'ARA': ("Corona d'Aragona", '🏰'), 'BUL': ('Impero bulgaro', '🏰'), 'SIC': ('Regno di Napoli', '🏰'),
      'SCO': ('Regno di Scozia', '🏰'), 'POR': ('Regno di Portogallo', '🏰'), 'SER': ('Regno di Serbia', '🏰'),
      'PAP': ('Stato della Chiesa', '⛪'), 'GEO': ('Regno di Georgia', '🏰'), 'GRA': ('Emirato di Granada', '🌙'),
      'BRE': ('Ducato di Bretagna', '🏰'), 'SAR': ('Sardegna', '🏰'), 'TRE': ('Impero di Trebisonda', '👑'),
      'NAV': ('Regno di Navarra', '🏰'),
    },
    'nomi': {
      'Khanate of the Golden Horde': 'ORD', 'Ryazan': 'RYA', 'Grand Duchy of Moscow': 'RYA',
      'Novgorod': 'NOV', 'Holy Roman Empire': 'SRI', 'Venice': 'SRI', 'Samis': 'SAM', 'Siberians': 'SIB',
      'Norway': 'NOR', 'Hafsid Caliphate': 'HAF', 'Mamluke Sultanate': 'MAM', 'Hungary': 'UNG',
      'Byzantine Empire': 'BIZ', 'France': 'FRA', 'English territory': 'ENG', 'Ilkhanate': 'ILK',
      'Sweden': 'SWE', 'Seljuk Caliphate': 'SEL', 'Castile': 'CAS', 'Guanches': 'CAS', 'Morocco': 'MAR',
      'Lithuania': 'LIT', 'Teutonic Knights': 'TEU', 'Poland': 'POL', 'Denmark': 'DAN', 'Aragón': 'ARA',
      'Bulgar Khanate': 'BUL', 'Sicily': 'SIC', 'Scotland': 'SCO', 'Portugal': 'POR', 'Raška': 'SER',
      'Papal States': 'PAP', 'Georgia': 'GEO', 'Granada': 'GRA', 'Britany': 'BRE', 'Sardinia': 'SAR',
      'Corsica': 'SAR', 'Trebizond': 'TRE', 'Navarre': 'NAV', 'Cyprus': 'MAM',
    },
    'correzioni': {},
  },
  '1400': {
    'titolo': "L'autunno del Medioevo",
    'stati': {
      'OBL': ('Orda Blu', '⛺'), 'OBI': ('Orda Bianca', '⛺'), 'KAL': ('Unione di Kalmar', '🏰'),
      'NOV': ('Repubblica di Novgorod', '🏛️'), 'PLL': ('Polonia-Lituania', '🏰'), 'SRI': ('Sacro Romano Impero', '👑'),
      'SIB': ('Popoli siberiani', '⛺'), 'SAM': ('Sami', '⛺'), 'HAF': ('Califfato hafside', '🌙'),
      'MAM': ('Sultanato mamelucco', '🌙'), 'UNG': ("Regno d'Ungheria", '🏰'), 'FRA': ('Regno di Francia', '🏰'),
      'OTT': ('Impero ottomano', '🌙'), 'TIM': ('Impero timuride', '🌙'), 'ENG': ("Regno d'Inghilterra", '🏰'),
      'CAS': ('Regno di Castiglia', '🏰'), 'KAR': ('Beilicato di Karaman', '🌙'),
      'MAR': ('Sultanato merinide del Marocco', '🌙'), 'TEU': ('Ordine teutonico', '⛪'),
      'BIZ': ('Impero bizantino', '👑'), 'ARA': ("Corona d'Aragona", '🏰'), 'SIC': ('Regno di Napoli', '🏰'),
      'SCO': ('Regno di Scozia', '🏰'), 'POR': ('Regno di Portogallo', '🏰'), 'BOS': ('Regno di Bosnia', '🏰'),
      'VAL': ('Principato di Valacchia', '🏰'), 'AYD': ('Beilicato di Aydın', '🌙'),
      'BUL': ('Zarato di Vidin', '🏰'), 'MOL': ('Principato di Moldavia', '🏰'),
      'PAP': ('Stato della Chiesa', '⛪'), 'GEO': ('Regno di Georgia', '🏰'), 'GRA': ('Emirato di Granada', '🌙'),
      'BRE': ('Ducato di Bretagna', '🏰'), 'SAR': ('Sardegna', '🏰'), 'TRE': ('Impero di Trebisonda', '👑'),
      'NAV': ('Regno di Navarra', '🏰'),
    },
    'nomi': {
      'Blue Horde': 'OBL', 'White Horde': 'OBI', 'Kalmar Union': 'KAL', 'Novgorod': 'NOV',
      'Poland-Lithuania': 'PLL', 'Holy Roman Empire': 'SRI', 'Venice': 'SRI', 'Siberians': 'SIB', 'Sámi': 'SAM',
      'Hafsid Caliphate': 'HAF', 'Mamluke Sultanate': 'MAM', 'Cyprus': 'MAM', 'Kingdom of Hungary': 'UNG',
      'France': 'FRA', 'Ottoman Empire': 'OTT', 'Timurid Empire': 'TIM', 'English territory': 'ENG',
      'Castile': 'CAS', 'Guanches': 'CAS', 'Seljuk Caliphate': 'KAR', 'Morocco': 'MAR',
      'Teutonic Knights': 'TEU', 'Byzantine Empire': 'BIZ', 'Aragón': 'ARA', 'Sicily': 'SIC',
      'Scotland': 'SCO', 'Portugal': 'POR', 'Bosnia': 'BOS', 'Principality of Wallachia': 'VAL',
      'Beylik of Aydin': 'AYD', 'Bulgar Khanate': 'BUL', 'Moldova': 'MOL', 'Papal States': 'PAP',
      'Georgia': 'GEO', 'Granada': 'GRA', 'Britany': 'BRE', 'Sardinia': 'SAR', 'Corsica': 'SAR',
      'Trebizond': 'TRE', 'Navarre': 'NAV',
    },
    'correzioni': {},
  },
  '1530': {
    'titolo': "L'età di Carlo V",
    'stati': {
      'MOS': ('Zarato di Russia', '👑'), 'OTT': ('Impero ottomano', '🌙'), 'NOG': ('Orda Nogai', '⛺'),
      'PLL': ('Polonia-Lituania', '🏰'), 'SWE': ('Regno di Svezia', '🏰'), 'DAN': ('Danimarca e Norvegia', '🏰'),
      'SRI': ('Sacro Romano Impero', '👑'), 'SAM': ('Sami', '⛺'), 'FRA': ('Regno di Francia', '🏰'),
      'SPA': ('Regno di Spagna', '👑'), 'KAZ': ('Khanato di Kazan', '🌙'), 'WAT': ('Sultanato wattaside', '🌙'),
      'ENG': ("Inghilterra e Irlanda", '🏰'), 'AST': ('Khanato di Astrakhan', '🌙'),
      'CRI': ('Khanato di Crimea', '🌙'), 'KHI': ('Khanato di Khiva', '🌙'), 'SCO': ('Regno di Scozia', '🏰'),
      'POR': ('Regno di Portogallo', '🏰'), 'QAZ': ('Khanato kazako', '⛺'), 'NEA': ('Regno di Napoli', '🏰'),
      'PAB': ('Paesi Bassi asburgici', '🏰'), 'PRU': ('Ducato di Prussia', '🏰'), 'PAP': ('Stato della Chiesa', '⛪'),
      'VEN': ('Repubblica di Venezia', '⚓'), 'SVI': ('Confederazione svizzera', '🏛️'),
      'FIR': ('Repubblica di Firenze', '🏛️'), 'SAV': ('Ducato di Savoia', '🏰'), 'SIC': ('Regno di Sicilia', '🏰'),
      'BRE': ('Ducato di Bretagna', '🏰'), 'MIL': ('Ducato di Milano', '🏰'), 'SAR': ('Regno di Sardegna', '🏰'),
      'GEN': ('Repubblica di Genova', '⚓'),
    },
    'nomi': {
      'Republic of the Seven Zenden': 'SVI',
      'Tsardom of Muscovy': 'MOS', 'Ottoman Empire': 'OTT', 'Nogai Horde': 'NOG', 'Poland-Lithuania': 'PLL',
      'Sweden': 'SWE', 'Denmark-Norway': 'DAN', 'Holy Roman Empire': 'SRI', 'Sámi': 'SAM', 'France': 'FRA',
      'Spain': 'SPA', 'Guanches': 'SPA', 'Kazan Khanate': 'KAZ', 'Watassid Morocco': 'WAT',
      'England and Ireland': 'ENG', 'Astrakhan Khanate': 'AST', 'Crimean Khanate': 'CRI',
      'Khiva Khanate': 'KHI', 'Scotland': 'SCO', 'Portugal': 'POR', 'Quazaq Khanate': 'QAZ', 'Naples': 'NEA',
      'Habsburg Netherlands': 'PAB', 'Prussia': 'PRU', 'Papal States': 'PAP', 'Venice': 'VEN',
      'Swiss Confederation': 'SVI', 'Florence': 'FIR', 'Savoy': 'SAV', 'Sicily': 'SIC', 'Britany': 'BRE',
      'Milan': 'MIL', 'Sardinia': 'SAR', 'Genoa': 'GEN',
    },
    'correzioni': {},
  },
  '1600': {
    'titolo': "L'età di Shakespeare",
    'stati': {
      'MOS': ('Zarato di Russia', '👑'), 'OTT': ('Impero ottomano', '🌙'), 'SWE': ('Regno di Svezia', '🏰'),
      'PLL': ('Confederazione polacco-lituana', '🏰'), 'SRI': ('Sacro Romano Impero', '👑'),
      'DAN': ('Danimarca e Norvegia', '🏰'), 'FRA': ('Regno di Francia', '🏰'), 'SPA': ('Regno di Spagna', '👑'),
      'NOG': ('Orda Nogai', '⛺'), 'MAR': ('Sultanato del Marocco', '🌙'), 'ENG': ('Inghilterra e Irlanda', '🏰'),
      'CRI': ('Khanato di Crimea', '🌙'), 'KHI': ('Khanato di Khiva', '🌙'), 'QAZ': ('Khanato kazako', '⛺'),
      'SCO': ('Regno di Scozia', '🏰'), 'POR': ('Regno di Portogallo', '🏰'), 'NEA': ('Regno di Napoli', '🏰'),
      'PRU': ('Ducato di Prussia', '🏰'), 'PAB': ('Paesi Bassi spagnoli', '🏰'), 'OLA': ('Repubblica delle Sette Province Unite', '🏛️'),
      'PAP': ('Stato della Chiesa', '⛪'), 'VEN': ('Repubblica di Venezia', '⚓'), 'SVI': ('Confederazione svizzera', '🏛️'),
      'TOS': ('Granducato di Toscana', '🏰'), 'SAV': ('Ducato di Savoia', '🏰'), 'SIC': ('Regno di Sicilia', '🏰'),
      'MIL': ('Ducato di Milano', '🏰'), 'SAR': ('Regno di Sardegna', '🏰'), 'GEN': ('Repubblica di Genova', '⚓'),
    },
    'nomi': {
      'Republic of the Seven Zenden': 'SVI',
      'Tsardom of Muscovy': 'MOS', 'Ottoman Empire': 'OTT', 'Sweden': 'SWE', 'Poland-Lithuania': 'PLL',
      'Holy Roman Empire': 'SRI', 'Denmark-Norway': 'DAN', 'Finnmark': 'DAN', 'France': 'FRA', 'Spain': 'SPA',
      'Guanches': 'SPA', 'Nogai Horde': 'NOG', 'Watassid Morocco': 'MAR', 'England and Ireland': 'ENG',
      'Crimean Khanate': 'CRI', 'Khiva Khanate': 'KHI', 'Quazaq Khanate': 'QAZ', 'Scotland': 'SCO',
      'Portugal': 'POR', 'Naples': 'NEA', 'Prussia': 'PRU', 'Habsburg Netherlands': 'PAB',
      'Dutch Republic': 'OLA', 'Papal States': 'PAP', 'Venice': 'VEN', 'Swiss Confederation': 'SVI',
      'Florence': 'TOS', 'Savoy': 'SAV', 'Sicily': 'SIC', 'Milan': 'MIL', 'Sardinia': 'SAR', 'Genoa': 'GEN',
    },
    'correzioni': {},
  },
  '1650': {
    'titolo': 'La pace di Vestfalia',
    'stati': {
      'MOS': ('Zarato di Russia', '👑'), 'OTT': ('Impero ottomano', '🌙'), 'SWE': ('Impero svedese', '👑'),
      'PLL': ('Confederazione polacco-lituana', '🏰'), 'SRI': ('Sacro Romano Impero', '👑'),
      'DAN': ('Danimarca e Norvegia', '🏰'), 'MAR': ('Sultanato del Marocco', '🌙'), 'FRA': ('Regno di Francia', '🏰'),
      'SPA': ('Regno di Spagna', '👑'), 'NOG': ('Orda Nogai', '⛺'), 'ENG': ("Commonwealth d'Inghilterra", '🏛️'),
      'KHI': ('Khanato di Khiva', '🌙'), 'QAZ': ('Khanato kazako', '⛺'), 'SCO': ('Regno di Scozia', '🏰'),
      'POR': ('Regno di Portogallo', '🏰'), 'NEA': ('Regno di Napoli', '🏰'), 'PAB': ('Paesi Bassi spagnoli', '🏰'),
      'PRU': ('Ducato di Prussia', '🏰'), 'OLA': ('Repubblica delle Sette Province Unite', '🏛️'),
      'PAP': ('Stato della Chiesa', '⛪'), 'VEN': ('Repubblica di Venezia', '⚓'), 'SVI': ('Confederazione svizzera', '🏛️'),
      'SAV': ('Ducato di Savoia', '🏰'), 'SIC': ('Regno di Sicilia', '🏰'), 'MIL': ('Ducato di Milano', '🏰'),
      'TOS': ('Granducato di Toscana', '🏰'), 'SAR': ('Regno di Sardegna', '🏰'), 'BOR': ('Franca Contea', '🏰'),
      'MOD': ('Ducato di Modena', '🏰'), 'GEN': ('Repubblica di Genova', '⚓'), 'PAR': ('Ducato di Parma', '🏰'),
    },
    'nomi': {
      'Republic of the Seven Zenden': 'SVI', 'Lucca': 'TOS',
      'Tsardom of Muscovy': 'MOS', 'Ottoman Empire': 'OTT', 'Sweden': 'SWE',
      "Polish–Lithuanian Commonwealth": 'PLL', 'Holy Roman Empire': 'SRI', 'Austrian Empire': 'SRI',
      'Denmark-Norway': 'DAN', 'Finnmark': 'DAN', 'Morocco': 'MAR', 'France': 'FRA', 'Spain': 'SPA',
      'Guanches': 'SPA', 'Nogai Horde': 'NOG', 'England and Ireland': 'ENG', 'Khiva Khanate': 'KHI',
      'Quazaq Khanate': 'QAZ', 'Scotland': 'SCO', 'Portugal': 'POR', 'Naples': 'NEA', 'Luxembourg': 'PAB',
      'Prussia': 'PRU', 'Dutch Republic': 'OLA', 'Papal States': 'PAP', 'Venice': 'VEN',
      'Swiss Confederation': 'SVI', 'Sardinia-Piedmont': 'SAV', 'Sicily': 'SIC', 'Milan': 'MIL',
      'Tuscany': 'TOS', 'Sardinia': 'SAR', 'Franche-Comté': 'BOR', 'Modena': 'MOD', 'Genoa': 'GEN',
      'Parma': 'PAR',
    },
    'correzioni': {},
  },
  '1700': {
    'titolo': "L'età del Re Sole",
    'stati': {
      'MOS': ('Zarato di Russia', '👑'), 'OTT': ('Impero ottomano', '🌙'), 'SWE': ('Impero svedese', '👑'),
      'PLL': ('Confederazione polacco-lituana', '🏰'), 'SRI': ('Sacro Romano Impero', '👑'),
      'DAN': ('Danimarca e Norvegia', '🏰'), 'MAR': ('Sultanato del Marocco', '🌙'), 'FRA': ('Regno di Francia', '👑'),
      'SPA': ('Regno di Spagna', '👑'), 'AUS': ('Monarchia asburgica', '👑'), 'NOG': ('Orda Nogai', '⛺'),
      'ENG': ("Regno d'Inghilterra e d'Irlanda", '🏰'), 'KHI': ('Khanato di Khiva', '🌙'),
      'QAZ': ('Khanato kazako', '⛺'), 'SCO': ('Regno di Scozia', '🏰'), 'POR': ('Regno di Portogallo', '🏰'),
      'NEA': ('Regno di Napoli', '🏰'), 'PAB': ('Paesi Bassi spagnoli', '🏰'), 'PRU': ('Brandeburgo-Prussia', '🏰'),
      'OLA': ('Repubblica delle Sette Province Unite', '🏛️'), 'PAP': ('Stato della Chiesa', '⛪'),
      'VEN': ('Repubblica di Venezia', '⚓'), 'SVI': ('Confederazione svizzera', '🏛️'), 'SAV': ('Ducato di Savoia', '🏰'),
      'SIC': ('Regno di Sicilia', '🏰'), 'MIL': ('Ducato di Milano', '🏰'), 'TOS': ('Granducato di Toscana', '🏰'),
      'SAR': ('Regno di Sardegna', '🏰'), 'MOD': ('Ducato di Modena', '🏰'), 'GEN': ('Repubblica di Genova', '⚓'),
      'PAR': ('Ducato di Parma', '🏰'),
    },
    'nomi': {
      'Republic of the Seven Zenden': 'SVI', 'Lucca': 'TOS', 'Geneva': 'SVI',
      'Tsardom of Muscovy': 'MOS', 'Ottoman Empire': 'OTT', 'Sweden': 'SWE',
      "Polish–Lithuanian Commonwealth": 'PLL', 'Holy Roman Empire': 'SRI', 'Denmark-Norway': 'DAN',
      'Finnmark': 'DAN', 'Morocco': 'MAR', 'France': 'FRA', 'Franche-Comté': 'FRA', 'Spain': 'SPA',
      'Guanches': 'SPA', 'Austrian Empire': 'AUS', 'Nogai Horde': 'NOG', 'England and Ireland': 'ENG',
      'Khiva Khanate': 'KHI', 'Quazaq Khanate': 'QAZ', 'Scotland': 'SCO', 'Portugal': 'POR', 'Naples': 'NEA',
      'Luxembourg': 'PAB', 'Prussia': 'PRU', 'Dutch Republic': 'OLA', 'Papal States': 'PAP', 'Venice': 'VEN',
      'Swiss Confederation': 'SVI', 'Sardinia-Piedmont': 'SAV', 'Sicily': 'SIC', 'Milan': 'MIL',
      'Tuscany': 'TOS', 'Sardinia': 'SAR', 'Modena': 'MOD', 'Genoa': 'GEN', 'Parma': 'PAR',
    },
    'correzioni': {},
  },
  '1715': {
    'titolo': 'La pace di Utrecht',
    'stati': {
      'RUS': ('Zarato di Russia', '👑'), 'OTT': ('Impero ottomano', '🌙'), 'SWE': ('Impero svedese', '👑'),
      'PLL': ('Confederazione polacco-lituana', '🏰'), 'DAN': ('Danimarca e Norvegia', '🏰'),
      'AUS': ('Monarchia asburgica', '👑'), 'FRA': ('Regno di Francia', '👑'), 'SPA': ('Regno di Spagna', '👑'),
      'MAR': ('Sultanato del Marocco', '🌙'), 'ALG': ('Reggenza di Algeri', '🌙'), 'NOG': ('Orda Nogai', '⛺'),
      'EGI': ('Egitto ottomano', '🌙'), 'GBR': ('Regno di Gran Bretagna', '👑'), 'SRI': ('Sacro Romano Impero', '👑'),
      'PER': ('Impero safavide', '🌙'), 'KHI': ('Khanato di Khiva', '🌙'), 'QAZ': ('Khanato kazako', '⛺'),
      'IRL': ("Regno d'Irlanda", '🏰'), 'PRU': ('Regno di Prussia', '🏰'), 'TUN': ('Beilicato di Tunisi', '🌙'),
      'POR': ('Regno di Portogallo', '🏰'), 'NEA': ('Regno di Napoli', '🏰'), 'TRI': ('Reggenza di Tripoli', '🌙'),
      'VEN': ('Repubblica di Venezia', '⚓'), 'OLA': ('Repubblica delle Sette Province Unite', '🏛️'),
      'PAP': ('Stato della Chiesa', '⛪'), 'SAV': ('Ducato di Savoia', '🏰'), 'LUB': ('Città libera di Lubecca', '🏛️'),
      'PAB': ('Paesi Bassi austriaci', '🏰'), 'SVI': ('Confederazione svizzera', '🏛️'), 'SIC': ('Regno di Sicilia', '🏰'),
      'TOS': ('Granducato di Toscana', '🏰'), 'HAN': ('Elettorato di Hannover', '🏰'), 'SAR': ('Regno di Sardegna', '🏰'),
      'BAD': ('Margraviato di Baden', '🏰'), 'MOD': ('Ducato di Modena', '🏰'), 'MIL': ('Ducato di Milano', '🏰'),
      'GEN': ('Repubblica di Genova', '⚓'), 'PAR': ('Ducato di Parma', '🏰'),
    },
    'nomi': {
      'Republic of the Seven Zenden': 'SVI', 'Lucca': 'TOS', 'Geneva': 'SVI',
      'Tsardom of Muscovy': 'RUS', 'Ottoman Empire': 'OTT', 'Sweden': 'SWE',
      "Polish–Lithuanian Commonwealth": 'PLL', 'Denmark-Norway': 'DAN', 'Austrian Empire': 'AUS',
      'France': 'FRA', 'Spain': 'SPA', 'Guanches': 'SPA', 'Morocco': 'MAR', 'Algiers': 'ALG',
      'Nogai Horde': 'NOG', 'Egypt': 'EGI', 'United Kingdom': 'GBR', 'Holy Roman Empire': 'SRI',
      'Safavid Empire': 'PER', 'Khiva Khanate': 'KHI', 'Quazaq Khanate': 'QAZ', 'Kingdom of Ireland': 'IRL',
      'Brandenburg': 'PRU', 'Prussia': 'PRU', 'Tunis': 'TUN', 'Portugal': 'POR', 'Naples': 'NEA',
      'Tripolitania': 'TRI', 'Cyrenaica': 'TRI', 'Venice': 'VEN', 'Dutch Republic': 'OLA', 'Papal States': 'PAP',
      'Sardinia-Piedmont': 'SAV', 'Lübeck': 'LUB', 'Austrian Netherlands': 'PAB', 'Swiss Confederation': 'SVI',
      'Sicily': 'SIC', 'Tuscany': 'TOS', 'Hanover': 'HAN', 'Sardinia': 'SAR', 'Baden': 'BAD', 'Modena': 'MOD',
      'Milan': 'MIL', 'Genoa': 'GEN', 'Parma': 'PAR', 'Montenegro': 'OTT',
    },
    'correzioni': {},
  },
  '1783': {
    'titolo': "L'indipendenza americana",
    'stati': {
      'RUS': ('Impero russo', '👑'), 'OTT': ('Impero ottomano', '🌙'), 'SWE': ('Regno di Svezia', '🏰'),
      'KAZ': ('Khanati dell\'Asia centrale', '⛺'), 'DAN': ('Danimarca e Norvegia', '🏰'),
      'POL': ('Confederazione polacco-lituana', '🏰'), 'AUS': ('Monarchia asburgica', '👑'),
      'FRA': ('Regno di Francia', '👑'), 'SPA': ('Regno di Spagna', '👑'), 'MAR': ('Sultanato del Marocco', '🌙'),
      'ALG': ('Reggenza di Algeri', '🌙'), 'GBR': ('Regno di Gran Bretagna', '👑'), 'PRU': ('Regno di Prussia', '🏰'),
      'BAV': ('Elettorato di Baviera', '🏰'), 'IRL': ("Regno d'Irlanda", '🏰'), 'NAP': ('Regno di Napoli e Sicilia', '🏰'),
      'TUN': ('Beilicato di Tunisi', '🌙'), 'POR': ('Regno di Portogallo', '🏰'), 'TRI': ('Reggenza di Tripoli', '🌙'),
      'HAN': ('Elettorato di Hannover', '🏰'), 'SAR': ('Regno di Sardegna', '🏰'),
      'OLA': ('Repubblica delle Sette Province Unite', '🏛️'), 'SAS': ('Elettorato di Sassonia', '🏰'),
      'PAP': ('Stato della Chiesa', '⛪'), 'PAB': ('Paesi Bassi austriaci', '🏰'), 'SVI': ('Confederazione svizzera', '🏛️'),
      'TOS': ('Granducato di Toscana', '🏰'), 'VEN': ('Repubblica di Venezia', '⚓'), 'MEC': ('Ducato di Meclemburgo', '🏰'),
      'WUR': ('Ducato del Württemberg', '🏰'), 'BAD': ('Margraviato di Baden', '🏰'), 'MOD': ('Ducato di Modena', '🏰'),
      'PAR': ('Ducato di Parma', '🏰'), 'PER': ('Persia', '🌙'), 'OLD': ('Ducato di Oldenburg', '🏰'),
      'GER': ('Stati tedeschi minori', '🏰'),
    },
    'nomi': {
      'Republic of the Seven Zenden': 'SVI', 'Lucca': 'TOS', 'Geneva': 'SVI',
      'Russian Empire': 'RUS', 'Ottoman Empire': 'OTT', 'Egypt': 'OTT', 'Sweden': 'SWE',
      'central Asian khanates': 'KAZ', 'Denmark-Norway': 'DAN', 'Holstein': 'DAN', 'Finnmark': 'DAN',
      'Poland': 'POL', 'Austrian Empire': 'AUS', 'Milano (Austria)': 'AUS', 'Lombardy': 'AUS',
      'France': 'FRA', 'Spain': 'SPA', 'Guanches': 'SPA', 'Morocco': 'MAR', 'Algiers': 'ALG',
      'United Kingdom': 'GBR', 'Prussia': 'PRU', 'Bavaria': 'BAV', 'Kingdom of Ireland': 'IRL',
      'Kingdom of the Two Sicilies': 'NAP', 'Tunis': 'TUN', 'Portugal': 'POR', 'Tripolitania': 'TRI',
      'Cyrenaica': 'TRI', 'Mecklenburg-Strelitz': 'HAN', 'Hanover': 'HAN', 'Kingdom of Sardinia': 'SAR',
      'Netherlands': 'OLA', 'Saxony': 'SAS', 'Papal States': 'PAP', 'Austrian Netherlands': 'PAB',
      'Swiss Confederation': 'SVI', 'Tuscany': 'TOS', 'Venetia': 'VEN', 'Mecklenburg-Schwerin': 'MEC',
      'Württemberg': 'WUR', 'Baden': 'BAD', 'Modena': 'MOD', 'Parma': 'PAR', 'Persia': 'PER',
      'Oldenburg': 'OLD', 'Anhalt': 'GER', 'Thuringia': 'GER', 'Brunswick': 'GER', 'Hesse-Kassel': 'GER',
    },
    'correzioni': {},
  },
  '1815': {
    'titolo': 'Il Congresso di Vienna',
    'stati': {
      'RUS': ('Impero russo', '👑'), 'OTT': ('Impero ottomano', '🌙'), 'SVN': ('Svezia e Norvegia', '🏰'),
      'AUS': ("Impero d'Austria", '👑'), 'FRA': ('Regno di Francia', '👑'), 'SPA': ('Regno di Spagna', '👑'),
      'MAR': ('Sultanato del Marocco', '🌙'), 'ALG': ('Reggenza di Algeri', '🌙'),
      'GBR': ('Regno Unito di Gran Bretagna e Irlanda', '👑'), 'PRU': ('Regno di Prussia', '🏰'),
      'EGI': ("Egitto di Mehmet Ali", '🌙'), 'DAN': ('Regno di Danimarca', '🏰'), 'TUR': ('Khanati del Turan', '⛺'),
      'PER': ('Persia', '🌙'), 'NAP': ('Regno delle Due Sicilie', '🏰'), 'TUN': ('Beilicato di Tunisi', '🌙'),
      'BAV': ('Regno di Baviera', '🏰'), 'POR': ('Regno di Portogallo', '🏰'), 'SAR': ('Regno di Sardegna', '🏰'),
      'TRI': ('Reggenza di Tripoli', '🌙'), 'HAN': ('Regno di Hannover', '🏰'), 'OLA': ('Regno Unito dei Paesi Bassi', '🏰'),
      'PAP': ('Stato della Chiesa', '⛪'), 'SVI': ('Confederazione svizzera', '🏛️'), 'LOV': ('Regno Lombardo-Veneto', '🏰'),
      'TOS': ('Granducato di Toscana', '🏰'), 'SAS': ('Regno di Sassonia', '🏰'), 'MEC': ('Granducato di Meclemburgo', '🏰'),
      'GER': ('Stati tedeschi minori', '🏰'), 'WUR': ('Regno del Württemberg', '🏰'), 'BAD': ('Granducato di Baden', '🏰'),
      'ASS': ("Assia", '🏰'), 'MOD': ('Ducato di Modena', '🏰'), 'PAR': ('Ducato di Parma', '🏰'),
    },
    'nomi': {
      'Lucca': 'TOS',
      'Russian Empire': 'RUS', 'Ottoman Empire': 'OTT', 'Sweden–Norway': 'SVN', 'Austrian Empire': 'AUS',
      'France': 'FRA', 'Spain': 'SPA', 'Guanches': 'SPA', 'Morocco': 'MAR', 'Algiers': 'ALG',
      'United Kingdom of Great Britain and Ireland': 'GBR', 'Prussia': 'PRU', 'Egypt': 'EGI',
      'Denmark': 'DAN', 'Holstein': 'DAN', 'Schleswig': 'DAN', 'Turan': 'TUR', 'central Asian khanates': 'TUR',
      'Persia': 'PER', 'Kingdom of the Two Sicilies': 'NAP', 'Tunis': 'TUN', 'Bavaria': 'BAV',
      'Palatinate': 'BAV', 'Portugal': 'POR', 'Kingdom of Sardinia': 'SAR', 'Tripolitania': 'TRI',
      'Cyrenaica': 'TRI', 'Hanover': 'HAN', '       ': 'OLA', 'Netherlands': 'OLA', 'Papal States': 'PAP',
      'Switzerland': 'SVI', 'Venetia': 'LOV', 'Lombardy': 'LOV', 'Tuscany': 'TOS', 'Saxony': 'SAS',
      'Mecklenburg-Schwerin': 'MEC', 'Mecklenburg-Strelitz': 'MEC', 'Thuringia': 'GER', 'Oldenburg': 'GER',
      'Württemberg': 'WUR', 'Baden': 'BAD', 'Electoral Hesse': 'ASS', 'Grand Duchy of Hesse': 'ASS',
      'Modena': 'MOD', 'Parma': 'PAR',
    },
    'correzioni': {},
  },
  '1880': {
    'titolo': "L'età degli imperi",
    'stati': {
      'RUS': ('Impero russo', '👑'), 'OTT': ('Impero ottomano', '🌙'), 'SVN': ('Svezia e Norvegia', '🏰'),
      'AUH': ('Impero austro-ungarico', '👑'), 'GER': ('Impero tedesco', '👑'), 'FRA': ('Repubblica francese', '🏛️'),
      'SPA': ('Regno di Spagna', '🏰'), 'GBR': ('Regno Unito', '👑'), 'ALG': ('Algeria francese', '🏰'),
      'MAR': ('Sultanato del Marocco', '🌙'), 'EGI': ("Chedivato d'Egitto", '🌙'), 'ITA': ("Regno d'Italia", '🏰'),
      'ROM': ('Regno di Romania', '🏰'), 'BUL': ('Principato di Bulgaria', '🏰'), 'ISL': ('Islanda danese', '🏰'),
      'PER': ('Persia', '🌙'), 'GRE': ('Regno di Grecia', '🏰'), 'POR': ('Regno di Portogallo', '🏰'),
      'DAN': ('Regno di Danimarca', '🏰'), 'SER': ('Principato di Serbia', '🏰'), 'BOS': ('Bosnia-Erzegovina', '🏰'),
      'OLA': ('Regno dei Paesi Bassi', '🏰'), 'SVI': ('Svizzera', '🏛️'), 'BEL': ('Regno del Belgio', '🏰'),
      'MON': ('Principato del Montenegro', '🏰'),
    },
    'nomi': {
      'Malta': 'GBR',
      'Russian Empire': 'RUS', 'Ottoman Empire': 'OTT', 'Sweden–Norway': 'SVN', 'Austria Hungary': 'AUH',
      'Germany': 'GER', 'France': 'FRA', 'Spain': 'SPA', 'Guanches': 'SPA',
      'United Kingdom of Great Britain and Ireland': 'GBR', 'Algeria (FR)': 'ALG', 'Morocco': 'MAR',
      'Egypt': 'EGI', 'Italy': 'ITA', 'Romania': 'ROM', 'Bulgaria': 'BUL', 'Iceland': 'ISL', 'Persia': 'PER',
      'Greece': 'GRE', 'Portugal': 'POR', 'Denmark': 'DAN', 'Serbia': 'SER', 'Bosnia-Herzegovina': 'BOS',
      'Netherlands': 'OLA', 'Switzerland': 'SVI', 'Belgium': 'BEL', 'Montenegro': 'MON', 'Luxembourg': 'OLA',
    },
    'correzioni': {},
  },
  '1900': {
    'titolo': 'La Belle Époque',
    'stati': {
      'RUS': ('Impero russo', '👑'), 'OTT': ('Impero ottomano', '🌙'), 'SVN': ('Svezia e Norvegia', '🏰'),
      'AUH': ('Impero austro-ungarico', '👑'), 'GER': ('Impero tedesco', '👑'), 'FRA': ('Repubblica francese', '🏛️'),
      'SPA': ('Regno di Spagna', '🏰'), 'GBR': ('Regno Unito', '👑'), 'ALG': ('Algeria francese', '🏰'),
      'MAR': ('Sultanato del Marocco', '🌙'), 'EGI': ("Chedivato d'Egitto", '🌙'), 'ITA': ("Regno d'Italia", '🏰'),
      'ROM': ('Regno di Romania', '🏰'), 'ISL': ('Islanda danese', '🏰'), 'PER': ('Persia', '🌙'),
      'TUN': ('Tunisia francese', '🌙'), 'POR': ('Regno di Portogallo', '🏰'), 'BUL': ('Principato di Bulgaria', '🏰'),
      'GRE': ('Regno di Grecia', '🏰'), 'DAN': ('Regno di Danimarca', '🏰'), 'SER': ('Regno di Serbia', '🏰'),
      'BOS': ('Bosnia-Erzegovina', '🏰'), 'OLA': ('Regno dei Paesi Bassi', '🏰'), 'SVI': ('Svizzera', '🏛️'),
      'BEL': ('Regno del Belgio', '🏰'), 'MON': ('Principato del Montenegro', '🏰'),
    },
    'nomi': {
      'Malta': 'GBR',
      'Russian Empire': 'RUS', 'Ottoman Empire': 'OTT', 'Sweden–Norway': 'SVN', 'Austria Hungary': 'AUH',
      'Germany': 'GER', 'France': 'FRA', 'Spain': 'SPA', 'Guanches': 'SPA',
      'United Kingdom of Great Britain and Ireland': 'GBR', 'Algeria': 'ALG', 'Morocco': 'MAR', 'Egypt': 'EGI',
      'Italy': 'ITA', 'Romania': 'ROM', 'Iceland': 'ISL', 'Persia': 'PER', 'Tunisia': 'TUN', 'Portugal': 'POR',
      'Bulgaria': 'BUL', 'Greece': 'GRE', 'Denmark': 'DAN', 'Serbia': 'SER', 'Bosnia-Herzegovina': 'BOS',
      'Netherlands': 'OLA', 'Switzerland': 'SVI', 'Belgium': 'BEL', 'Montenegro': 'MON', 'Luxembourg': 'OLA',
    },
    'correzioni': {},
  },
  '1920': {
    'titolo': 'Il primo dopoguerra',
    'stati': {
      'RSS': ('Russia sovietica', '🚩'), 'ALG': ('Algeria francese', '🏰'), 'SWE': ('Regno di Svezia', '🏰'),
      'LIB': ('Libia italiana', '🏰'), 'FRA': ('Repubblica francese', '🏛️'), 'FIN': ('Finlandia', '🏛️'),
      'NOR': ('Regno di Norvegia', '🏰'), 'GER': ('Repubblica di Weimar', '🏛️'), 'ITA': ("Regno d'Italia", '🏰'),
      'UCR': ('Ucraina', '🏛️'), 'SPA': ('Regno di Spagna', '🏰'), 'POL': ('Polonia', '🏛️'),
      'GBR': ('Regno Unito', '👑'), 'MAR': ('Marocco francese', '🌙'), 'EGI': ("Sultanato d'Egitto", '🌙'),
      'ROM': ('Regno di Romania', '🏰'), 'JUG': ('Regno dei Serbi, Croati e Sloveni', '🏰'),
      'OTT': ('Sultanato ottomano', '🌙'), 'ISL': ("Regno d'Islanda", '🏰'), 'BIE': ('Bielorussia', '🏛️'),
      'GRE': ('Regno di Grecia', '🏰'), 'CEC': ('Cecoslovacchia', '🏛️'), 'TUN': ('Tunisia francese', '🌙'),
      'ARM': ('Repubblica di Armenia', '🏛️'), 'BUL': ('Regno di Bulgaria', '🏰'), 'AZE': ('Azerbaigian', '🏛️'),
      'SIR': ('Siria francese', '🏰'), 'UNG': ("Regno d'Ungheria", '🏰'), 'AUT': ('Repubblica d\'Austria', '🏛️'),
      'LET': ('Lettonia', '🏛️'), 'POR': ('Repubblica portoghese', '🏛️'), 'LIT': ('Lituania', '🏛️'),
      'GEO': ('Georgia', '🏛️'), 'EST': ('Estonia', '🏛️'), 'DAN': ('Regno di Danimarca', '🏰'),
      'OLA': ('Regno dei Paesi Bassi', '🏰'), 'SVI': ('Svizzera', '🏛️'), 'BEL': ('Regno del Belgio', '🏰'),
      'RSU': ('Russia del Sud (i Bianchi)', '🏰'), 'ALB': ("Principato d'Albania", '🏰'),
      'LUX': ('Granducato di Lussemburgo', '🏰'),
    },
    'nomi': {
      'USSR': 'RSS', 'Algeria': 'ALG', 'Sweden': 'SWE', 'Libya (IT)': 'LIB', 'France': 'FRA', 'Finland': 'FIN',
      'Norway': 'NOR', 'Germany': 'GER', 'East Prussia': 'GER', 'Italy': 'ITA', 'Ukraine': 'UCR',
      'Spain': 'SPA', 'Spanish Sahara': 'SPA', 'Guanches': 'SPA', 'Poland': 'POL',
      'United Kingdom of Great Britain and Ireland': 'GBR', 'Morocco': 'MAR', 'Egypt': 'EGI', 'Romania': 'ROM',
      'Yugoslavia': 'JUG', 'Ottoman Sultanate': 'OTT', 'Iceland': 'ISL', 'White Russia': 'BIE', 'Greece': 'GRE',
      'Czechoslovakia': 'CEC', 'Tunisia': 'TUN', 'Armenia': 'ARM', 'Bulgaria': 'BUL', 'Azerbaijan': 'AZE',
      'Syria (France)': 'SIR', 'Hungary': 'UNG', 'Austria': 'AUT', 'Latvia': 'LET', 'Portugal': 'POR',
      'Lithuania': 'LIT', 'Georgia': 'GEO', 'Estonia': 'EST', 'Denmark': 'DAN', 'Netherlands': 'OLA',
      'Switzerland': 'SVI', 'Belgium': 'BEL', 'South Russia': 'RSU', 'Albania': 'ALB', 'Luxembourg': 'LUX',
    },
    'correzioni': {},
  },
  '1930': {
    'titolo': 'Tra le due guerre',
    'stati': {
      'URS': ('Unione Sovietica', '🚩'), 'ALG': ('Algeria francese', '🏰'), 'SWE': ('Regno di Svezia', '🏰'),
      'LIB': ('Libia italiana', '🏰'), 'FRA': ('Repubblica francese', '🏛️'), 'FIN': ('Finlandia', '🏛️'),
      'NOR': ('Regno di Norvegia', '🏰'), 'GER': ('Repubblica di Weimar', '🏛️'), 'TUR': ('Repubblica di Turchia', '🏛️'),
      'SPA': ('Regno di Spagna', '🏰'), 'POL': ('Polonia', '🏛️'), 'GBR': ('Regno Unito', '👑'),
      'IRL': ('Stato libero d\'Irlanda', '🏛️'), 'MAR': ('Marocco francese', '🌙'), 'EGI': ("Regno d'Egitto", '🏰'),
      'ITA': ("Regno d'Italia", '🏰'), 'ROM': ('Regno di Romania', '🏰'), 'JUG': ('Regno di Jugoslavia', '🏰'),
      'ISL': ("Regno d'Islanda", '🏰'), 'CEC': ('Cecoslovacchia', '🏛️'), 'TUN': ('Tunisia francese', '🌙'),
      'GRE': ('Repubblica ellenica', '🏛️'), 'BUL': ('Regno di Bulgaria', '🏰'), 'UNG': ("Regno d'Ungheria", '🏰'),
      'AUT': ("Repubblica d'Austria", '🏛️'), 'LET': ('Lettonia', '🏛️'), 'POR': ('Portogallo', '🏛️'),
      'LIT': ('Lituania', '🏛️'), 'EST': ('Estonia', '🏛️'), 'DAN': ('Regno di Danimarca', '🏰'),
      'OLA': ('Regno dei Paesi Bassi', '🏰'), 'SVI': ('Svizzera', '🏛️'), 'BEL': ('Regno del Belgio', '🏰'),
      'ALB': ("Regno d'Albania", '🏰'), 'LUX': ('Granducato di Lussemburgo', '🏰'),
    },
    'nomi': {
      'Dodecanese Islands': 'ITA', 'Danzig': 'POL',
      # nei dati del 1930 l'Unione Sovietica si chiama "White Russia" e la Turchia orientale "Armenia"
      'White Russia': 'URS', 'USSR': 'URS', 'Azerbaijan': 'URS', 'Georgia': 'URS', 'Algeria': 'ALG',
      'Sweden': 'SWE', 'Libya (IT)': 'LIB', 'France': 'FRA', 'Finland': 'FIN', 'Norway': 'NOR',
      'Germany': 'GER', 'East Prussia': 'GER', 'Republic of Turkey': 'TUR', 'Armenia': 'TUR',
      'Syria (France)': 'TUR', 'Spain': 'SPA', 'Spanish Sahara': 'SPA', 'Guanches': 'SPA', 'Poland': 'POL',
      'United Kingdom of Great Britain and Ireland': 'GBR', 'Morocco': 'MAR', 'Egypt': 'EGI', 'Italy': 'ITA',
      'Romania': 'ROM', 'Yugoslavia': 'JUG', 'Iceland': 'ISL', 'Czechoslovakia': 'CEC', 'Tunisia': 'TUN',
      'Greece': 'GRE', 'Bulgaria': 'BUL', 'Hungary': 'UNG', 'Austria': 'AUT', 'Latvia': 'LET',
      'Portugal': 'POR', 'Lithuania': 'LIT', 'Estonia': 'EST', 'Denmark': 'DAN', 'Netherlands': 'OLA',
      'Switzerland': 'SVI', 'Belgium': 'BEL', 'Albania': 'ALB', 'Luxembourg': 'LUX',
    },
    # l'Irlanda dal 1922 e' lo Stato libero; nel 1930 Siria e Armenia dei dati sono Turchia
    'correzioni': {'IE': 'IRL', 'TR': 'TUR'},
  },
  '1945': {
    'titolo': 'La fine della Seconda guerra mondiale',
    'stati': {
      'URS': ('Unione Sovietica', '🚩'), 'ALG': ('Algeria francese', '🏰'), 'TUR': ('Repubblica di Turchia', '🏛️'),
      'SWE': ('Regno di Svezia', '🏰'), 'FRA': ('Repubblica francese', '🏛️'), 'FIN': ('Finlandia', '🏛️'),
      'NOR': ('Regno di Norvegia', '🏰'), 'SPA': ('Spagna', '🏰'), 'POL': ('Polonia', '🏛️'),
      'MAR': ('Marocco francese', '🌙'), 'EGI': ("Regno d'Egitto", '🏰'), 'ITA': ("Regno d'Italia", '🏰'),
      'LIB': ('Libia sotto gli Alleati', '🏰'), 'GBR': ('Regno Unito', '👑'), 'JUG': ('Jugoslavia', '🚩'),
      'ROM': ('Regno di Romania', '🏰'), 'ISL': ('Islanda', '🏛️'), 'CEC': ('Cecoslovacchia', '🏛️'),
      'GSO': ('Germania, zona sovietica', '🚩'), 'TUN': ('Tunisia francese', '🌙'),
      'GUK': ('Germania, zona britannica', '🏰'), 'BUL': ('Regno di Bulgaria', '🏰'),
      'GUS': ('Germania, zona americana', '🏛️'), 'GRE': ('Regno di Grecia', '🏰'), 'UNG': ('Ungheria', '🏛️'),
      'AUT': ('Austria', '🏛️'), 'POR': ('Portogallo', '🏛️'), 'IRL': ('Irlanda', '🏛️'),
      'DAN': ('Regno di Danimarca', '🏰'), 'OLA': ('Regno dei Paesi Bassi', '🏰'), 'SVI': ('Svizzera', '🏛️'),
      'GFR': ('Germania, zona francese', '🏛️'), 'BEL': ('Regno del Belgio', '🏰'), 'ALB': ('Albania', '🚩'),
      'LUX': ('Granducato di Lussemburgo', '🏰'),
    },
    'nomi': {
      'USSR': 'URS', 'Algeria': 'ALG', 'Turkey': 'TUR', 'Sweden': 'SWE', 'France': 'FRA', 'Finland': 'FIN',
      'Norway': 'NOR', 'Spain': 'SPA', 'Western Sahara': 'SPA', 'Guanches': 'SPA', 'Poland': 'POL',
      'Morocco': 'MAR', 'Egypt': 'EGI', 'Italy': 'ITA', 'Cyraneica (UK Lybia)': 'LIB',
      'Tripolitana (UK Lybia)': 'LIB', 'Fezzan (Frech Lybia)': 'LIB', 'United Kingdom': 'GBR',
      'Yugoslavia': 'JUG', 'Romania': 'ROM', 'Iceland': 'ISL', 'Czechoslovakia': 'CEC',
      'Germany (Soviet)': 'GSO', 'Tunisia': 'TUN', 'Germany (UK)': 'GUK', 'Bulgaria': 'BUL',
      'Germany (USA)': 'GUS', 'Greece': 'GRE', 'Hungary': 'UNG', 'Austria': 'AUT', 'Portugal': 'POR',
      'Ireland': 'IRL', 'Denmark': 'DAN', 'Netherlands': 'OLA', 'Switzerland': 'SVI',
      'Germany (France)': 'GFR', 'Belgium': 'BEL', 'Albania': 'ALB', 'Luxembourg': 'LUX',
    },
    'correzioni': {},
  },
  '1960': {
    'titolo': 'La guerra fredda',
    'stati': {
      'URS': ('Unione Sovietica', '🚩'), 'ALG': ('Algeria francese', '🏰'), 'TUR': ('Repubblica di Turchia', '🏛️'),
      'SWE': ('Regno di Svezia', '🏰'), 'LIB': ('Regno di Libia', '🏰'), 'FRA': ('Repubblica francese', '🏛️'),
      'FIN': ('Finlandia', '🏛️'), 'NOR': ('Regno di Norvegia', '🏰'), 'SPA': ('Spagna', '🏰'),
      'POL': ('Polonia', '🚩'), 'MAR': ('Regno del Marocco', '🌙'), 'EGI': ('Repubblica Araba Unita', '🏛️'),
      'ITA': ('Repubblica italiana', '🏛️'), 'GBR': ('Regno Unito', '👑'), 'RFT': ('Germania Ovest', '🏛️'),
      'JUG': ('Jugoslavia', '🚩'), 'ROM': ('Romania', '🚩'), 'ISL': ('Islanda', '🏛️'), 'CEC': ('Cecoslovacchia', '🚩'),
      'DDR': ('Germania Est', '🚩'), 'TUN': ('Tunisia', '🏛️'), 'BUL': ('Bulgaria', '🚩'), 'GRE': ('Regno di Grecia', '🏰'),
      'UNG': ('Ungheria', '🚩'), 'AUT': ('Austria', '🏛️'), 'POR': ('Portogallo', '🏛️'), 'IRL': ('Irlanda', '🏛️'),
      'DAN': ('Regno di Danimarca', '🏰'), 'OLA': ('Regno dei Paesi Bassi', '🏰'), 'SVI': ('Svizzera', '🏛️'),
      'BEL': ('Regno del Belgio', '🏰'), 'ALB': ('Albania', '🚩'), 'CIP': ('Cipro', '🏛️'),
      'LUX': ('Granducato di Lussemburgo', '🏰'),
    },
    'nomi': {
      'USSR': 'URS', 'Algeria': 'ALG', 'Turkey': 'TUR', 'Sweden': 'SWE', 'Libya': 'LIB', 'France': 'FRA',
      'Finland': 'FIN', 'Norway': 'NOR', 'Spain': 'SPA', 'Western Sahara': 'SPA', 'Guanches': 'SPA',
      'Poland': 'POL', 'Morocco': 'MAR', 'Egypt': 'EGI', 'Italy': 'ITA', 'United Kingdom': 'GBR',
      'West Germany': 'RFT', 'Yugoslavia': 'JUG', 'Romania': 'ROM', 'Iceland': 'ISL', 'Czechoslovakia': 'CEC',
      'East Germany': 'DDR', 'Tunisia': 'TUN', 'Bulgaria': 'BUL', 'Greece': 'GRE', 'Hungary': 'UNG',
      'Austria': 'AUT', 'Portugal': 'POR', 'Ireland': 'IRL', 'Denmark': 'DAN', 'Netherlands': 'OLA',
      'Switzerland': 'SVI', 'Belgium': 'BEL', 'Albania': 'ALB', 'Cyprus': 'CIP', 'Luxembourg': 'LUX',
    },
    'correzioni': {},
  },
}
# v83: gli stati del Medio Oriente, del Sahara, del Sahel e dell'Asia centrale (le terre nuove).
# Un nome dei dati vale in ogni epoca in cui non e' gia' tradotto; OVERRIDE_V83 lo cambia per epoca.
NOMI_V83 = {
    'Ghaznavid Emirate': ('GAZ', 'Emirato ghaznavide', '🌙'), 'Makkura': ('MAK', 'Regno di Makuria', '🏰'),
    'West African cereal farmers': ('AGR', "Agricoltori dell'Africa occidentale", '⛺'),
    'Alwa': ('ALW', 'Regno di Alodia', '🏰'), 'Yemen': ('YEM', 'Yemen', '🌙'), 'Yemen (UK)': ('YEM', 'Yemen', '🌙'),
    'Hadramaut': ('HAD', 'Hadramawt', '🌙'), 'Kanem': ('KAN', 'Impero del Kanem', '👑'),
    'Kanem-Bornu': ('KAN', 'Impero del Kanem-Bornu', '👑'), 'Ghana': ('GHN', 'Impero del Ghana', '👑'),
    'Mali': ('MLI', 'Impero del Mali', '👑'), 'Muscat': ('OMA', "Imamato dell'Oman", '🌙'),
    'Oman': ('OMA', "Imamato dell'Oman", '🌙'), 'Muscat and Oman': ('OMA', 'Sultanato di Mascate e Oman', '🌙'),
    'Oman (British Raj)': ('OMA', 'Sultanato di Mascate e Oman', '🌙'),
    'Takrur': ('TAK', 'Regno del Takrur', '🏰'), 'Tekrur': ('TAK', 'Regno del Takrur', '🏰'),
    'Ifat': ('IFA', 'Sultanato di Ifat', '🌙'), 'Chagatai Khanate': ('CHA', 'Khanato Chagatai', '⛺'),
    'Ethiopia': ('ETI', "Impero d'Etiopia", '👑'), 'Abyssinia': ('ETI', "Impero d'Etiopia", '👑'),
    'Shoa': ('ETI', "Impero d'Etiopia", '👑'), 'Arabs': ('ARB', 'Tribù arabe', '⛺'),
    'Arabia': ('ARB', "Emirati dell'Arabia", '⛺'), 'Timurid Emirates': ('TIM', 'Emirati timuridi', '🌙'),
    'Songhai': ('SON', 'Impero songhai', '👑'), 'Hausa States': ('HAU', 'Città-stato hausa', '🏰'),
    'Funj': ('FUN', 'Sultanato di Funj', '🌙'), 'Mossi States': ('MOX', 'Regni mossi', '🏰'),
    'Islamic states': ('ISM', 'Sultanati islamici', '🌙'), 'Islamic and Hindu states': ('ISM', 'Sultanati del Belucistan', '🌙'),
    'Adal': ('ADA', 'Sultanato di Adal', '🌙'), 'Safavid Empire': ('SAF', 'Impero safavide', '🌙'),
    'Darfur': ('DAR', 'Sultanato del Darfur', '🌙'), 'Senegal': ('SEN', 'Impero jolof', '🏰'),
    'Mahra': ('MAH', 'Sultanato di Mahra', '🌙'), 'Wadai': ('WAD', 'Sultanato del Wadai', '🌙'),
    'Wadai Empire': ('WAD', 'Sultanato del Wadai', '🌙'), 'Bagirmi': ('BAG', 'Sultanato di Baguirmi', '🌙'),
    'Awsa': ('AWS', "Imamato di Aussa", '🌙'), 'Portuguese Guinea': ('GPO', 'Guinea portoghese', '🏰'),
    'Guinea-Bissau': ('GPO', 'Guinea portoghese', '🏰'), 'Guinea-Bissau (Portugal)': ('GPO', 'Guinea portoghese', '🏰'),
    'Segu': ('SEG', 'Impero bambara di Ségou', '👑'), 'Air': ('AIR', "Sultanato dell'Aïr", '🌙'),
    'central Asian khanates': ('KAZ', "Khanati dell'Asia centrale", '⛺'), 'Nejd': ('NEJ', 'Emirato del Najd', '🌙'),
    'Arabia (Nejd)': ('NEJ', 'Emirato del Najd', '🌙'), 'Afghanistan': ('AFG', 'Impero durrani', '👑'),
    'Kaarta': ('KAA', 'Regno del Kaarta', '🏰'), 'Fulani Empire': ('FUL', 'Califfato di Sokoto', '🌙'),
    'Sokoto Caliphate': ('FUL', 'Califfato di Sokoto', '🌙'), 'Somalia': ('SOM', 'Sultanati somali', '🌙'),
    'Tukular Caliphate': ('TUK', 'Impero tukulor', '🌙'), 'Bokhara Khanate': ('BUK', 'Emirato di Bukhara', '🌙'),
    'Dendi Kingdom': ('DEN', 'Regno dendi', '🏰'), 'British Raj': ('RAJ', 'Raj britannico', '👑'),
    'India': ('RAJ', 'Raj britannico', '👑'), 'Trucial Oman': ('TRU', 'Stati della Tregua', '🏰'),
    'Futa Toro': ('FTO', 'Imamato del Futa Toro', '🌙'), 'Futa Jalon': ('FJA', 'Imamato del Futa Jallon', '🌙'),
    'Sultanate of Damagaram': ('DAM', 'Sultanato di Damagaram', '🌙'), 'Borgu States': ('BOG', 'Regni del Borgu', '🏰'),
    'Qatar': ('QAT', 'Qatar', '🌙'), 'Wassoulou Empire': ('WAS', 'Impero wassoulou', '👑'),
    'First Samori Empire': ('WAS', 'Impero wassoulou', '👑'), 'Gambia': ('GAM', 'Gambia britannica', '🏰'),
    'Gambia, The': ('GAM', 'Gambia britannica', '🏰'), 'Senegal (FR)': ('SEN', 'Senegal francese', '🏰'),
    'French West Africa': ('AOF', 'Africa Occidentale Francese', '🏰'),
    'French Equatorial Africa': ('AEF', 'Africa Equatoriale Francese', '🏰'),
    'Anglo-Egyptian Sudan': ('SUD', 'Sudan anglo-egiziano', '🏰'), 'Sudan': ('SUD', 'Sudan anglo-egiziano', '🏰'),
    'British Protectorate': ('PBR', 'Protettorati britannici in Arabia', '🏰'),
    'Nigeria': ('NIG', 'Nigeria britannica', '🏰'), 'Rio De Oro': ('RDO', 'Río de Oro spagnolo', '🏰'),
    'Eritrea': ('ERI', 'Eritrea italiana', '🏰'), 'Kuwait': ('KUW', 'Kuwait', '🌙'),
    'Kamerun': ('CAM', 'Camerun tedesco', '🏰'), 'French Cameroons': ('CAM', 'Camerun francese', '🏰'),
    'Cameroon': ('CAM', 'Camerun francese', '🏰'), 'Djibouti': ('GIB', 'Somalia francese', '🏰'),
    'French Somaliland': ('GIB', 'Somalia francese', '🏰'), 'British Somaliland': ('SBR', 'Somaliland britannico', '🏰'),
    'Italian Somaliland': ('SOI', 'Somalia italiana', '🏰'), 'Iran': ('PER', 'Persia', '🌙'),
    "Emirate of Bin Shal'an": ('NEJ', 'Sultanato del Najd', '🌙'), 'Hejaz': ('HEJ', 'Regno del Hegiaz', '🏰'),
    'Hail': ('HAI', "Emirato di Ha'il", '🌙'), 'Mesopotamia (GB)': ('IRQ', 'Mesopotamia britannica', '🏰'),
    'Mandatory Palestine (GB)': ('PAL', 'Palestina britannica', '🏰'),
    'Ethiopia (Italy)': ('AOI', 'Africa Orientale Italiana', '🏰'), 'Eritrea (Italy)': ('AOI', 'Africa Orientale Italiana', '🏰'),
    'Saudi Arabia': ('SAU', 'Arabia Saudita', '🏰'), 'Niger': ('NGR', 'Niger francese', '🏰'),
    'Mauritania': ('MRT', 'Mauritania francese', '🏰'), 'Chad': ('CIA', 'Ciad francese', '🏰'),
    'Iraq': ('IRQ', "Regno dell'Iraq", '🏰'), 'Syria': ('SIR', 'Siria', '🏛️'),
    'Burkina Faso': ('BFA', 'Alto Volta francese', '🏰'), 'United Arab Emirates': ('TRU', 'Stati della Tregua', '🏰'),
    'Jordan': ('GIO', 'Transgiordania', '🏰'), 'Pakistan': ('RAJ', 'Raj britannico', '👑'),
    'Guinea': ('GUI', 'Guinea francese', '🏰'), 'Israel': ('PAL', 'Palestina britannica', '🏰'),
    'Lebanon': ('LBN', 'Libano', '🏛️'), 'Benin': ('DAH', 'Dahomey francese', '🏰'),
    'Kong Empire': ('KON', 'Impero di Kong', '🌙'), 'Kong': ('KON', 'Impero di Kong', '🌙'),
    'Arma': ('TIB', 'Pascialato di Timbuctù', '🌙'),
}
OVERRIDE_V83 = {
    '1715': {'Senegal': ('SEN', 'Regni wolof', '🏰')},
    '1783': {'Senegal': ('SEN', 'Regni wolof', '🏰')},
    '1800': {'Senegal': ('SEN', 'Regni wolof', '🏰')},
    '1815': {'Senegal': ('SEN', 'Regni wolof', '🏰'), 'Afghanistan': ('AFG', "Emirato dell'Afghanistan", '🌙')},
    '1880': {'Afghanistan': ('AFG', "Emirato dell'Afghanistan", '🌙'), 'Oman': ('OMA', 'Sultanato di Mascate e Oman', '🌙')},
    '1900': {'Afghanistan': ('AFG', "Emirato dell'Afghanistan", '🌙'), 'Oman': ('OMA', 'Sultanato di Mascate e Oman', '🌙'),
             'Senegal': ('SEN', 'Senegal francese', '🏰')},
    '1914': {'Afghanistan': ('AFG', "Emirato dell'Afghanistan", '🌙'), 'Yemen': ('YEM', 'Yemen ottomano', '🌙')},
    '1920': {'Afghanistan': ('AFG', "Regno dell'Afghanistan", '🏰'), 'Yemen': ('YEM', 'Regno dello Yemen', '🏰'),
             'Ethiopia': ('ETI', "Impero d'Etiopia", '👑')},
    '1930': {'Afghanistan': ('AFG', "Regno dell'Afghanistan", '🏰'), 'Yemen': ('YEM', 'Regno dello Yemen', '🏰'),
             "Emirate of Bin Shal'an": ('NEJ', 'Regno del Hegiaz e del Najd', '🏰'),
             'Hejaz': ('NEJ', 'Regno del Hegiaz e del Najd', '🏰'), 'Hail': ('NEJ', 'Regno del Hegiaz e del Najd', '🏰'),
             'Mesopotamia (GB)': ('IRQ', 'Iraq britannico', '🏰')},
    '1938': {'Afghanistan': ('AFG', "Regno dell'Afghanistan", '🏰'), 'Yemen (UK)': ('YEM', 'Regno dello Yemen', '🏰'),
             'Iran': ('PER', 'Iran', '🏰'), "Emirate of Bin Shal'an": ('SAU', 'Arabia Saudita', '🏰'),
             'Hejaz': ('SAU', 'Arabia Saudita', '🏰'), 'Hail': ('SAU', 'Arabia Saudita', '🏰'),
             'Mesopotamia (GB)': ('IRQ', "Regno dell'Iraq", '🏰')},
    '1945': {'Afghanistan': ('AFG', "Regno dell'Afghanistan", '🏰'), 'Yemen': ('YEM', 'Regno dello Yemen', '🏰'),
             'Iran': ('PER', 'Iran', '🏰'), 'Mali': ('MLI', 'Sudan francese', '🏰'),
             'Senegal': ('SEN', 'Senegal francese', '🏰'), 'Ethiopia': ('ETI', "Impero d'Etiopia", '👑'),
             'Eritrea': ('ERI', 'Eritrea britannica', '🏰'), 'Somalia': ('SOI', 'Somalia italiana', '🏰'),
             'Oman': ('OMA', 'Sultanato di Mascate e Oman', '🌙')},
    '1960': {'Afghanistan': ('AFG', "Regno dell'Afghanistan", '🏰'), 'Yemen': ('YEM', 'Regno dello Yemen', '🏰'),
             'Iran': ('PER', 'Iran', '🏰'), 'Mali': ('MLI', 'Mali', '🏛️'), 'Senegal': ('SEN', 'Senegal', '🏛️'),
             'Ethiopia': ('ETI', "Impero d'Etiopia", '👑'), 'Eritrea': ('ERI', "Eritrea (federata all'Etiopia)", '🏰'),
             'Somalia': ('SOM', 'Somalia', '🏛️'), 'Oman': ('OMA', 'Sultanato di Mascate e Oman', '🌙'),
             'Sudan': ('SUD', 'Sudan', '🏛️'), 'Niger': ('NGR', 'Niger', '🏛️'), 'Mauritania': ('MRT', 'Mauritania', '🏛️'),
             'Chad': ('CIA', 'Ciad', '🏛️'), 'Iraq': ('IRQ', "Repubblica dell'Iraq", '🏛️'),
             'Burkina Faso': ('BFA', 'Alto Volta', '🏛️'), 'Jordan': ('GIO', 'Regno di Giordania', '🏰'),
             'Pakistan': ('PAK', 'Pakistan', '🏛️'), 'Guinea': ('GUI', 'Guinea', '🏛️'),
             'Israel': ('ISR', 'Israele', '🏛️'), 'Nigeria': ('NIG', 'Nigeria', '🏛️'),
             'Cameroon': ('CAM', 'Camerun', '🏛️'), 'Benin': ('DAH', 'Dahomey', '🏛️')},
}
ITALIANO_V83 = {}  # (anno, nome dei dati) -> (codice, nome italiano, emblema): lo stato si scrive solo se c'e'
for _anno, _E in EPOCHE.items():
    for _nome, (_cod, _it, _emb) in {**NOMI_V83, **OVERRIDE_V83.get(_anno, {})}.items():
        if _nome in _E['nomi'] and _nome not in OVERRIDE_V83.get(_anno, {}):
            continue  # gia' tradotto dalle epoche di prima: resta com'era
        if _cod in _E['stati']:
            continue  # il codice e' gia' di uno stato di quest'epoca: il nome resta senza traduzione
        _E['nomi'][_nome] = _cod
        ITALIANO_V83[(_anno, _nome)] = (_cod, _it, _emb)

# in ordine di anno: il gioco cerca l'ultima istantanea non successiva all'anno scelto
EPOCHE = dict(sorted(EPOCHE.items(), key=lambda kv: int(kv[0])))

# la lettera dell'i-esimo stato nella griglia (lo stesso alfabeto e' nel gioco)
ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+,-/:;<=>?@[]^_{|}~ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ'


def leggi_poligoni(path):
    from shapely.geometry import shape
    geoms, nomi = [], []
    for f in json.load(open(path, encoding='utf-8'))['features']:
        if not f['geometry']:
            continue
        g = shape(f['geometry']).buffer(0)
        if g.is_empty:
            continue
        geoms.append(g)
        nomi.append((f['properties'] or {}).get('NAME') or None)
    return geoms, nomi


def assegna(tiles, geoms, nomi):
    """il nome dello stato storico di ogni casella (None = terra di nessuno)"""
    import shapely
    from shapely.strtree import STRtree
    pts = shapely.points([[t[2], t[3]] for t in tiles])
    tree = STRtree(geoms)
    aree = np.array([g.area for g in geoms])
    best = np.full(len(tiles), -1)
    ip, ig = tree.query(pts, predicate='within')
    for p, g in zip(ip, ig):  # il poligono piu' piccolo che contiene la casella
        if best[p] < 0 or aree[g] < aree[best[p]]:
            best[p] = g
    fuori = np.where(best < 0)[0]
    if len(fuori):
        con_nome = [i for i, n in enumerate(nomi) if n]  # fuori dai poligoni: il piu' vicino con un nome
        ip, ig = STRtree([geoms[i] for i in con_nome]).query_nearest(pts[fuori], max_distance=NEAREST_GRADI)
        for p, g in zip(ip, ig):
            if best[fuori[p]] < 0:
                best[fuori[p]] = con_nome[g]
    return [nomi[b] if b >= 0 else None for b in best]


def vicino_prevalente(tiles, codici, idx_stato, validi):
    """il codice valido piu' comune fra le caselle piu' vicine a quelle di uno stato"""
    xy = np.array([[t[2], t[3]] for t in tiles])
    ok = np.array([c in validi for c in codici])
    voti = {}
    for i in idx_stato:
        d = np.hypot(*(xy[ok] - xy[i]).T)
        for j in np.argsort(d)[:6]:
            c = np.array(codici, dtype=object)[ok][j]
            voti[c] = voti.get(c, 0) + 1
    return max(voti, key=voti.get) if voti else None


def codifica(rows, cols, tiles, codici, alfabeto):
    """RLE riga per riga come BIOMI; le caselle di mare non contano (allungano il tratto corrente)"""
    grid = [None] * (rows * cols)  # None = mare, non conta
    for t, c in zip(tiles, codici):
        grid[t[0] * cols + t[1]] = alfabeto.get(c, '.')
    out, cur, n = [], None, 0
    for v in grid:
        if v is None:
            n += 1
        elif cur is None or v == cur:
            cur, n = v, n + 1
        else:
            out.append((str(n) if n > 1 else '') + cur)
            cur, n = v, 1
    out.append((str(n) if n > 1 else '') + (cur or '.'))
    return ''.join(out)


def anteprima(path, rows, cols, tiles, codici, stati):
    from PIL import Image, ImageDraw
    import colorsys, hashlib
    img = Image.new('RGB', (cols * 3, rows * 3), (30, 60, 100))
    d = ImageDraw.Draw(img)
    col = {}
    for c in stati:
        h = int(hashlib.md5(c.encode()).hexdigest()[:6], 16) / 0xffffff
        col[c] = tuple(int(255 * x) for x in colorsys.hsv_to_rgb(h, 0.55, 0.85))
    pos = {}
    for t, c in zip(tiles, codici):
        x, y = t[1] * 3 + (t[0] % 2) * 1.5, t[0] * 3
        d.rectangle([x, y, x + 2.6, y + 2.6], fill=col.get(c, (200, 190, 160)))
        if c:
            pos.setdefault(c, []).append((x, y))
    for c, ps in pos.items():
        if len(ps) < 4:
            continue
        x, y = np.mean(ps, axis=0)
        d.text((x - 8, y - 4), c, fill=(0, 0, 0))
    img.save(path)


def main():
    src, tiles_path, html_path = sys.argv[1:4]
    prev = sys.argv[4] if len(sys.argv) > 4 else None
    T = json.load(open(tiles_path))
    out = {}
    for anno, E in EPOCHE.items():
        geoms, nomi = leggi_poligoni(f'{src}/world_{anno}.geojson')
        per_taglia = {}
        for taglia, M in T.items():
            tiles = M['tiles']
            nn = assegna(tiles, geoms, nomi)
            codici = []
            for t, n in zip(tiles, nn):
                if t[4] in E['correzioni']:
                    codici.append(E['correzioni'][t[4]])
                elif n is None:
                    codici.append(None)
                elif n in E['nomi']:
                    codici.append(E['nomi'][n])
                else:
                    codici.append('?' + n)
            per_taglia[taglia] = codici
        # v83: gli stati delle terre nuove presenti sulla mappa (con lo stesso codice vince il nome piu' esteso)
        quanti = {}
        for n in assegna(T['piccola']['tiles'], geoms, nomi):
            if (anno, n) in ITALIANO_V83: quanti[n] = quanti.get(n, 0) + 1
        for n in sorted(quanti, key=lambda n: quanti[n]):
            cod, it, emb = ITALIANO_V83[(anno, n)]
            E['stati'][cod] = (it, emb)
        # gli stati sconosciuti o troppo piccoli (sulla mappa piccola) si uniscono al vicino
        tp, cp = T['piccola']['tiles'], per_taglia['piccola']
        conta = {}
        for c in cp:
            conta[c] = conta.get(c, 0) + 1
        fusioni = {}
        validi = {c for c in conta if c and not c.startswith('?') and conta[c] >= MIN_CASELLE}
        for c in conta:
            if c and c not in validi:
                dove = vicino_prevalente(tp, cp, [i for i, x in enumerate(cp) if x == c], validi)
                fusioni[c] = dove
                print(f'{anno}: {c} ({conta[c]} caselle) unito a {dove}', file=sys.stderr)
        for taglia in per_taglia:
            cs = [fusioni.get(c, c) for c in per_taglia[taglia]]
            for c in sorted({c for c in cs if c and c not in validi}):  # solo sulle mappe piu' fitte
                dove = vicino_prevalente(T[taglia]['tiles'], cs, [i for i, x in enumerate(cs) if x == c], validi)
                print(f'{anno}/{taglia}: {c} unito a {dove}', file=sys.stderr)
                cs = [dove if x == c else x for x in cs]
            per_taglia[taglia] = cs
            for c in cs:
                if c and c not in E['stati']:
                    sys.exit(f'{anno}/{taglia}: stato senza nome italiano: {c}')
        usati = [c for c in E['stati'] if c in set(per_taglia['piccola'])]
        alf = {c: ALFABETO[i] for i, c in enumerate(usati)}
        out[anno] = {
            'titolo': E['titolo'],
            'stati': {c: {'nome': E['stati'][c][0], 'emblema': E['stati'][c][1]} for c in usati},
            'griglia': {t: codifica(T[t]['rows'], T[t]['cols'], T[t]['tiles'], per_taglia[t], alf) for t in T},
        }
        n_stati = len(usati)
        print(f'{anno}: {n_stati} stati, ' + ', '.join(f'{t} {len(out[anno]["griglia"][t]) // 1024} KB' for t in T),
              file=sys.stderr)
        if prev:
            anteprima(f'{prev}/epoca_{anno}.png', T['piccola']['rows'], T['piccola']['cols'],
                      T['piccola']['tiles'], per_taglia['piccola'], usati)
    riga = 'const EPOCHE = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';'
    h = open(html_path, encoding='utf-8').read()
    if re.search(r'^const EPOCHE = .*;$', h, re.M):
        h = re.sub(r'^const EPOCHE = .*;$', lambda m: riga, h, count=1, flags=re.M)
    else:
        h = re.sub(r'^(const BIOMI = .*;)$', lambda m: m.group(1) + '\n' + riga, h, count=1, flags=re.M)
    open(html_path, 'w', encoding='utf-8').write(h)


if __name__ == '__main__':
    main()
