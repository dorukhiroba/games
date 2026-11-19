# BasketballManager

Tarayıcıda çalışan basketbol menajerlik oyunu. Lig, **2010 NBA yapısını** temel alır: aynı 30 şehir, Doğu ve Batı konferansları, altı bölüm ve 2009-10 sezonundaki güç dengesi. Kulüp ve oyuncu adları kurgusaldır. Gerçek veriyi JSON ile kendin yükleyebilirsin (aşağıya bak).

Saf HTML + JavaScript ile yazıldı, kurulum gerektirmez. Kariyerler tarayıcıya (localStorage) otomatik kaydedilir.

## Nasıl çalıştırılır
- `index.html` dosyasını aç. Arcade'in içinden açarsan **Oyunlardan çık** düğmesi ana sayfaya döner.
- Yeni kariyer: menajer adını yaz, takımını seç, **Kariyere başla**.
- **Devam ▶** (veya Boşluk tuşu): bir sonraki maça ya da önemli bir olaya kadar ilerler. **+1 gün**, **+1 hafta** ve **Aşama sonuna** düğmeleri maçları otomatik oynatır.
- **Başlangıç noktası:** yeni kariyerde üç seçenek var:
  - **Draft öncesi (1 Haziran 2010, önerilen):** 2010 draftını, yaz transferlerini, hazırlık kampını ve sezonu baştan yaşarsın.
  - **Serbest oyuncu dönemi (1 Temmuz 2010):** draft bitmiş, piyasa açılıyor.
  - **Sezona 2 ay kala (26 Ağustos 2010):** piyasanın büyük kısmı tamamlanmış; kamp ve sezon kalıyor.

## Arkadaşlarla çevrimiçi oyun
Sunucu ya da hesap gerekmez; tarayıcılar birbirine doğrudan (WebRTC) bağlanır.

1. **Kur:** ana menüde takımını seç ve **🌐 Çevrimiçi kur**'a bas. Kayıtlı bir kariyeri de **🌐 Çevrimiçi aç** ile paylaşabilirsin. Ekranda 5 haneli bir **oyun kodu** çıkar.
2. **Katıl:** arkadaşların aynı sayfayı açar, adını ve kodu yazıp **Katıl**'a basar (ya da "Açık oyunlar" listesinden seçer). Her menajer **farklı bir boş takım** seçer.
3. **Zaman:**
   - Çevrimiçi oyunda tek düğme vardır: herkes **Devam**'a basınca zaman bir sonraki maç gününe ya da bir menajerin kararını bekleyen olaya kadar ilerler. **+1 gün**, **+1 hafta** ve **Aşama sonuna** yalnızca tek oyunculuda vardır.
   - Bir arkadaş uzun süre yanıt vermezse ev sahibi **Menajerler** ekranındaki **Beklemeden ilerlet** ile devam edebilir.
4. **Maç günü:**
   - Maçı olan herkes kendi maçını **2D canlı izler** ya da **sonucu alır**. İzleyen mola, oyuncu değişikliği ve taktikle (tempo, savunma, pick-and-roll savunması, üçlük, pres, setler) maçı yönetir.
   - **Canlı maçlar senkron oynanır:**
     - Herkes kararını verince bütün canlı maçlar birlikte başlar.
     - Maçlar aynı dakikada ilerler: önde olan maç biraz yavaş, geride olan biraz hızlı gösterilir; aradaki fark hiçbir zaman bir hücumdan fazla açılmaz.
     - Çeyrek aralarında maçlar birbirini bekler.
     - **Hız ortaktır:** herkes kendi hızını seçer, en yavaş seçilen geçerli olur. Hız düğmelerinin yanında ortak hız ve kimin neyi seçtiği görünür.
     - **Mola ve duraklatma herkesi durdurur:** maçı olan bir menajer mola alır ya da **⏸ Durdur**'a basarsa bütün canlı maçlar durur ve ekranda kimin taktik yaptığı yazar. Mola sırasında herkes kendi takımında değişiklik yapabilir. Durduran **▶ Devam**'a basınca maçlar sürer; en geç 90 saniye sonra kendiliğinden devam eder.
   - **Diğer maçlar:** maç ekranının üstünde o günkü diğer menajer maçlarının canlı skoru ve dakikası görünür. Birine tıklayınca o maçı seyirci olarak izlersin; kendi maçın bu sırada diğerleriyle birlikte oynanmaya devam eder ve **↩ maçına dön** ile geri dönersin.
   - **İki menajer karşılaşırsa** maç iki ekranda aynı anda ilerler ve iki taraf da kendi takımına koçluk yapar.
   - Bağlantısı kopan ya da 45 saniye boyunca yanıt vermeyen izleyici maçı bekletmez; onun maçı diğerleriyle birlikte oynanmaya devam eder. Kimse izlemiyorsa kalan maçlar hemen sonuçlanır.
   - Gün, tüm menajer maçları bitince tamamlanır.
5. **Menajerler arası işlemler:**
   - Takas teklifi gönderebilirsin; teklif karşı tarafın gelen kutusuna düşer ve orada kabul ya da reddedilir.
   - Aynı serbest oyuncuya iki menajer teklif verirse oyuncu ikisini karşılaştırır.
   - **Menajerler** ekranında herkesin durumu ve sohbet vardır.
6. **Kopma ve geri dönüş:**
   - Bağlantısı kopan menajerin takımını yardımcı antrenör yönetir: kadroyu tamamlar, draftta seçer, maçları otomatik oynar.
   - Tarayıcı, her lig için menajeri hatırlar. Aynı cihazdan dönen menajer doğrudan kendi takımına girer. Başka bir cihazdan **aynı adla** katılan da takımını geri alır.
7. **Kayıt ve sonraki oturum:**
   - Lig ev sahibinin tarayıcısına kaydedilir. Her misafirin tarayıcısında da güncel bir kopyası tutulur.
   - Ana menüdeki **Kariyerlerin** listesinde çevrimiçi lig iki şekilde görünür:
     - **Ev sahibinde:** **Devam et** ligi aynı kodla yeniden çevrimiçi açar. **Tek başına aç** ise arkadaşlar olmadan açar.
     - **Misafirde:** **Devam et** aynı takımla yeniden katılır. Ev sahibi henüz açmadıysa sayfa bekler ve açtığı anda otomatik bağlanır.
   - **Ev sahibi gelemiyorsa** bir misafir **Ev sahibi yoksa sen aç** ile ligi kendi kopyasından açabilir, diğerleri ona bağlanır.
   - O lig açıkken ev sahibi kendi kaydıyla **Devam et** derse ikinci bir lig açılmaz; açık olan lige bağlanır ve en güncel hal kullanılır.

## Neler var
- **Sezon takvimi:** 1 Temmuz'da serbest oyuncu dönemi açılır. Hazırlık kampı 1 Ekim'de, normal sezon 26 Ekim'de başlar. Her takım 82 maç oynar, 41'i iç sahada. Takas son günü 24 Şubat'tır. Ardından her konferanstan 8 takımla playoff oynanır; her tur 7 maç üzerinden, 2-2-1-1-1 iç saha düzeniyle. Draft 24 Haziran'da, sezon geçişi 30 Haziran'dadır.
- **Maaş tavanı (2010-11 kuralları, sadeleştirilmiş):**
  - Tavan ve vergi:
    - Tavan 58.04 M$, lüks vergi sınırı 70.31 M$, minimum bordro 43.53 M$.
    - Sınırı aşan her dolar için 1$ vergi ödenir.
    - Tavan her yıl %3 büyür.
  - Maaş sınırları:
    - Maksimum maaş tecrübeye göre tavanın %25'i, %30'u ya da %35'i.
    - Minimum maaş tecrübe ölçeğine göredir.
  - İstisnalar:
    - Orta seviye istisnası (MLE): 5.77 M$.
    - İki yılda bir istisnası (BAE): 2.08 M$.
    - Minimum maaş istisnası.
  - Bird hakları:
    - Tam Bird: tavanı aşarak maksimuma kadar, 6 yıl, %10.5 yıllık artış.
    - Erken Bird: önceki maaşın %175'i.
    - Bird olmayan hak: önceki maaşın %120'si.
  - Takaslar: tavan üstündeki takım, gönderdiği maaşın %125'i + 100 B$'a kadar maaş alabilir.
  - Kadro: sezonda 13–15 oyuncu, sezon arasında en fazla 20.
  - Serbest bırakma: oyuncunun kalan maaşı ölü para olarak bordroda kalır.
- **Pazarlık:**
  - Oyuncunun beklentisi maaş, süre ve rol olarak gelir; menajerinin sabrı vardır.
  - Düşük teklif sabrı azaltır, karşı teklif gelir. Sabır biterse oyuncu 10 gün masaya dönmez.
  - Rol sözü (ilk beş, rotasyon, yedek) verebilirsin; sözü tutmazsan moral düşer ve oyuncu transfer isteyebilir.
  - Serbest oyuncular birden fazla teklifi karşılaştırır: para, süre, takımın gücü ve rol.
- **Sözleşme uzatma ve kısıtlı serbest oyuncular:**
  - Son yılına giren oyuncunla uzatma görüşmesi yapabilirsin.
  - Çaylak sözleşmesi biten oyuncu kısıtlı serbest oyuncu olur. Başka takımın teklifini 3 gün içinde eşleştirirsen sende kalır.
- **Takas merkezi:**
  - Oyuncu ve draft hakkı (4 yıl ilerisine kadar) ekle; maaş ve kadro kuralları anında kontrol edilir.
  - Karşı takımın ilgisini çubukta görürsün. Takımlar stratejilerine göre (şampiyonluk, dengeli, yeniden yapılanma) farklı değer biçer.
  - **Ne istersiniz?** düğmesi karşı teklif ister. Sezon içinde yapay zekâ da sana teklif gönderir ve kendi arasında takas yapar.
- **Taktik:**
  - Sekiz hazır hücum seti: Pick & Roll, Horns, Motion, İzolasyon, Post-Up, Flex, Spain P&R, El pası. Setlerin kullanım ağırlığını sen belirlersin.
  - **Set çizici:** oyuncuları yerleştir; koşu, perde, pas ve şutu sırayla çiz, ▶ ile oynat. Motor seti analiz eder (şut bölgesi, pas ve perde sayısı, boşluk) ve maçta kullanır.
  - **Savunma çizici:** beş savunmacıyı sürükleyerek kendi alan savunmanı çiz. Motor, potayı, dirsekleri, yayı ve köşeleri ne kadar kapattığını hesaplar. Her sete karşı canlı önizleme yapabilirsin.
  - Diğer ayarlar:
    - Hazır savunmalar: adam adama, her perdede değişme, 2-3, 3-2, 1-3-1, tam saha pres.
    - Pick & roll savunması: drop, hedge, blitz.
    - Tempo, üçlük eğilimi ve antrenman odağı.
- **2D canlı maç:**
  - Maç gün gün değil, top topa simüle edilir. Her hücum, çağrılan setin koreografisiyle oynatılır: top getirme, setteki koşular ve perdeler, paslar, şut, blok, ribaund ve serbest atışlar.
  - Hız 1x–16x arası ayarlanır; çeyrek ya da maç sonuna atlayabilirsin.
  - Koçluk sekmesinden mola alıp oyuncu değiştirebilir, savunmayı, tempoyu ve set ağırlıklarını maç içinde değiştirebilirsin.
  - Anlatım ve kutu skor maç boyunca güncellenir.
- **Draft ve gençler:**
  - Her yıl 72 aday gelir. Draft 2 tur sürer; sıra 2010 öncesi piyango oranlarıyla belirlenir.
  - Gözlemci puanlarıyla adayların gerçek değerini netleştirirsin.
  - 1. tur seçimleri 4 yıllık çaylak ölçeği sözleşmesi, 2. tur seçimleri 2 yıllık minimum sözleşme alır.
  - **Gelişim Ligi:** ilk 3 sezonundaki en fazla 4 oyuncuyu gönderirsin; düzenli süre aldıkları için daha hızlı gelişirler.
  - Her yaz uluslararası serbest oyuncular gelir. Yaşlanan oyuncular geriler ve emekli olur. Efsaneler tarihçede kalır.
- **Lig:** liderler, tüm istatistikler ve ödüller (MVP, Final MVP, Yılın Savunmacısı, Çaylak, 6. Adam, En Çok Gelişen). Ayrıca şampiyonlar tarihçesi ve efsaneler listesi.
- **Kulüp:**
  - Bilet fiyatı, seyirci ve kasa.
  - Yönetim kurulunun güveni ve sezon hedefi. Güven %15'in altına düşerse görevden alınırsın; o zaman başka bir kulüpten teklif gelir.

## Veri yükleme (JSON)
Yeni kariyer ekranında **Veri yükle** bölümüne yapıştırabilir ya da dosya seçebilirsin. Oyun içinde **Veri › Lig verisini indir** de aynı biçimi üretir. Bu dosyayı düzenleyip yeniden yükleyebilirsin. Bütün alanlar isteğe bağlıdır.

```json
{
  "format": "basketballmanager-1",
  "teams": [
    { "slot": "BOS", "city": "Boston", "name": "Harbormen", "abbr": "BOS", "c1": "#1f6f43", "c2": "#e8e2d0" }
  ],
  "players": [
    { "name": "Örnek Oyuncu", "team": "BOS", "pos": "PG", "age": 25, "hgt": 188, "num": 9, "exp": 4,
      "ovr": 78, "pot": 84, "ratings": { "thr": 16, "pas": 17, "han": 16, "spd": 15 },
      "salary": [9500000, 10260000, 11020000] },
    { "name": "Serbest Uzun", "team": "FA", "pos": "C", "age": 31, "hgt": 213, "ovr": 66 }
  ],
  "replacePlayers": false
}
```

**Takımlar:**
- `slot` mevcut kısaltmayla (ya da `id` 0–29 ile, ya da dizideki sırayla) eşleşir.
- `city`, `name`, `abbr` ve renkleri değiştirir.

**Oyuncular:**
- `team`: takımın (yeni) kısaltması, serbest oyuncu için `"FA"`.
- `ovr`: özellik vermezsen oyuncu bu güce göre üretilir.
- `ratings`: 1–20 ölçeğinde (0–100 verirsen otomatik çevrilir). Anahtarlar:

  | Anahtar | Özellik | Anahtar | Özellik |
  |---|---|---|---|
  | `ins` | pota altı | `stl` | top çalma |
  | `mid` | orta mesafe | `blk` | blok |
  | `thr` | üçlük | `orb` | hücum ribaundu |
  | `ft` | serbest atış | `drb` | savunma ribaundu |
  | `pas` | pas | `spd` | hız |
  | `han` | top sürme | `str` | güç |
  | `iq` | oyun zekâsı | `jmp` | sıçrama |
  | `pdef` | çevre savunması | `sta` | dayanıklılık |
  | `idef` | iç savunma | `cons` | istikrar |
  |  |  | `work` | çalışkanlık |

- `salary`: bu sezondan başlayarak yıllık maaşlar (dolar). Vermezsen piyasa değerinden hesaplanır.

**`replacePlayers: true`:** kurgusal oyuncuların hepsi silinir, yalnızca senin listen kalır.

**Editör modu:** Veri ekranından açılır. Oyuncu profillerinde isim, yaş, pozisyon ve özellikleri düzenlemeni sağlar. Takım adları ve renkleri de aynı ekrandan değiştirilir.

## Dosyalar
| Dosya | İçerik |
|---|---|
| `js/data.js` | kurallar, 30 takım, özellikler, isim havuzları |
| `js/gen.js` | oyuncu, lig ve draft sınıfı üretimi, sözleşmeler, rotasyon |
| `js/cap.js` | maaş tavanı, istisnalar, Bird hakları, takas uygunluğu |
| `js/tactics.js` | setler, savunmalar, set analizi, set çizici |
| `js/engine.js` | top topa maç motoru |
| `js/league.js` | takvim, puan durumu, playoff, ödüller, piyango, draft, gelişim, sezon geçişi |
| `js/market.js` | pazarlık, serbest oyuncu piyasası, takas değerlemesi, yapay zekâ teklifleri, kısıtlı serbest oyuncu, moral |
| `js/matchview.js` | 2D canlı maç izleyici |
| `js/ui.js` | arayüz yardımcıları |
| `js/screens.js` | tüm ekranlar |
| `js/main.js` | uygulama kabuğu, kayıt ve veri aktarımı |
