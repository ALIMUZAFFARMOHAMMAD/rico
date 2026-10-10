# Google Play: Data safety answers (Rico, `chat.rico.app`)

Based on the code as of 2026-10-10: the `pages/api/*` routes, `lib/db.js` and `pages/privacy.js`.
Processors: Clerk (sign-in), Supabase and Vercel (database and hosting), Anthropic (AI replies and analysis), ElevenLabs (speech-to-text, text-to-speech, voice cloning).
In Google's terms, sending data to a service provider that processes it on our behalf is **not "sharing"**. That is why every "Shared" answer below is **No**.

---

## Section 1: Data collection and security

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (HTTPS only: `cleartext: false`, Vercel/Clerk/Supabase TLS) |
| Which of the following methods of account creation does your app support? | **Username and password / other authentication** (email + one-time code via Clerk) |
| Do you provide a way for users to request that their data is deleted? | **Yes**: Me → Delete account in the app, or the web page below |
| Delete account URL | **https://ricomates.si/delete-account** |

---

## Section 2: Data types

For each type, Play asks: **Collected? · Shared? · Processed ephemerally? · Required or optional? · Purposes**

### Personal info
| Type | Collected | Shared | Ephemeral | Required? | Purposes |
|---|---|---|---|---|---|
| **Name** | Yes | No | No | Optional | App functionality, Account management |
| **Email address** | Yes | No | No | **Required** | Account management, App functionality |
| **Other info** (résumé profile, AI personality read of the user) | Yes | No | No | Optional | App functionality, Personalization |

### Messages
| Type | Collected | Shared | Ephemeral | Required? | Purposes |
|---|---|---|---|---|---|
| **Other in-app messages** (chats with AI friends and twins, group chats) | Yes | No | No | **Required** | App functionality, Personalization |

### Photos and videos
| Type | Collected | Shared | Ephemeral | Required? | Purposes |
|---|---|---|---|---|---|
| **Photos** (selfie for "Twin's look"; résumé images) | Yes | No | **Yes**: sent once to the AI, only colour values kept | Optional | App functionality |

### Audio
| Type | Collected | Shared | Ephemeral | Required? | Purposes |
|---|---|---|---|---|---|
| **Voice or sound recordings** (voice calls → speech-to-text; voice-clone sample) | Yes | No | **No** (see note) | Optional | App functionality |

> **Note:** call audio itself is transcribed and not kept, but a voice-clone sample becomes a stored voice model at ElevenLabs. One type can't be both, so answer **not ephemeral**.

### Files and docs
| Type | Collected | Shared | Ephemeral | Required? | Purposes |
|---|---|---|---|---|---|
| **Files and docs** (résumé PDF or DOCX; the extracted profile is stored) | Yes | No | No | Optional | App functionality, Personalization |

### App activity
| Type | Collected | Shared | Ephemeral | Required? | Purposes |
|---|---|---|---|---|---|
| **App interactions** (active days, games played, call counts; first-party, `/api/track`) | Yes | No | No | **Required** | Analytics, App functionality |
| **Other user-generated content** (AI twin profile, notebook, memory notes) | Yes | No | No | Optional | App functionality |

### Answer "No" (not collected)
Location (approximate or precise) · Financial info · Health and fitness · Contacts · Calendar · Web browsing history · Installed apps · SMS/call logs · Crash logs · Diagnostics · Device or other IDs · Race/ethnicity, political, religious, sexual orientation (Rico doesn't ask for any of these).

---

## Section 3: Before you submit

1. ✅ **Account deletion:** fixed. The app has Me → Delete account, and the web page is `/delete-account`. Both call `DELETE /api/account`, which removes every row the user owns, the twin and the cloned voice, career results and the Clerk user.
2. ⚠️ **Contact email:** still open. The privacy policy says "contact us" with no address. Add a support email to `pages/privacy.js`; Play also asks for one on the listing.
3. ✅ **Speech-to-text:** fixed. The privacy policy now names ElevenLabs for speech-to-text and links the delete page.

## Not covered by the data-safety form, but asked nearby
- **Target audience / content rating:** Rico allows ages 13 and up. Picking 13–17 brings Families/teen requirements for an AI-companion app. Choosing **18+ only** is the simpler path for the first release.
- **Independent security review:** No.
