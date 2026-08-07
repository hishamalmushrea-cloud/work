# 📱 دليل رائد الأعمال — مشروع Android Studio

هذا مشروع Android أصلي (Kotlin + WebView) يغلّف التطبيق بحيث يمكنك فتحه في **Android Studio** وبناء ملف **APK** بضغطة زر.

## 📋 المتطلبات
- **Android Studio** الإصدار الحديث (Hedgehog 2023.1.1 أو أحدث).
- يُفضّل **JDK 17** (يأتي مدمجًا مع Android Studio الحديث).
- اتصال بالإنترنت في أول فتح للمشروع (لينزّل Gradle واعتمادات AndroidX).

## 🚀 خطوات فتح المشروع وبناء الـAPK

1. شغّل **Android Studio**.
2. اختر **File → Open** (أو "Open" من شاشة الترحيب).
3. اختر مجلد `android` (المجلد الذي يحتوي على `settings.gradle.kts` و`gradlew`) واضغط **OK**.
4. انتظر حتى تنتهي عملية **Gradle Sync** (أول مرة قد تستغرق بضع دقائق لتنزيل Gradle 8.5 والمكتبات).
5. من القائمة العلوية اختر جهازًا:
   - إما **هاتف متصل** عبر USB (مع تفعيل خيارات المطوّر وتصحيح USB)،
   - أو **Emulator** (جهاز افتراضي) من خلال Device Manager.
6. اضغط زر التشغيل الأخضر ▶️ (**Run 'app'**) لتجربة التطبيق.

### لبناء ملف APK جاهز للتثبيت
- **APK تجريبي (debug):** القائمة **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
  - بعد الانتهاء ستجد إشعارًا برابط الملف، والمسار عادةً:
    `android/app/build/outputs/apk/debug/app-debug.apk`
- **APK إصدار نهائي (release موقّع):**
  **Build → Generate Signed Bundle / APK → APK**، ثم أنشئ ملف مفتاح (keystore) جديدًا أو اختر مفتاحًا موجودًا، وأكمل الخطوات.

> انقل ملف `app-debug.apk` إلى هاتفك وافتحه لتثبيت التطبيق (سمّح بالتثبيت من مصادر غير معروفة إذا طُلب).

## 🗂️ محتويات المشروع
```
android/
├── settings.gradle.kts          # إعدادات Gradle والمستودعات
├── build.gradle.kts             # إضافات البناء العلويّة
├── gradle.properties
├── gradlew / gradlew.bat        # غلاف Gradle (لا حاجة لتثبيت Gradle)
├── gradle/wrapper/
│   ├── gradle-wrapper.jar
│   └── gradle-wrapper.properties   # يحدد Gradle 8.5
└── app/
    ├── build.gradle.kts         # إعدادات الوحدة (SDK 24-34، Kotlin)
    ├── proguard-rules.pro
    └── src/main/
        ├── AndroidManifest.xml
        ├── assets/              # ← كل التطبيق (HTML/CSS/JS) هنا
        │   ├── index.html
        │   ├── manifest.json
        │   ├── sw.js
        │   ├── css/  js/  icons/
        ├── java/com/riyada/guide/MainActivity.kt
        └── res/                 # الأيقونة والثيم
```

## ✏️ تعديل المحتوى لاحقًا
- كل نصوص التطبيق في: `app/src/main/assets/js/data.js`
- الواجهة/التنسيق في: `app/src/main/assets/index.html` و`css/styles.css`
- بعد أي تعديل، أعد بناء الـAPK من Android Studio (Run ▶️ أو Build APK).

## 🔧 ملاحظات تقنية
- يستخدم التطبيق **WebViewAssetLoader** ليقدّم الملفات المحلية عبر `https://appassets.androidplatform.net/`، وهذا يمكّن **Service Worker** و**localStorage** فيعمل التطبيق **بدون إنترنت** تمامًا كنسخة الويب.
- `minSdk = 24` (يعمل على 99%+ من أجهزة Android الحالية).
- `targetSdk = 34` (Android 14).
- الأيقونة متجهة (Vector Adaptive) فتبدو واضحة على جميع الشاشات دون الحاجة لصور PNG متعددة.

## 🩺 إذا ظهر خطأ
- **فشل تنزيل Gradle:** تأكد من اتصال الإنترنت، ومن إعدادات الشبكة/الوكيل في Android Studio (Settings → Appearance → System Settings → HTTP Proxy).
- **خطأ في JDK:** في Android Studio: **File → Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK** واختر **JDK 17** (الإصدار المدمج).
- **مسح ذاكرة Gradle المؤقتة:** من تبويب Gradle في الجهة اليمنى اضغط زر المزامنة (Reload All Gradle Projects).

وفقك الله. 🌟
