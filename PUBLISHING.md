# Tally — Yayın Runbook'u (App Store)

Yaşayan runbook: her yeni sürümde izlenen adımlar + bir kez yapılıp biten
kurulumun kaydı. (Son yayınlanan sürüm: **1.2.0**)

- **App Store Connect:** https://appstoreconnect.apple.com/apps/6774515046
- **Mağaza adı:** Cash Flow Tally · **Bundle ID:** com.omertally.app
- **Build:** EAS (bulutta imzalı) · **Kategori:** Finance · **Fiyat:** Free

---

## Yeni sürüm yayınlama (her güncellemede)

Sürüm `X.Y.Z` (patch düzeltme: 1.2.0 → 1.2.1; yeni özellik: 1.2.0 → 1.3.0).

**0. Ön kontrol** — ikisi de temiz olmalı (CI de bunları koşar):
```bash
npm run typecheck
npm run lint
```

**1. CHANGELOG.md** — `[Unreleased]` altındakileri `## [X.Y.Z] — YYYY-MM-DD`
başlığına taşı; `[Unreleased]`'i boşalt.

**2. `app.json` → `version`** = `X.Y.Z` (build numarası EAS'te autoIncrement,
elle dokunma).

**3. Commit + tag + push:**
```bash
git commit -am "Cut vX.Y.Z: ..."
git push
git tag vX.Y.Z && git push origin vX.Y.Z
```

**4. Build + gönder:**
```bash
eas build --platform ios --profile production
eas submit --platform ios --latest
```

**5. App Store Connect:**
- [ ] TestFlight'ta işlenince **cihazda test et** (en kritik adım)
- [ ] Yeni sürüm oluştur (`X.Y.Z`) → **"What's New"** notu gir
- [ ] İşlenen build'i seç → **Submit for Review**
- [ ] Onay sonrası: otomatik/manuel yayınla

> **Encryption / export compliance:** `app.json`'da
> `ITSAppUsesNonExemptEncryption: false` gömülü → her build'de otomatik
> muaf, soru çıkmaz.

---

## Bir kez yapıldı (kurulum kaydı)

- [x] Apple Developer hesabı (bireysel)
- [x] EAS hesabı + `eas init` (projectId app.json'da) + dağıtım sertifikası /
      provisioning profile EAS tarafından üretildi
- [x] App Store Connect'te uygulama oluşturuldu (id 6774515046)
- [x] **Gizlilik politikası** yayında: `https://bykclk.github.io/tally/privacy`
      (kaynak: `docs/privacy.md`, GitHub Pages: main /docs)
- [x] **Destek URL'i:** `https://bykclk.github.io/tally/support`
- [x] **App Privacy:** "Data Not Collected"
- [x] **Yaş derecelendirmesi:** 4+ · **İçerik hakları:** sana ait
- [x] **App Review notu:** çevrimdışı, hesap yok; dolu görünüm için
      Settings → Load sample data
- [x] iPhone-only (`supportsTablet: false`)

> **Mac'e geçiş (opsiyonel):** EAS yerine yerel Xcode build'e geçebilirsin —
> kilitlenme yok. `eas credentials` ile sertifikayı indir ya da Xcode otomatik
> imzalamaya bırak; tek kural: build numarası son yüklemeden büyük olmalı.

---

## Mağaza metni (referans)

### İngilizce (birincil dil)

**Subtitle (≤30):** `See what's left, plan ahead`

**Keywords (≤100):**
`budget,loan,bills,cash flow,expense,income,savings,finance,installment,money`

**Description:**
> Tally shows you exactly what will be left in your pocket at the end of the
> month. It replaces the spreadsheet.
>
> • Enter your income and expenses; see your "confirmed remaining" and
>   "estimated remaining" update live.
> • Variable bills (electricity, water, gas) are estimated automatically
>   from the average of the last 3 months.
> • Record one-time costs (a doctor visit, a gift) that hit only that month.
> • Track your loans and calculate how much interest and time an early
>   payoff would save you.
> • Payment reminders, multi-month trends, category breakdown.
>
> Privacy first: all your data stays only on your phone. No server, no
> tracking, no bank connection.
>
> Tally gives no financial advice; it only does math on the numbers you
> enter. Interest figures are estimates.

### Türkçe (ek lokalizasyon)

**Altyazı (≤30):** `Ay sonu kalanını gör, planla`

**Anahtar kelimeler (≤100):**
`bütçe,kredi,fatura,nakit,gider,gelir,birikim,finans,taksit,hesap`

**Açıklama:**
> Tally, ay sonunda cebinde ne kalacağını net olarak görmen için tasarlandı.
> Excel tablosunun yerini alır.
>
> • Gelir ve giderlerini gir; "kesin kalan" ve "tahmini kalan" rakamlarını
>   anlık gör.
> • Değişken faturalar (elektrik, su, doğalgaz) son 3 ayın ortalamasından
>   otomatik tahmin edilir.
> • Tek seferlik harcamaları (doktor, hediye) sadece o aya işle.
> • Kredilerini takip et; erken kapamada ne kadar faiz ve süre kazanacağını
>   hesapla.
> • Ödeme hatırlatmaları, çoklu ay trendi, kategori dağılımı.
>
> Gizlilik önceliklidir: tüm verin yalnızca telefonunda kalır. Sunucu yok,
> takip yok, banka bağlantısı yok.
>
> Tally finansal tavsiye vermez; yalnızca senin girdiğin sayılarla hesap
> yapar. Faiz hesapları tahminidir.

### Ekran görüntüleri (6.9"/6.7" iPhone)
Simülatörde örnek veriyi yükle (Settings → Load sample data) → `Cmd+S`:
ana ekran · kredi simülatörü · kategori dağılımı · çoklu ay trendi
