# Tally — Fikirler & Yol Haritası

Sürümler arası "sırada ne var" listesi + neyin ne zaman çıktığının kaydı.
Bir özellik bitince **Çıkanlar**'a taşı, git tag'iyle eşleştir.

---

## Çıkanlar (sürüm geçmişi)

### v1.0.0 — ilk App Store sürümü (tag: `v1.0.0`)
- Aylık görünüm: kesin/tahmini kalan, kesinleşti/bekleniyor bölümleri, ay switcher
- Sabit/değişken gelir-gider; değişken faturalarda son-3-ay tahmini
- Fatura giriş akışı (pending → confirmed), geri alma
- Krediler: açık kredi + erken kapama simülatörü; taksitli kredi + ödeme takibi
- Aylık başlangıç bakiyesi (otomatik rollover) → kalan rakamlar mutlak
- Ödeme hatırlatma bildirimleri (lokal)
- Çoklu ay trendi, kategori dağılımı
- Onboarding, Hakkında, hata yakalama (error boundary)
- Dil (TR/EN), tema (açık/koyu/sistem), para birimi (₺/$/€/£), locale-duyarlı para gösterimi
- Marka: ikon + splash (açık/koyu), iPhone-only, EAS build yapılandırması

### v1.1.0 — sıradaki build (henüz yayınlanmadı)
- Tek seferlik gider/gelir (doktor, hediye, beklenmedik alışveriş) → "ay sonu kalan" doğru
- Ayarlar → "Tüm verileri sıfırla"
- (altyapı) Info.plist encryption muafiyeti, App Store destek sayfası

> Yayınlamadan önce: `app.json` → `version: 1.1.0`, `eas build`, `eas submit`,
> sonra commit'i `git tag v1.1.0`.

---

## Sırada (öncelikli adaylar)

1. **Yedek / geri yükleme** 🔴 *en öncelikli — veri güvenliği*
   - SQLite dosyasını iCloud/Dosyalar'a yedekle + geri yükle
   - `expo-file-system` + `expo-sharing` + `expo-document-picker` (native dep → rebuild)
   - WAL checkpoint sonrası kopyala; geri yüklemede DB kapat→değiştir→aç→migration
   - Reset artık var ve yedeksiz; bu özellik onun güvenlik ağı

2. **"Sıfırlamadan önce yedek al" uyarısı**
   - Reset onayına "önce yedekle" seçeneği — yedek özelliği gelince

3. **Locale-duyarlı para *girişi***
   - Gösterim locale-duyarlı oldu; giriş hâlâ Türkçe-stil (`1.250,50`)
   - İngilizce kullanıcı `1,250.50` yazabilsin — küçük ama uluslararası için doğru

---

## Daha büyük / sonra

- **iCloud sync** — çok cihaz (iPhone + iPad). Mimari iş; "kendi sunucun yok" ilkesini bozmaz (Apple iCloud)
- **Ana ekran widget'ı** — "bu ay kalan" göz ucuyla (WidgetKit)
- **Siri / Kısayollar** — "bu ay ne kaldı?"
- **Birikim hedefleri** — "şu tarihe kadar X biriktir" + simülasyon (planlama kimliğini genişletir)
- **Çoklu ay kategori trendi** — dağılımın aylar boyu seyri

---

## Kapsam dışı

- **Banka entegrasyonu** — ❌ ASLA (CLAUDE.md). Güvenlik/gizlilik gereği masada değil.
- **Bütçe hedefleri / harcama limitleri** — app'i "budgeting"e çevirir; dikkatli düşünülmeli
- **Çoklu para birimi *matematiği*** (kur dönüşümü) — online kur kaynağı ister, offline'ı zorlar. (Şu an: sadece gösterim sembolü değişir, dönüşüm yok.)
- **Veri export (CSV/analiz)** — yedek ile karıştırma; bu "raporlama" ayrı bir karar
