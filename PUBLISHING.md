# Yayın Hazırlığı — Tally (App Store)

Bu, Tally'yi App Store'a çıkarmak için **senin yürüteceğin** dış adımların
checklist'idir. Kod tarafındaki hazırlık (onboarding, Hakkında ekranı,
sorumluluk reddi, ikon/splash) tamamlandı.

Hedef: iOS, Türkiye App Store, Finans kategorisi.

---

## 0. Ön koşullar

- [ ] **Apple Developer hesabı** (yıllık $99) — https://developer.apple.com
- [ ] **EAS hesabı** (Expo) — `npx eas login` (ücretsiz plan yeterli başlangıçta)
- [ ] Mac'te Xcode kurulu (yerel build alacaksan)

---

## 1. EAS Build kurulumu

```bash
npm install -g eas-cli      # veya: npx eas-cli@latest
npx eas login
npx eas build:configure     # eas.json oluşturur
```

`eas.json` içinde production profili olduğundan emin ol. Bundle identifier
zaten ayarlı: `com.omertally.app` (app.json).

İlk production build (App Store için, bulutta imzalı):

```bash
npx eas build --platform ios --profile production
```

EAS, dağıtım sertifikası ve provisioning profile'ı senin için yönetir
(Apple hesabınla giriş ister).

> Not: Yerel `expo run:ios` geliştirme içindir. Mağaza için EAS Build kullan.

---

## 2. TestFlight (beta test)

```bash
npx eas submit --platform ios --latest
```

- [ ] Build, App Store Connect → TestFlight'a yüklenir
- [ ] Kendi cihazında TestFlight ile test et
- [ ] (Opsiyonel) birkaç kişiyi davet et

---

## 3. Gizlilik politikası barındırma

Apple, finans uygulamaları için **genel erişime açık bir gizlilik politikası
URL'si** ister. `PRIVACY.md` hazır — onu bir yere yayınla:

- [ ] **GitHub Pages** (ücretsiz, en kolay): repo'da `docs/` klasörüne koy,
      Settings → Pages'ten yayınla. Örn:
      `https://omertally.github.io/tally/privacy`
- [ ] veya basit bir Notion/kişisel site sayfası
- [ ] `PRIVACY.md` içindeki `[GG/AA/YYYY]` ve `[E-POSTA ADRESİ]`
      yer tutucularını doldur

---

## 4. App Store Connect — uygulama kaydı

https://appstoreconnect.apple.com → My Apps → +

- [ ] **İsim:** Tally — Bütçe & Kredi (veya kısaca Tally; isim benzersiz olmalı,
      "Tally" alınmış olabilir — alternatif: "Tally Bütçe")
- [ ] **Birincil dil:** Türkçe
- [ ] **Bundle ID:** com.omertally.app
- [ ] **SKU:** tally-001 (serbest)
- [ ] **Kategori:** Finans (Finance)

---

## 5. Mağaza metni (Türkçe taslak)

**Altyazı (subtitle, max 30 karakter):**
> Ay sonu kalanını gör, planla

**Anahtar kelimeler (max 100 karakter, virgülle):**
> bütçe,kredi,fatura,nakit,gider,gelir,birikim,finans,taksit,hesap

**Açıklama:**
> Tally, ay sonunda cebinde ne kalacağını net olarak görmen için tasarlandı.
> Excel tablosunun yerini alır.
>
> • Gelir ve giderlerini gir; "kesin kalan" ve "tahmini kalan" rakamlarını
>   anlık gör.
> • Değişken faturalar (elektrik, su, doğalgaz) için tutar son 3 ayın
>   ortalamasından otomatik tahmin edilir.
> • Kredilerini takip et; erken kapamada ne kadar faiz ve süre
>   kazanacağını hesapla.
> • Ödeme hatırlatmaları, çoklu ay trendi, kategori dağılımı.
>
> Gizlilik önceliklidir: tüm verin yalnızca telefonunda kalır. Sunucu yok,
> takip yok, banka bağlantısı yok.
>
> Tally finansal tavsiye vermez; yalnızca senin girdiğin sayılarla hesap
> yapar. Faiz hesapları tahminidir.

---

## 6. App Privacy (veri toplama beyanı)

App Store Connect → App Privacy:

- [ ] **"Data Not Collected"** seç — Tally hiçbir veri toplamıyor. Bu güçlü
      bir artı; dürüstçe işaretle.

---

## 7. Ekran görüntüleri

Apple, belirli cihaz boyutlarında ekran görüntüsü ister (6.7" zorunlu):

- [ ] 6.7" iPhone (örn. 15/16 Pro Max) — **zorunlu**, en az 1, en fazla 10
- [ ] (Opsiyonel) 6.5" ve diğer boyutlar
- [ ] Önerilen kareler:
  - Ana ekran (kesin/tahmini kalan + liste)
  - Kredi simülatörü (slider + grafik)
  - Kategori dağılımı
  - Çoklu ay trendi

> Simülatörde `Cmd+S` ile ekran görüntüsü alabilirsin. İçeride birkaç
> örnek kayıt + kredi olsun ki dolu görünsün.

---

## 8. Derecelendirme & son adımlar

- [ ] **Yaş derecelendirmesi:** anketi doldur (finans = genelde 4+)
- [ ] **Telif/içerik hakları:** sana ait
- [ ] **App Review notları:** "Tamamen çevrimdışı, hesap gerektirmez, tüm
      veri cihazda. Test için örnek veri uygulamada elle eklenebilir."
- [ ] Build seç → **Submit for Review**

---

## 9. İnceleme sonrası

- [ ] Red gelirse gerekçeyi oku, düzelt, tekrar gönder (finans uygulamaları
      bazen "tavsiye vermediğini" netleştirmeni ister — sorumluluk reddi
      metinleri tam bunun için var)
- [ ] Onaylanınca: yayın tarihini ayarla veya hemen yayınla

---

## Sürüm yükseltme (sonraki güncellemeler)

```bash
# app.json içinde "version" değerini artır (örn. 1.0.0 → 1.1.0)
npx eas build --platform ios --profile production
npx eas submit --platform ios --latest
```

App Store Connect'te yeni sürüm için "What's New" notu gir, yeni build'i
seç, Submit.
