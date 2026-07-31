# Google ile giriş (web, PWA ve Android)

Garsonun şifre hatırlamak zorunda kalmaması ve her kullanıcının verisinin
kendi hesabına bağlı kalması için giriş ekranında "Continue with Google"
seçeneği var. Akış PKCE'dir; kod uygulamada oturuma takas edilir.

Bu dosya kodun beklediği yapılandırmayı anlatır. Kod hazırdır, ancak Google
sağlayıcısı Supabase'de açılmadan buton hata verir.

## 1. Google Cloud tarafı

1. Google Cloud Console → **APIs & Services → Credentials → Create
   credentials → OAuth client ID → Web application**.
2. **Authorized redirect URIs** alanına Supabase'in geri çağırma adresini
   ekleyin:

   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```

3. Client ID ve Client Secret'ı kopyalayın.

Not: Android derlemesi de aynı **Web** istemcisini kullanır. Uygulama
tarayıcıyı açar, Google Supabase'e döner, Supabase de `orderia://`
şemasıyla uygulamaya döner. Bu yüzden ayrı bir Android OAuth istemcisi
gerekmez.

## 2. Supabase tarafı

1. **Authentication → Providers → Google** → etkinleştirin, Client ID ve
   Secret'ı yapıştırın.
2. **Authentication → URL Configuration → Redirect URLs** listesine
   uygulamanın ulaşılabildiği her adresi ekleyin:

   ```
   https://<pwa-alan-adiniz>/
   https://<pwa-alan-adiniz>/index.html
   http://localhost:8081/
   orderia://auth-callback
   ```

   Listede olmayan bir adres sessizce reddedilir; kullanıcı Google'dan
   döner ama oturum açılmaz.

## 3. Uygulamanın beklediği davranış

| Ortam         | Yönlendirme adresi                  | Kodu kim takas eder            |
| ------------- | ----------------------------------- | ------------------------------ |
| Web / PWA     | `location.origin + location.pathname` | Supabase istemcisi (`detectSessionInUrl`) |
| Android / iOS | `orderia://auth-callback`           | `AuthContext` derin bağlantı dinleyicisi |

Adres çubuğunda kalan `?code=…` girişten hemen sonra temizlenir; aksi halde
sayfa yenilendiğinde Google kodu ikinci kez kullanılmış sayılır ve hata
verir.

## 4. Yeni kullanıcı ne görür

Google ile giren kullanıcının Orderia üyeliği yoksa uygulama onu doğrudan
içeri almaz: mevcut onay akışına düşer (`PendingApprovalScreen`). Şubeye
erişimi yönetici onaylar. Yani Google girişi kimlik doğrular, yetkiyi
değil.

## 5. Sorun giderme

- **"Google sign-in could not be started"** — Supabase'de sağlayıcı kapalı
  ya da `EXPO_PUBLIC_SUPABASE_URL` yanlış.
- **Google'dan dönüyor ama giriş yapmıyor** — dönüş adresi Redirect URLs
  listesinde yok. Tarayıcı adres çubuğundaki adresi birebir ekleyin.
- **"oauth_redirect_has_no_code"** — Android derin bağlantısı `code`
  parametresi olmadan geldi; genelde Supabase'de `orderia://auth-callback`
  tanımlı değildir.
