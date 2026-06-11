# Graph Report - .  (2026-06-10)

## Corpus Check
- 57 files · ~66,904 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 217 nodes · 226 edges · 20 communities (12 shown, 8 thin omitted)
- Extraction: 80% EXTRACTED · 19% INFERRED · 1% AMBIGUOUS · INFERRED: 44 edges (avg confidence: 0.93)
- Token cost: 8,500 input · 1,800 output

## Community Hubs (Navigation)
- [[_COMMUNITY_UI Components|UI Components]]
- [[_COMMUNITY_App Architecture & Concepts|App Architecture & Concepts]]
- [[_COMMUNITY_Build Configuration|Build Configuration]]
- [[_COMMUNITY_Brand & PWA Icons|Brand & PWA Icons]]
- [[_COMMUNITY_ZegoCloud WebRTC Layer|ZegoCloud WebRTC Layer]]
- [[_COMMUNITY_PWA Manifest|PWA Manifest]]
- [[_COMMUNITY_SVG Icon Variants|SVG Icon Variants]]
- [[_COMMUNITY_NPM Dependencies|NPM Dependencies]]
- [[_COMMUNITY_App Entry & PWA Bootstrap|App Entry & PWA Bootstrap]]
- [[_COMMUNITY_React App Shell|React App Shell]]
- [[_COMMUNITY_Meeting Error Boundary|Meeting Error Boundary]]
- [[_COMMUNITY_iOS Install Banner|iOS Install Banner]]
- [[_COMMUNITY_CICD Pipeline|CI/CD Pipeline]]
- [[_COMMUNITY_Multilingual i18n|Multilingual i18n]]
- [[_COMMUNITY_Service Worker Cache|Service Worker Cache]]
- [[_COMMUNITY_Splash 1290x2796|Splash 1290x2796]]
- [[_COMMUNITY_Splash 2048x2732|Splash 2048x2732]]
- [[_COMMUNITY_Input Validators|Input Validators]]

## God Nodes (most connected - your core abstractions)
1. `ZegoCloudService` - 18 edges
2. `App Icon 512px (SVG)` - 13 edges
3. `scripts` - 7 edges
4. `MeetingService` - 5 edges
5. `AuthService` - 5 edges
6. `CruxApp — Main Application Component` - 5 edges
7. `CruxApp Function — App Root State Manager` - 5 edges
8. `MeetingErrorBoundary` - 4 edges
9. `PaymentService` - 4 edges
10. `MeetingService` - 4 edges

## Surprising Connections (you probably didn't know these)
- `React Default Logo SVG (Create React App)` --semantically_similar_to--> `React App Logo 192px`  [AMBIGUOUS] [semantically similar]
  src/logo.svg → public/logo192.png
- `ZegoCloudService` --conceptually_related_to--> `Concept: Flutter Cross-Platform Compatibility`  [AMBIGUOUS]
  src/services/ZegoService.js → src/services/FirebaseService.js
- `Codemagic CI/CD — Build & Deploy Pipeline` --references--> `package.json — Project Manifest`  [EXTRACTED]
  codemagic.yaml → package.json
- `AuthService` --semantically_similar_to--> `AuthService`  [INFERRED] [semantically similar]
  src/services/FirebaseService.js → src/services/LocalStorageService.js
- `Apple Touch Icon 152px (SVG)` --semantically_similar_to--> `App Icon 512px (SVG)`  [INFERRED] [semantically similar]
  public/icons/apple-touch-icon-152.png.svg → public/icons/icon-512.png.svg

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Authentication backed by both Firebase and LocalStorage** — services_firebaseservice_authservice, services_localstorageservice_authservice, crux_web_jsx_cruxapp [EXTRACTED 0.95]
- **Meeting management backed by both Firebase and LocalStorage** — services_firebaseservice_meetingservice, services_localstorageservice_meetingservice, crux_web_jsx_cruxapp [EXTRACTED 0.95]
- **PWA Stack: Service Worker + Manifest + index.js registration** — sw_js, manifest_json, index_js, concept_pwa [EXTRACTED 1.00]
- **WebRTC Pipeline: ZegoService → useZegoMeeting Hook → CruxApp** — services_zegoservice_zegocloudservice, hooks_usezegoemeeting, crux_web_jsx_cruxapp [INFERRED 0.85]
- **Crux Application Icon Set (All Sizes)** — public_crux_icon, public_favicon, icons_icon_72, icons_icon_96, icons_icon_128, icons_icon_144, icons_icon_152, icons_icon_167, icons_icon_180, icons_icon_192, icons_icon_384, icons_icon_512, icons_apple_touch_icon_152, icons_apple_touch_icon_167, icons_apple_touch_icon_180, public_logo192, public_logo512 [INFERRED 0.90]
- **Crux SVG Brand Assets** — public_crux_logo, src_logo [INFERRED 0.75]
- **CRUX Brand Icon Set — red-to-purple gradient, play/pause logo** — icons_icon_72_png_svg, icons_icon_96_png_svg, icons_icon_128_png_svg, icons_icon_144_png_svg, icons_icon_152_png_svg, icons_icon_180_png_svg, icons_icon_192_png_svg, icons_icon_384_png_svg, icons_icon_512_png_svg, icons_apple_touch_icon_152_png_svg, icons_apple_touch_icon_167_png_svg, icons_apple_touch_icon_180_png_svg [INFERRED 0.95]
- **CRUX Splash Screen Set — all device sizes, SVG and PNG variants** — splash_splash_750x1334_svg, splash_splash_1170x2532_svg, splash_splash_1290x2796_svg, splash_splash_2048x2732_svg, splash_splash_750x1334_png, splash_splash_1170x2532_png, splash_splash_1290x2796_png, splash_splash_2048x2732_png [INFERRED 0.95]
- **CRUX Brand Assets — shared red-to-purple gradient identity across icons and splash screens** — icons_icon_512_png_svg, splash_splash_750x1334_svg, splash_splash_1170x2532_svg, splash_splash_1290x2796_svg, splash_splash_2048x2732_svg [INFERRED 0.90]

## Communities (20 total, 8 thin omitted)

### Community 0 - "UI Components"
Cohesion: 0.04
Nodes (11): C, fieldStyle, GamService, navIconBtn, notifPanel, primBtn, ProService, secBtn (+3 more)

### Community 1 - "App Architecture & Concepts"
Cohesion: 0.10
Nodes (20): Concept: Dual Service Pattern (Firebase + LocalStorage fallback), Concept: Flutter Cross-Platform Compatibility, Concept: Gamification (XP, Badges, Meetings count), CruxApp — Main Application Component, AdminPanel — Payment Request Admin UI, CruxApp Function — App Root State Manager, GamService — Gamification Service, Navbar Component (+12 more)

### Community 2 - "Build Configuration"
Cohesion: 0.09
Nodes (21): browserslist, development, production, description, devDependencies, cross-env, gh-pages, sharp (+13 more)

### Community 3 - "Brand & PWA Icons"
Cohesion: 0.11
Nodes (21): Crux Brand Identity, Crux PWA Icon Set, Apple Touch Icon 152px, Apple Touch Icon 167px, Apple Touch Icon 180px, App Icon 128px, App Icon 144px, App Icon 152px (+13 more)

### Community 4 - "ZegoCloud WebRTC Layer"
Cohesion: 0.13
Nodes (3): useZegoMeeting — Zego WebRTC Hook, ZEGO_CONFIG, ZegoCloudService

### Community 5 - "PWA Manifest"
Cohesion: 0.12
Nodes (16): background_color, categories, description, display, display_override, icons, lang, name (+8 more)

### Community 6 - "SVG Icon Variants"
Cohesion: 0.12
Nodes (16): Apple Touch Icon 152px (SVG), Apple Touch Icon 167px (SVG), Apple Touch Icon 180px (SVG), App Icon 128px (SVG), App Icon 144px (SVG), App Icon 152px (SVG), App Icon 180px (SVG), App Icon 192px (SVG) (+8 more)

### Community 7 - "NPM Dependencies"
Cohesion: 0.20
Nodes (10): dependencies, axios, firebase, react, react-dom, react-router-dom, react-scripts, web-vitals (+2 more)

### Community 8 - "App Entry & PWA Bootstrap"
Cohesion: 0.40
Nodes (5): App Root Component, Concept: Progressive Web App (PWA), Application Entry Point, PWA Web Manifest, Service Worker (PWA Cache)

### Community 11 - "iOS Install Banner"
Cohesion: 0.67
Nodes (3): IOSInstallBanner(), isInStandaloneMode(), isIOS()

## Ambiguous Edges - Review These
- `ZegoCloudService` → `Concept: Flutter Cross-Platform Compatibility`  [AMBIGUOUS]
  src/services/ZegoService.js · relation: conceptually_related_to
- `React App Logo 192px` → `React Default Logo SVG (Create React App)`  [AMBIGUOUS]
  src/logo.svg · relation: semantically_similar_to

## Knowledge Gaps
- **102 isolated node(s):** `name`, `version`, `description`, `private`, `homepage` (+97 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `ZegoCloudService` and `Concept: Flutter Cross-Platform Compatibility`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `React App Logo 192px` and `React Default Logo SVG (Create React App)`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **Why does `ZegoCloudService` connect `ZegoCloud WebRTC Layer` to `App Architecture & Concepts`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Why does `Concept: Dual Service Pattern (Firebase + LocalStorage fallback)` connect `App Architecture & Concepts` to `ZegoCloud WebRTC Layer`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `MeetingService` connect `App Architecture & Concepts` to `UI Components`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Are the 14 inferred relationships involving `Crux PWA Icon Set` (e.g. with `Crux Brand Identity` and `Apple Touch Icon 152px`) actually correct?**
  _`Crux PWA Icon Set` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `App Icon 512px (SVG)` (e.g. with `Apple Touch Icon 152px (SVG)` and `Apple Touch Icon 167px (SVG)`) actually correct?**
  _`App Icon 512px (SVG)` has 11 INFERRED edges - model-reasoned connections that need verification._