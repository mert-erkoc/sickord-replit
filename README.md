# 🟣 Sickord (Replit Edition)

Sickord WebRTC tabanlı bir sesli sohbet uygulamasıdır. Lokal bir Discord havasında eğlencelik fakat işlevli bir projedir.

## 🚀 Canlı Demo

Uygulamayı hemen deneyimlemek için aşağıdaki bağlantıya tıklayın:

👉 [Sickord Canlı Demo](https://replit.com/@merterkoc/sikcord-replit)

> Not: Uygulama Replit üzerinde barındırıldığından, ilk yükleme süresi biraz uzun olabilir.

## 🧩 Özellikler

- **Gerçek Zamanlı Sohbet:** Kullanıcılar, oluşturdukları odalarda anlık sesli görüşebilir ve mesajlaşabilir.
- **Oda Oluşturma:** Yeni sohbet odaları oluşturabilir ve diğer kullanıcıları davet edebilirsiniz.
- **Kullanıcı Girişi:** Basit bir kullanıcı adıyla giriş yaparak sohbete katılabilirsiniz.
- **Responsive Tasarım:** Uygulama, masaüstü ve mobil cihazlarda uyumlu bir şekilde çalışır.

## 🛠️ Kurulum ve Çalıştırma

### 1. Replit Üzerinde Çalıştırma

1. [Replit Projesi](https://replit.com/@merterkoc/sikcord-replit) sayfasına gidin.
2. Sağ üst köşedeki **"Fork"** butonuna tıklayarak projeyi kendi hesabınıza kopyalayın.
3. **"Run"** butonuna tıklayarak uygulamayı başlatın.
4. Açılan pencerede kullanıcı adınızı girerek sohbete katılabilirsiniz.

### 2. Yerel Ortamda Çalıştırma

```bash
git clone https://github.com/mert-erkoc/sickord-replit.git
cd sickord-replit
npm install
node server.js
```

Tarayıcınızda `http://localhost:3000` adresine giderek uygulamayı kullanmaya başlayabilirsiniz.

## 📁 Proje Yapısı

```
sickord-replit/
├── client/             # Ön yüz dosyaları (HTML, CSS, JS)
├── server.js           # Sunucu tarafı kodu (Node.js)
├── package.json        # Proje bağımlılıkları ve betikleri
├── .replit             # Replit yapılandırma dosyası
├── generated-icon.png  # Uygulama simgesi
└── README.md           # Proje açıklamaları
```

## 📦 Kullanılan Teknolojiler

- **Node.js:** Sunucu tarafı işlemler için.
- **Express.js:** HTTP sunucusu oluşturmak için.
- **Socket.io:** Gerçek zamanlı iletişim için.
- **HTML/CSS/JavaScript:** Ön yüz tasarımı ve etkileşimler için.


## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) ile lisanslanmıştır.

---
Herhangi bir sorunuz veya öneriniz olursa, lütfen [GitHub Issues](https://github.com/mert-erkoc/sickord-replit/issues) üzerinden bizimle iletişime geçin.

