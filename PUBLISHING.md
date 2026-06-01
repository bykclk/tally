# Tally — Yayın Runbook'u (App Store)

İlk gönderim tamamlandı. Bu doküman artık **yeni sürüm yayınlama** döngüsü +
bir kez yapılıp biten kurulumun kaydı.

- **App Store Connect:** https://appstoreconnect.apple.com/apps/6774515046
- **Mağaza adı:** Cash Flow Tally · **Bundle ID:** com.omertally.app
- **Build:** EAS (bulutta imzalı) · **Kategori:** Finance · **Fiyat:** Free

---

## Yeni sürüm yayınlama (her güncellemede tekrar)

```bash
# 1. app.json → "version" artır (örn. 1.0.0 → 1.1.0)
#    (build numarası EAS'te autoIncrement, elle dokunma)

# 2. Build + gönder
eas build --platform ios --profile production
eas submit --platform ios --latest
```

Sonra:
- [ ] TestFlight'ta işleme bitince **cihazda test et** (en kritik adım)
- [ ] App Store Connect → yeni sürüm oluştur → **"What's New"** notu gir
- [ ] Yeni build'i seç → **Submit for Review**
- [ ] Onay sonrası: otomatik/manuel yayınla
- [ ] Yayınlanınca commit'i tag'le: `git tag v1.1.0 && git push --tags`
      ve `CHANGELOG.md`'de **Unreleased**'i sürüm başlığına taşı

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
