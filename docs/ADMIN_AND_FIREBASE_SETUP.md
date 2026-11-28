# FarmConnect — administrator provisioning and Firebase phone authentication

**Status:** both paths are inspected and documented. **No administrator
account was created and no OTP result was invented** — neither is possible
without the owner's action.

---

# Part 1 — Administrator accounts

## 1.1 How the authorisation actually works

There is **no backdoor** in the authentication or the authorisation.

`backend/src/middleware/auth.middleware.ts`:

* `authenticate` resolves the JWT, but **a valid signature alone opens
  nothing**. The token only proves that the key belongs to this service. The
  middleware then loads the account from the shared database and rejects it
  when it does not exist or when `isActive` is false.
* `requireRole(...)` reads the role from **that live database row**, not from
  a claim inside the token. A token that says `CONSUMER` cannot pretend to be
  an `ADMIN`, and a suspended administrator loses the role immediately.

`backend/src/modules/admin/admin.controller.ts` uses `requireRole('ADMIN')` on
every admin route. There is **no HTTP route that can create, promote or
delete an administrator** — and there must not be one.

The consequence is simple and important: **an administrator is an ordinary
`User` row whose `role` is `ADMIN`.** Provisioning it is a database operation,
and it is done with a manual CLI.

## 1.2 The provisioning CLI

`backend/provision-admin.ts` — registered as `npm run db:provision-admin`.

```
cd backend
npm run db:provision-admin -- --email admin@farmconnect.com \
     --name "Platform Administrator" --phone 9876543210 --confirm
```

### What it enforces

| Rule | Why |
|---|---|
| `DATABASE_URL` must be present | the script must talk to the **real** database |
| the connection string is never printed | it is a secret |
| the password is **never** accepted on the command line | command lines end up in the shell history and in the process listing |
| the password is asked for with the input **hidden** | it must not be visible on the screen |
| the password is never echoed, logged or printed | — |
| at least 12 characters, at least one letter and one digit | a real password policy |
| `--confirm` is mandatory | without it, the script only reports what it *would* do and writes nothing |
| an existing account is **never promoted silently** | promoting a customer to administrator is an explicit, authorised act — `--promote` is needed on top of `--confirm` |
| the old role is printed when a promotion happens | the change stays visible |
| it is **not** part of the Render build command | a deploy can never create or promote an account by itself |
| it never deletes or deactivates an account | — |

### The three ways to give the password

1. **Interactive (default)** — the prompt is hidden:

   ```
      Administrator password (hidden):
   ```

2. **From a file** (useful for a scripted run):

   ```powershell
   npm run db:provision-admin -- --email admin@farmconnect.com `
       --name "Platform Administrator" --phone 9876543210 `
       --password-file "$env:LOCALAPPDATA\Temp\opencode\admin-pw.txt" --confirm
   ```

   The file's **first line** is the password. Keep it outside the repository.

3. **From an environment variable**:

   ```powershell
   $env:FARMCONNECT_ADMIN_PASSWORD = '...'
   npm run db:provision-admin -- --email admin@farmconnect.com `
       --name "Platform Administrator" --phone 9876543210 `
       --password-env FARMCONNECT_ADMIN_PASSWORD --confirm
   ```

**Never** put the password in the command line, in a commit, or in a chat
message.

### What it prints

```
✅ The administrator admin@farmconnect.com was created.
   Account id: 3f2a…
   Sign in on the website with this address and the password you chose.
```

The password itself is never printed. Running it a second time for the same
address reports *"is already an administrator — nothing was changed"*.

### Promoting an existing account

```powershell
npm run db:provision-admin -- --email customer@example.com `
    --name "Customer" --phone 9876543210 --promote --confirm
```

Without `--promote` the script refuses and says so:

```
❌ customer@example.com already exists with the role CONSUMER.
   An existing account is never promoted silently.
   If this really has to become an administrator, re-run with
   `--promote --confirm`.
```

**This is a decision for the owner.** Changing a customer into an
administrator without authorisation is not allowed, so the script makes the
intention explicit.

## 1.3 Where the database connection comes from

The CLI reads `DATABASE_URL` from the environment or from `backend/.env`
(via `dotenv`). To provision against the **production** database, the
connection string has to be placed in `backend/.env` — or given as an
environment variable for that one command:

```powershell
$env:DATABASE_URL = "<the Render connection string>"
npm run db:provision-admin -- --email admin@farmconnect.com `
    --name "Platform Administrator" --phone 9876543210 --confirm
```

`backend/.env` is gitignored. Never commit the connection string, and never
paste it into a chat.

## 1.4 The complete administrator journey (once an account exists)

| Step | URL / action | What it proves |
|---|---|---|
| 1 | `https://farmconnect-web.onrender.com/login` → sign in with the administrator address | the account really exists and the password really matches |
| 2 | `https://farmconnect-web.onrender.com/admin` | the admin dashboard opens |
| 3 | the platform metrics | the counts come from the **live** database |
| 4 | `GET /api/admin/metrics` with the session token | the API enforces the role on the server, not only in the UI |
| 5 | `GET /api/admin/complaints` and the resolution action | the moderation path works end to end |
| 6 | sign out, sign in as a farmer → `/api/admin/metrics` must answer **403** | the role check really rejects a non-administrator |

Step 6 is the important one: it proves that the protection is enforced by the
**server**, not by the website hiding a menu item.

## 1.5 Status in this repository

- The CLI is implemented and its argument handling, its password policy and
  its refusal to promote silently are covered by an automated test
  (`backend/src/__tests__/provisionAdmin.test.ts`).
- **No production administrator exists**, so the journey in section 1.4
  could not be run against the live site. Creating the account is the
  owner's action — it needs the production connection string.

---

# Part 2 — Firebase phone authentication (OTP)

## 2.1 What is implemented

### Backend — `POST /api/auth/firebase-phone`

`backend/src/modules/auth/auth.controller.ts` → `firebasePhoneAuth`:

1. the client sends a **Firebase ID token** (not a phone number, not an OTP
   code — the Firebase SDK on the client has already verified the code),
2. the backend verifies the token with the Firebase Admin SDK
   (`verifyIdToken`),
3. it reads `phone_number` and `uid` from the **verified** token,
4. it sanitises the phone number,
5. it finds the account by phone number, and by `firebaseUid`,
6. a **new** account gets a **random password hash** — the account can never
   be signed into with a guessed password; the real sign-in always goes
   through Firebase,
7. it issues the normal FarmConnect session (the same JWT as the password
   login), so every other part of the platform works unchanged.

**The backend never trusts a phone number that the client sent.** The number
comes out of the token that Firebase itself signed.

`backend/src/config/firebaseAdmin.ts` loads the credentials lazily, so the
API starts and the tests run even when Firebase is not configured. The
Admin SDK is only initialised when one of these is present:

| Variable | Meaning |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | the whole service-account JSON, as one line |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | path to the service-account JSON file |
| `FIREBASE_PROJECT_ID` | project id |
| `FIREBASE_CLIENT_EMAIL` | the service account's e-mail |
| `FIREBASE_PRIVATE_KEY` | the private key, with `\n` instead of real newlines |

### Website — `frontend/src/lib/firebase.ts`

The website initialises the Firebase web SDK and exposes
`isFirebasePhoneAuthConfigured`. When it is **not** configured the phone
sign-in is **disabled with an honest message** instead of pretending to
work. The placeholders in the file (`AIzaSyMockKeyForDevelopmentOnly…`,
`farmconnect-dev.firebaseapp.com`) are **not** a configuration — the SDK
would report `auth/invalid-api-key` at runtime, which is exactly why the
code checks for the real values first.

Required on the website (they are public values, but they still belong in
the Render environment of `farmconnect-web`, not in the repository):

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

### Android — **not implemented**

`mobile/pubspec.yaml` contains **no Firebase dependency**. The Android app
has:

* no `firebase_core`,
* no `firebase_auth`,
* no `google-services.json`,
* no `Firebase.initializeApp()`,
* no `RecaptchaVerifier` / phone sign-in screen.

The Android app therefore has **no phone OTP sign-in at all** — it uses the
email/phone + password flow that the shared backend already provides.

## 2.2 What is missing, and what each piece needs

| Piece | State | What is needed |
|---|---|---|
| Firebase project | **not configured** | a Firebase project with Phone Authentication enabled |
| Backend credentials | **not configured** | the service-account JSON in the API service's environment |
| Website configuration | **not configured** | the six `NEXT_PUBLIC_FIREBASE_*` values |
| Android SDK | **not integrated** | the FlutterFire packages, `google-services.json`, an `AndroidManifest` entry, and the sign-in screen |
| reCAPTCHA on the website | **not configured** | a reCAPTCHA site key for the web build (the Firebase web SDK needs it for the phone provider) |
| App Check / abuse prevention | not configured | recommended for a public OTP form |

## 2.3 Setup instructions

### Step 1 — the Firebase project

1. Open the [Firebase console](https://console.firebase.google.com/) and
   create a project (or use an existing one).
2. **Authentication → Sign-in method → Phone** → enable it.
3. Add the test phone numbers that should work without an SMS quota:
   `+91 99999 00001` … `+91 99999 00009` with the code `123456`.
   *(These are Firebase's own documented test numbers.)*
4. **Project settings → Your apps → Web app** → register the website and
   copy the configuration values.
5. **Project settings → Service accounts → Generate new private key** → the
   downloaded JSON is the backend credential.

### Step 2 — the backend

In the Render dashboard, for the service `farmconnect-api`, add the secret
environment variable:

```
FIREBASE_SERVICE_ACCOUNT_KEY = <the whole service-account JSON on one line>
```

Or, if the file is placed on the service's disk:

```
FIREBASE_SERVICE_ACCOUNT_PATH = /opt/render/project/src/serviceAccount.json
```

**Never** commit the service-account JSON and never paste it into a chat.

### Step 3 — the website

For `farmconnect-web`, add the six `NEXT_PUBLIC_FIREBASE_*` values and
deploy. `frontend/src/lib/firebase.ts` picks them up at build time.

### Step 4 — the Android app (only if the OTP sign-in is wanted there)

```powershell
cd mobile
flutter pub add firebase_core firebase_auth
dart pub global activate flutterfire_cli
flutterfire configure
```

`flutterfire configure` writes `lib/firebase_options.dart` and downloads
`android/app/google-services.json`. **That file is project configuration, not
a secret** — but it still belongs in the repository only if the team agrees
to that; it contains the API key of the Firebase project.

Then the app needs:

```dart
await Firebase.initializeApp(
  options: DefaultFirebaseOptions.currentPlatform,
);
```

in `main.dart`, and a sign-in screen that uses
`FirebaseAuth.instance.verifyPhoneNumber(...)` and then exchanges the
resulting ID token via `POST /api/auth/firebase-phone`.

### Step 5 — test it

```
1. Start the website, open the phone sign-in.
2. Enter one of Firebase's test numbers (+91 99999 00001).
3. Enter 123456.
4. The Firebase web SDK verifies the code and produces an ID token.
5. The website sends it to POST /api/auth/firebase-phone.
6. The backend verifies the token and returns the normal session.
7. Sign in with that phone number on the Android app — the same account.
```

## 2.4 Error handling that is already in place

* A request without an ID token → **400** "Firebase ID Token is required".
* An invalid or expired token → the Admin SDK throws, the controller answers
  **500** with the error message; the session is **not** issued.
* A token without a verified phone number → **400** "No verified phone
  number found in token".
* The website refuses to start the OTP flow when the Firebase configuration
  is missing, and shows the honest "not available" message instead of a
  spinner that never ends.

## 2.5 Status in this repository

- The backend path is **implemented** and can be switched on with environment
  variables alone.
- The website path is **implemented** and gated honestly on the real
  configuration.
- The Android path is **not implemented** — it needs the FlutterFire
  integration described above.
- **No successful OTP was fabricated.** Without a Firebase project there is
  no token to verify, so the happy path could not be executed here. It must
  be tested by the owner after step 1–3 above.
