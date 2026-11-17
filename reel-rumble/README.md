# Reel Rumble – Makara Kapışması

1930'lar çizgi film tarzında, tamamen özgün karakterler ve müziklerle yapılmış bir **koş-ve-ateş et boss rush** oyunu. Saf HTML5 Canvas + JavaScript; kurulum gerektirmez.

## Nasıl çalıştırılır
- **En kolayı:** `index.html` dosyasına çift tıkla (çevrimiçi mod ve yazı tipleri için internet gerekir).
- **Yerel sunucu (önerilir):** klasörde `node serve.js` çalıştır, sonra `http://localhost:8642` adresini aç.

## İnternette yayınlamak (arkadaşınla çevrimiçi oynamak için)
Klasörün tamamını herhangi bir statik barındırmaya yükle: **itch.io** (HTML5 oyun olarak zip), **GitHub Pages**, **Netlify** veya **Cloudflare Pages**. Sunucu kodu gerekmez; çevrimiçi bağlantı WebRTC (PeerJS) ile doğrudan iki tarayıcı arasında kurulur.

Çevrimiçi oynamak için: Ana menü → **Çevrimiçi 2 Oyuncu** → biri **Oda Kur** der ve 5 harfli kodu paylaşır, diğeri kodu yazıp **Katıl** der. Ev sahibi haritada bossu seçer; dövüş ev sahibinin bilgisayarında hesaplanır, misafir girdisini gönderir.

## Kontroller
| Eylem | Klavye (tek oyuncu) | Gamepad |
|---|---|---|
| Hareket | Yön tuşları / WASD | Sol çubuk / D-pad |
| Zıpla (havada tekrar: **savuştur**) | Z / Boşluk / J | A |
| Ateş | X / K | X / RT |
| EX / Süper | C / I | B |
| Atılma (dash) | Shift / L | RB |
| Sabitle & 8 yöne nişan | V / U | LB / LT |
| Silah değiştir | Tab / Q / O | Y |
| Duraklat | Esc / P | Start |
| Tam ekran | F | – |

**Gamepad:** Xbox, PlayStation ve genel kollar desteklenir. Kol bağlanınca ekrandaki ipuçları kol tuşlarına döner; Ayarlar'dan tuşları yeniden atayabilir, titreşimi ve çubuk ölü bölgesini ayarlayabilirsin. Dövüşte kol çıkarsa oyun duraklar. Tarayıcı kolu görmek için önce bir tuşa basılmasını bekler.

**Yerel 2 oyuncu:** P1 = WASD + J/K/L/I/U/O, P2 = yön tuşları + Num1/2/3/0/4/5 (veya , . / ' ; \\). Takılı gamepad'ler otomatik atanır.

## İçerik
- 6 boss, her biri 3 fazlı:
  - Kara: **Albay Mısır**, **Madam Gramofon**, **Baron Kazan**
  - Uçak bölümleri: **Bulut Baronu** (yağmur, yıldırım, girdap), **Kaptan Kâğıt** (kâğıt uçak → gazete → buruşuk top)
  - Final: **Projeksiyoncu** (diğer beşi yenilince açılır)
- **Uçak modu**: 8 yöne uçuş, makineli/bomba arası geçiş, atılma tuşunu basılı tutarak küçülme, havada savuşturma, EX torpido, süper dev mermi
- **Lunapark Yolu**: kayan kameralı koş-ve-ateş-et bölümü; çukurlar, 4 düşman türü, 5 gizli jeton, çıkış çadırı
- **Boss Maratonu**: 6 boss arka arkaya, toplam süre rekoru
- **19 başarım** ve istatistik ekranı
- Türkçe **sunucu sesi** ("Hazır mısın?… Motor!… Kes!"), dövüş öncesi boss tanıtım kartı
- **Prova Sahnesi**: kontrol kontrol listesi olan antrenman
- Pembe nesneleri **savuşturma**, 5 kartlı **süper bar**, **EX atışlar**, 3 **süper hareket**
- 6 silah, 7 tılsım (yeni: **Pembe Kurdele** – otomatik savuşturma), **Bilet Gişesi** dükkânı ve jeton ekonomisi
- 3 zorluk (Basit / Normal / Uzman), **S'den D'ye not** sistemi, yenilgi ekranında ilerleme çubuğu
- Ortak oyunda düşen arkadaşının hayaletini savuşturarak **dirilt**
- Yerel ve **çevrimiçi** 2 oyunculu mod, gamepad desteği
- Film greni / sepya / çizik efekti, ekran sarsıntısı, isteğe bağlı boss can barı ve çarpışma kutuları
- Kodla üretilen swing/ragtime müzikler ve sentez ses efektleri
- Otomatik kayıt (tarayıcı localStorage)

## Dosyalar
`js/core.js` girdi/kayıt/veri · `audio.js` ses ve müzik · `art.js`, `bg.js` çizimler · `player.js` oyuncu ve silahlar · `plane.js` uçak modu · `fight.js` dövüş motoru · `boss_*.js` bosslar · `run.js` koşu bölümü · `extras.js` başarımlar/sunucu/maraton · `ui_*.js` ekranlar · `net.js` çevrimiçi · `main.js` döngü.

**Uçak kontrolleri:** hareket = 8 yön, Ateş = ateş, Silah değiştir = makineli/bomba, **Atılma tuşunu basılı tut = küçül**, Zıpla = savuştur, EX = torpido (5 kartta dev mermi).
