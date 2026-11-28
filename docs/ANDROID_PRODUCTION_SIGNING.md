# FarmConnect — Android production signing and release

**Status:** the release build works and is installable, but it is **not**
Play Store ready, because it is signed with the Android **debug** certificate.
No upload keystore was generated, invented or guessed — that key belongs to
the owner and must be created by them.

---

## 1. What the current release build actually is

| Property | Value | Where it comes from |
|---|---|---|
| Application id | `in.farmconnect.farmconnect_mobile` | `mobile/android/app/build.gradle.kts` |
| `versionCode` | `1` | `version: 1.0.0+1` in `mobile/pubspec.yaml` → `flutter.versionCode` |
| `versionName` | `1.0.0` | `mobile/pubspec.yaml` → `flutter.versionName` |
| Namespace | `in.farmconnect.farmconnect_mobile` | `build.gradle.kts` |
| Min / target SDK | Flutter's defaults | `flutter.minSdkVersion` / `flutter.targetSdkVersion` |
| Java / Kotlin target | 17 | `compileOptions` and `kotlin { jvmTarget }` |
| API base URL (release) | `https://farmconnect-api-sn98.onrender.com/api` | `mobile/tool/build_production.ps1` |
| Socket URL (release) | `https://farmconnect-api-sn98.onrender.com` | `mobile/tool/build_production.ps1` |
| Signing (release) | **debug certificate** | `build.gradle.kts` falls back to `signingConfigs.getByName("debug")` |

The release build is produced **against the live backend** — the production
script pins the host so a release can never accidentally ship the emulator
URL `http://10.0.2.2:5000`.

### The fallback is deliberate and loud

`mobile/android/app/build.gradle.kts` checks whether
`mobile/android/key.properties` exists:

```kotlin
val hasReleaseKeystore = keystorePropertiesFile.exists()
```

* **present** → the `release` signing config is used.
* **absent** → the `debug` signing config is used **and a warning is
  printed during the build**:

  > FarmConnect: android/key.properties was not found. The release artefact
  > is signed with the DEBUG key. It is installable and testable, but it is
  > NOT a Play Store ready release.

This is the right behaviour: the build never fails because of a missing
secret, and it never claims to be a store release when it is not.

---

## 2. How the owner should create the upload keystore

The upload key is a **secret**. It should be created once, kept offline, and
never committed.

### Step 1 — create the key

```powershell
cd C:\Users\user\OneDrive\Desktop\FarmConnect-Fixed-User\mobile\android

keytool -genkeypair -v `
  -keystore upload-keystore.jks `
  -storetype JKS `
  -keyalg RSA -keysize 2048 -validity 10000 `
  -alias upload
```

`keytool` comes with the JDK that Android Studio / Flutter uses. It asks for:

* a **store password** — use a password manager,
* a **key password**,
* the **common name** — the organisation's name, e.g. `FarmConnect`,
* the **organisation unit / city / state / country code**.

### Step 2 — store the key outside the repository

Keep the `.jks` file somewhere that is **not** the git working tree, for
example:

```
C:\Users\user\OneDrive\Desktop\FarmConnect-Fixed-User\.secrets\upload-keystore.jks
```

`.secrets/` is not in the repository and is not tracked. (If a folder with
secrets is ever added to the repository, it must be listed in `.gitignore`.)

**Back the file up** — a separate encrypted copy on another medium. If the
upload key is lost, Google Play will ask for a **key reset request**, which
is a slow, manual process.

### Step 3 — create `key.properties`

Create `mobile/android/key.properties` (this file **is** gitignored):

```properties
storePassword=<the store password>
keyPassword=<the key password>
keyAlias=upload
storeFile=C:\\Users\\user\\OneDrive\\Desktop\\FarmConnect-Fixed-User\\.secrets\\upload-keystore.jks
```

Note the **double backslashes** — `key.properties` is a Java properties file
in which `\` is an escape character.

`storeFile` may also be a path relative to `mobile/android/`.

### Step 4 — verify that the key is ignored

```powershell
cd C:\Users\user\OneDrive\Desktop\FarmConnect-Fixed-User
git check-ignore -v mobile/android/key.properties .secrets/upload-keystore.jks
git status --short
```

Both paths must be reported as ignored, and `git status` must not list them.

### Step 5 — check the aliases of the keystore

```powershell
keytool -list -v -keystore .secrets\upload-keystore.jks -alias upload
```

### Step 6 — build and check the signature

```powershell
cd mobile
.\tool\build_production.ps1

# the certificate of the produced APK
$ANDROID_HOME\build-tools\<version>\apksigner.bat verify --print-certs `
  build\app\outputs\flutter-apk\app-release.apk
```

The output must show the **upload** alias and **not** `CN=Android Debug`.

Quick check:

```powershell
$ANDROID_HOME\build-tools\<version>\apksigner.bat verify --print-certs `
  build\app\outputs\flutter-apk\app-release.apk | Select-String 'CN='
```

---

## 3. Building the artefacts

```powershell
cd C:\Users\user\OneDrive\Desktop\FarmConnect-Fixed-User\mobile

# APK (for manual distribution / testing)
.\tool\build_production.ps1 -Target apk

# App Bundle (this is what the Play Store wants)
.\tool\build_production.ps1 -Target bundle
```

The script runs `flutter pub get`, `flutter analyze` and `flutter test`
first, and it refuses to continue if any of them fails.

Artefacts:

```
mobile\build\app\outputs\flutter-apk\app-release.apk
mobile\build\app\outputs\bundle\release\app-release.aab
```

---

## 4. The Play Console checklist

1. **Create the app** in the Google Play Console with the application id
   `in.farmconnect.farmconnect_mobile`.
2. Choose **Internal testing** first. The first upload always has to be a
   closed test track.
3. Upload the `.aab` (not the APK).
4. Fill in the store listing, the privacy policy and the data-safety form.
   The app talks to a backend that stores account data, phone numbers, farm
   coordinates, orders and chat messages — the data-safety form has to
   declare that.
5. Google requires a **Play App Signing** key. The key created in step 1 of
   section 2 is the **upload** key; Google then holds the **app signing**
   key. That is the normal arrangement.
6. Target API level: the Play Store requires the target SDK to be within one
   year of the latest release. `flutter.targetSdkVersion` follows the
   installed Flutter version — check it before the upload.

---

## 5. What is **not** done here

- **No upload keystore was generated.** The key has to be created by the
  owner; an agent must not invent it, because a key that an agent knows is a
  key that is not a secret.
- **The existing debug-signed artefacts were not deleted.** They stay
  installable and testable.
- **No version bump.** `1.0.0+1` is still the version in `pubspec.yaml`.
  Bump it before the first Play upload:

  ```yaml
  version: 1.0.0+2
  ```

  The `versionCode` must be **higher** than every version that was ever
  uploaded; the Play Console rejects a duplicate.
- **No release was published.** Publishing needs the owner's Play Console
  account.
