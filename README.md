# Yıldızlı Ortalama v0.2.10 Sync

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
