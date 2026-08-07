# Project Synchronization Plan

The goal is to synchronize the web-based PWA source with the Android wrapper project and ensure the Android environment is correctly configured for local development and building.

## User Review Required

> [!IMPORTANT]
> The current environment has network restrictions that prevent downloading Gradle distributions. I will attempt to optimize the project for the available local resources, but a full Gradle sync may require a pre-downloaded Gradle distribution or a working internet connection if you are running this locally.

## Proposed Changes

### [PWA to Android Asset Sync]

I will ensure all web assets in the root `app/` directory are perfectly mirrored in the Android `assets` directory.

#### [MODIFY] [android/app/src/main/assets/](file:///C:/Users/Hisham/Desktop/work/android/app/src/main/assets/)
- Refresh all files (HTML, CSS, JS, Icons) from the source `app/` directory.

### [Android Project Configuration]

I will verify and optimize the Android project settings to ensure smooth loading of local assets via `WebViewAssetLoader`.

#### [MODIFY] [MainActivity.kt](file:///C:/Users/Hisham/Desktop/work/android/app/src/main/java/com/riyada/guide/MainActivity.kt)
- Confirm the `APP_URL` and `assetLoader` configuration correctly points to the synchronized assets.

#### [MODIFY] [build.gradle.kts](file:///C:/Users/Hisham/Desktop/work/android/app/build.gradle.kts)
- Ensure all necessary dependencies (like `androidx.webkit`) are correctly declared for PWA support.

## Verification Plan

### Manual Verification
- Verify file parity between `app/` and `android/app/src/main/assets/` using hash comparisons.
- Inspect `MainActivity.kt` to ensure the logic for loading `https://appassets.androidplatform.net/assets/index.html` is intact.
- Check the `AndroidManifest.xml` for necessary permissions (Internet, though only for local asset loading in this context).
