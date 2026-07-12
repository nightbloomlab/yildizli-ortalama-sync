# Yıldızlı Ortalama v0.2.18 Sync

GitHub Pages yayın klasörü.

Bu sürümde Firebase ücretsiz Spark plan ile e-posta/şifre girişli bulut senkronizasyon paneli eklendi. v0.2.3 Firebase web app config birebir kopyalanan API key ile düzeltildi. v0.2.4 ile Bulut Senkronizasyon paneli katlanabilir ve durum hatırlayan hale getirildi. v0.2.5 ile giriş yapıldığında / uygulama açıldığında bulutta güncel veri varsa otomatik olarak cihaza getirme eklendi. v0.2.6 ile PC ve mobil açıkken diğer cihazdan gelen değişiklikleri yakalamak için canlı bulut izleme, pencere odaklanınca kontrol ve yedek periyodik kontrol eklendi.

Yayın için bu klasörün içindeki dosya ve klasörleri GitHub reposunun kök dizinine yükleyin:

- index.html
- ders-takip.html
- css/
- js/
- assets/
- manifest-yildizli.json
- service-worker.js
- .nojekyll

Not: Kullanıcının ders verileri GitHub'a yüklenmez. Veriler cihaz localStorage içinde ve giriş yapılırsa Firebase Firestore içinde kullanıcının kendi hesabında saklanır.

Ücretsiz kullanım kuralı: Spark plan, Email/Password Auth ve Firestore. Blaze, Billing, SMS/Phone, Hosting ve ücretli servisler kullanılmaz.


Ek düzeltme: PC görünümünde Bulut Senkronizasyon paneli kapalıyken/açıkken Tema-Doodle-O/F çubuğunun üst üste binmesi giderildi.


Ek düzeltme: Tema / Doodle / O-F kontrolleri tek bir "Ayarlar" açılır panelinin içine alındı. PC ve mobilde üst üste binme engellendi.


v0.2.18: index.html ve ders-takip.html birlikte düzeltildi; Ayarlar başlığı sadeleştirildi ve aktarma butonları tamamen Ayarlar panelinin içine alındı.


v0.2.18: Ayarlar panelinde başlık ve içerik tek karta birleştirildi; içerideki ikinci kutu/sekme görünümü kaldırıldı.


v0.2.18: Ayarlar paneli ve Tema/Doodle/O-F açılır menüleri tam opak tema kartı rengine sabitlendi; CSS/JS dosyalarına cache-bust eklendi.


## v0.2.18

- Mobil görünümde fazla büyüyen yazılar küçültüldü.
- Ayarlar panelindeki büyük işlem butonları mobilde daha dengeli hale getirildi.
- Bulut senkronizasyon ve YANO/GANO kart yazıları mobilde sıkıştırıldı.


## v0.2.18
- Mobil fontlar belirgin biçimde küçültüldü.
- Ayarlar, senkronizasyon ve YANO/GANO kartları daha kompakt hale getirildi.
- Mobil kart ve buton yükseklikleri azaltıldı.


## v0.2.18
- Mobil yazılar çok daha küçük hale getirildi.
- Ayarlar paneli, bulut senkronizasyon paneli, büyük işlem butonları ve YANO/GANO kartları mobilde ultra kompakt hale getirildi.
- CSS/JS cache kırma etiketi v0218 olarak güncellendi.
