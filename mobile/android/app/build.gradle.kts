import java.util.Properties

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// ---------------------------------------------------------------------------
// Release signing
//
// The repository deliberately contains NO signing key. A Play Store upload key
// is a secret: it must be generated once by the project owner, stored outside
// version control and never committed.
//
// To produce a Play Store ready build, create `android/key.properties`:
//
//     storePassword=<store password>
//     keyPassword=<key password>
//     keyAlias=upload
//     storeFile=<absolute path to the .jks file>
//
// `android/key.properties` and `*.jks` are ignored by `android/.gitignore`.
//
// When the file is absent the release build is still produced, but it is signed
// with the Flutter debug keystore. Such an artefact is perfectly installable
// and testable on a device, but it is NOT a Play Store ready release.
// ---------------------------------------------------------------------------
val keystorePropertiesFile = rootProject.file("key.properties")
val keystoreProperties = Properties()
val hasReleaseKeystore = keystorePropertiesFile.exists()
if (hasReleaseKeystore) {
    keystorePropertiesFile.inputStream().use { keystoreProperties.load(it) }
}

android {
    namespace = "in.farmconnect.farmconnect_mobile"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "in.farmconnect.farmconnect_mobile"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        // Uses the version code from pubspec.yaml. When using split APKs, 1000 * ABI_VERSION
        // is added automatically by Flutter. (https://developer.android.com/studio/build/configure-apk-splits#configure-APK-versions)
        // You can force using the value of versionCode by specifying the `-P force-version-code-ignoring-abi=true`
        // flag during build.
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (hasReleaseKeystore) {
            create("release") {
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
                storeFile = file(keystoreProperties.getProperty("storeFile"))
                storePassword = keystoreProperties.getProperty("storePassword")
            }
        }
    }

    buildTypes {
        release {
            if (hasReleaseKeystore) {
                signingConfig = signingConfigs.getByName("release")
            } else {
                // No upload keystore is present. The build is signed with the
                // debug key so it can be installed and tested, but it must not
                // be uploaded to the Play Store.
                signingConfig = signingConfigs.getByName("debug")
                logger.warn(
                    "FarmConnect: android/key.properties was not found. The release " +
                        "artefact is signed with the DEBUG key. It is installable and " +
                        "testable, but it is NOT a Play Store ready release. Create " +
                        "android/key.properties with the owner's upload keystore to " +
                        "produce a store ready build."
                )
            }
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
