# Yayın Hazırlığı — Tally (App Store)

Bu, Tally'yi App Store'a çıkarmak için **senin yürüteceğin** dış adımların
checklist'idir. Kod tarafındaki hazırlık (onboarding, Hakkında ekranı,
sorumluluk reddi, ikon/splash) tamamlandı.

Hedef: iOS, Türkiye App Store, Finans kategorisi.

---

## 0. Ön koşullar

- [x] **Apple Developer hesabı** (yıllık $99) — başvuruldu (29/05/2026), onay bekleniyor
- [ ] **EAS hesabı** (Expo) — `npx eas login` (ücretsiz plan yeterli başlangıçta)
- [ ] Mac'te Xcode kurulu (yerel build alacaksan)

---

## 1. EAS Build kurulumu

`eas.json` repo'da **hazır** (development / preview / production profilleri,
production'da `autoIncrement` ile otomatik build numarası). Bundle identifier
de ayarlı: `com.omertally.app` (app.json).

```bash
# eas-cli zaten kurulu (v20). Değilse: npm i -g eas-cli
eas login                    # Expo hesabınla giriş
eas init                     # projeyi EAS hesabına bağlar
                             #   (app.json'a extra.eas.projectId yazar)
```

İlk production build (App Store için, bulutta imzalı):

```bash
eas build --platform ios --profile production
```

İlk çalıştırmada EAS, **dağıtım sertifikası + provisioning profile'ı** senin
için üretmeyi teklif eder → "Yes" de, Apple hesabınla giriş yapar, otomatik
halleder. (En acı veren kısım buydu; EAS otomatik yönetiyor.)

> **Mac'e geçiş:** İstersen sonra yerel Xcode'a geçebilirsin — kilitlenme yok.
> `eas credentials` ile EAS'in ürettiği sertifikayı indirip Xcode'da
> kullanabilir, ya da Xcode'un otomatik imzalamasına bırakabilirsin. Tek
> dikkat: build numarası son yüklemeden büyük olmalı.

---

## 2. TestFlight (beta test)

```bash
eas submit --platform ios --latest
```

İlk submit'te Apple ID, App Store Connect app ID ve team ID sorar
(interaktif) — girersin, sonraki seferler hatırlar.

- [ ] Build, App Store Connect → TestFlight'a yüklenir
- [ ] Kendi cihazında TestFlight ile test et
- [ ] (Opsiyonel) birkaç kişiyi davet et

---

## 3. Gizlilik politikası barındırma

Apple, finans uygulamaları için **genel erişime açık bir gizlilik politikası
URL'si** ister. Politika `docs/privacy.md` olarak repo'da hazır ve GitHub
Pages ile yayınlanıyor:

- [x] **GitHub Pages:** `docs/privacy.md` repo'da, Pages ile yayınlanıyor.
      URL: `https://bykclk.github.io/tally/privacy`
- [x] GitHub → Settings → Pages → Source: **main** / **/docs** — yayında,
      sayfa erişilebilir
- [ ] Bu URL'i App Store Connect → App Privacy → "Privacy Policy URL"
      alanına gir

---

## 4. App Store Connect — uygulama kaydı

https://appstoreconnect.apple.com → My Apps → +

- [ ] **İsim:** "Tally" alınmış — benzersiz bir ad seç. İngilizce-birincil
      olduğumuz için: **Tally — Budget & Loans** veya **Tally Budget**
      (ana ekran adı "Tally" kalır; bu yalnızca mağaza listeleme adı)
- [ ] **Birincil dil (Primary Language):** İngilizce (English) —
      uluslararası erişim için. Türkçe'yi **ek bir lokalizasyon** olarak
      ekle (aşağıda her iki metin de var). Uygulama UI'si zaten cihaz
      diline göre TR/EN otomatik.
- [ ] **Bundle ID:** com.omertally.app
- [ ] **SKU:** tally-001 (serbest)
- [ ] **Kategori:** Finans (Finance)

---

## 5. Mağaza metni

### 5a. İngilizce (birincil dil — Primary)

**Subtitle (max 30 chars):**
> See what's left, plan ahead

**Keywords (max 100 chars, comma-separated):**
> budget,loan,bills,cash flow,expense,income,savings,finance,installment,money

**Description:**
> Tally shows you exactly what will be left in your pocket at the end of the
> month. It replaces the spreadsheet.
>
> • Enter your income and expenses; see your "confirmed remaining" and
>   "estimated remaining" update live.
> • Variable bills (electricity, water, gas) are estimated automatically
>   from the average of the last 3 months.
> • Track your loans and calculate how much interest and time an early
>   payoff would save you.
> • Payment reminders, multi-month trends, category breakdown.
>
> Privacy first: all your data stays only on your phone. No server, no
> tracking, no bank connection.
>
> Tally gives no financial advice; it only does math on the numbers you
> enter. Interest figures are estimates.

### 5b. Türkçe (ek lokalizasyon)

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

> Simülatörde `Cmd+S` ile ekran görüntüsü alabilirsin. Dolu görünmesi için
> önce **Ayarlar → Örnek veri yükle**'ye bas (bu seçenek yalnızca uygulama
> boşken görünür).

---

## 8. Derecelendirme & son adımlar

- [ ] **Yaş derecelendirmesi:** anketi doldur (finans = genelde 4+)
- [ ] **Telif/içerik hakları:** sana ait
- [ ] **App Review notları:** "Tamamen çevrimdışı, hesap/giriş gerektirmez,
      tüm veri cihazda kalır. Dolu bir görünüm için: onboarding'i geç →
      Ayarlar (Settings) sekmesi → 'Örnek veri yükle' (Load sample data).
      Bu, gerçekçi örnek gelir/gider/kredi ekler. (İngilizce için Ayarlar →
      Dil → İngilizce.)"
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
