# Frontend Blueprint: Struktur Production-Grade

Blueprint ini netral terhadap produk, jadi bisa dipakai ulang untuk landing SaaS, company profile, marketplace, atau portal internal. Contoh kode memakai Next.js 15 App Router + TypeScript, tapi pola IA, SEO, dan design system-nya berlaku di stack apa pun.

---

## 1. Lima keputusan sebelum menulis kode

Struktur folder yang rapi tidak menyelamatkan produk yang belum jelas. Kunci lima hal ini dulu, tulis di `docs/brief.md`:

1. **Satu kalimat produk.** Siapa penggunanya, masalah apa yang diselesaikan, dan apa alternatif yang mereka pakai sekarang.
2. **Satu primary action.** Setiap halaman punya tepat satu aksi utama. Kalau ada dua, salah satunya turun jadi sekunder.
3. **Rendering strategy per halaman.** Static, ISR, atau dynamic. Ini menentukan biaya hosting dan skor Core Web Vitals lebih besar daripada pilihan library mana pun.
4. **Sumber konten.** Hardcode, MDX, atau CMS. Kalau konten akan sering berubah, siapkan CMS sejak awal, bukan setelah 40 halaman terlanjur hardcoded.
5. **Bahasa dan pasar.** Single locale atau multi-locale. Menambahkan i18n belakangan berarti membongkar seluruh routing.

---

## 2. Stack rekomendasi

| Layer | Pilihan | Alasan |
|---|---|---|
| Framework | Next.js 15 (App Router) | Server Components, streaming, metadata API, image optimization built-in |
| Bahasa | TypeScript strict | `strict: true`, `noUncheckedIndexedAccess: true` |
| Styling | Tailwind CSS v4 + CSS custom properties | Token di CSS variables, utility di Tailwind |
| Komponen dasar | shadcn/ui (Radix) | Kode ada di repo, aksesibilitas sudah benar, bebas dikustomisasi |
| Form | React Hook Form + Zod | Satu skema Zod dipakai client dan server |
| Data fetching | Server Components dulu, TanStack Query untuk state client | Hindari client fetching kalau server bisa |
| Animasi | Motion (framer-motion) | Hanya untuk momen yang disengaja, bukan efek di setiap section |
| Konten | MDX atau headless CMS (Payload, Sanity, Strapi) | Sesuai frekuensi update |
| i18n | next-intl | Type-safe, mendukung routing per locale |
| Testing | Vitest + Playwright | Unit untuk logic, E2E untuk critical path |
| Kualitas | ESLint + Prettier + Husky + lint-staged | Gate sebelum commit |

---

## 3. Struktur folder

Feature-first, bukan type-first. Folder dinamai berdasarkan apa yang dilakukan, bukan jenis file-nya.

```
.
├── app/
│   ├── (marketing)/                 # route group: layout publik
│   │   ├── layout.tsx               # header + footer marketing
│   │   ├── page.tsx                 # homepage
│   │   ├── about/page.tsx
│   │   ├── pricing/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── blog/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   └── legal/
│   │       ├── privacy/page.tsx
│   │       └── terms/page.tsx
│   ├── (app)/                       # route group: area setelah login
│   │   ├── layout.tsx               # sidebar + topbar
│   │   └── dashboard/page.tsx
│   ├── api/
│   │   └── contact/route.ts
│   ├── layout.tsx                   # root: html, font, theme, analytics
│   ├── not-found.tsx
│   ├── error.tsx
│   ├── global-error.tsx
│   ├── loading.tsx
│   ├── sitemap.ts
│   ├── robots.ts
│   ├── manifest.ts
│   └── opengraph-image.tsx
│
├── components/
│   ├── ui/                          # primitif: button, input, dialog
│   ├── layout/                      # header, footer, nav, mobile-drawer
│   ├── sections/                    # hero, features, pricing-table, faq, cta
│   └── shared/                      # logo, icon, container, seo/json-ld
│
├── features/                        # domain logic per fitur
│   └── contact/
│       ├── components/
│       ├── schema.ts                # Zod
│       ├── actions.ts               # server actions
│       └── types.ts
│
├── lib/
│   ├── utils.ts                     # cn(), formatter
│   ├── seo.ts                       # helper metadata
│   ├── analytics.ts
│   └── env.ts                       # validasi env pakai Zod, fail fast
│
├── content/                         # MDX kalau tanpa CMS
├── config/
│   ├── site.ts                      # nama, url, sosial, default OG
│   └── navigation.ts                # satu sumber untuk menu + footer + sitemap
│
├── styles/
│   └── globals.css                  # design token sebagai CSS variables
│
├── hooks/
├── types/
├── public/
│   ├── fonts/
│   └── images/
└── docs/
    └── brief.md
```

**Aturan yang menjaga struktur ini tetap waras:**

- `components/ui` tidak boleh mengimpor dari `features/`. Arah dependensi selalu satu arah: `app` → `features` → `components` → `lib`.
- Komponen dipakai di dua tempat atau lebih baru naik ke `components/shared`. Sebelum itu, biarkan tinggal di feature-nya.
- `config/navigation.ts` jadi satu-satunya sumber struktur menu. Header, footer, breadcrumb, dan sitemap membaca file yang sama, jadi tidak pernah ada link yang tertinggal.
- Default semua komponen adalah Server Component. `"use client"` ditulis hanya di komponen paling bawah yang benar-benar butuh interaktivitas, bukan di parent.

---

## 4. Anatomi homepage

Homepage bukan kumpulan section. Ia satu argumen yang dibaca dari atas ke bawah: menarik perhatian, membangun kepercayaan, menjawab keberatan, lalu meminta aksi.

| # | Section | Tugas | Aturan praktis |
|---|---|---|---|
| 1 | Hero | Menjawab "ini apa, untuk siapa, kenapa saya peduli" dalam 5 detik | Satu headline, satu subhead, satu primary CTA. Kalau visualnya bisa jadi demo hidup atau produk itu sendiri, pakai itu, jangan stock image |
| 2 | Social proof | Menurunkan risiko yang dirasakan | Logo klien, jumlah pengguna, atau rating. Angka spesifik mengalahkan kata sifat |
| 3 | Problem | Menunjukkan Anda paham situasi pembaca | Tulis dalam bahasa pengguna, bukan istilah internal |
| 4 | Solution / core value | Tiga sampai empat manfaat utama | Manfaat sebagai judul, fitur sebagai penjelas. Bukan sebaliknya |
| 5 | How it works | Menghilangkan rasa "ini pasti ribet" | Tiga langkah. Ini satu-satunya tempat penomoran benar-benar bermakna |
| 6 | Deep feature | Bukti kedalaman produk | Dua atau tiga blok, teks dan visual bergantian sisi |
| 7 | Testimonial / case study | Bukti sosial yang konkret | Nama, jabatan, perusahaan, foto. Testimoni anonim tidak berbobot |
| 8 | Pricing atau CTA sekunder | Transparansi | Kalau pricing kompleks, ringkas di sini dan link ke halaman penuh |
| 9 | FAQ | Menutup keberatan terakhir | 5 sampai 8 pertanyaan. Markup `FAQPage` JSON-LD |
| 10 | Final CTA | Mengulang aksi utama | Aksi yang sama persis dengan hero, kata-kata sama |

**Yang membedakan homepage bagus dari homepage template:**

- Sembilan section dengan padding vertikal identik terasa seperti scroll tanpa ujung. Variasikan ritme: section padat lalu section lapang, latar terang lalu satu section gelap sebagai jeda.
- Satu momen berani saja. Kalau hero-nya kuat, sisanya tenang. Kalau setiap section punya animasi masuk, tidak ada yang terasa istimewa.
- Copy ditulis dari sudut pandang pengguna. "Kelola notifikasi", bukan "Konfigurasi webhook".
- Section yang tidak bisa Anda jelaskan tugasnya dalam satu kalimat sebaiknya dihapus.

---

## 5. Header dan navigasi

```
┌──────────────────────────────────────────────────────────┐
│ [Logo]   Produk ▾  Solusi ▾  Harga  Blog    [Masuk] [CTA]│
└──────────────────────────────────────────────────────────┘
```

- **Maksimal 5 sampai 7 item level atas.** Lebih dari itu, pengguna berhenti membaca dan mulai menebak.
- **Mega menu hanya kalau isinya banyak.** Dropdown untuk 3 sampai 5 link, mega menu untuk kategori bertingkat dengan deskripsi pendek.
- **Sticky header** dengan tinggi lebih rendah setelah scroll, tanpa animasi berlebihan. Beri `backdrop-blur` dan border bawah tipis agar konten di baliknya tetap terbaca.
- **Mobile:** drawer atau full-screen overlay, bukan dropdown yang dipaksakan. Target sentuh minimal 44x44 px. Trap fokus saat terbuka, kembalikan fokus ke tombol saat ditutup, tutup dengan Escape.
- **Aksesibilitas:** `<nav aria-label="Utama">`, `aria-expanded` pada trigger, `aria-current="page"` pada link aktif, dan skip link `<a href="#main">Lewati ke konten</a>` sebagai elemen fokus pertama.
- Satu CTA di header, dibedakan secara visual dari link biasa.

---

## 6. Footer

Footer adalah peta situs yang dibaca manusia sekaligus mesin. Ini tempat internal linking bekerja paling murah.

```
┌──────────────────────────────────────────────────────────┐
│ [Logo]            Produk      Perusahaan    Sumber Daya  │
│ Deskripsi 2 baris Fitur       Tentang       Blog         │
│ [Newsletter]      Harga       Karier        Dokumentasi  │
│ [Ikon sosial]     Integrasi   Kontak        Status       │
├──────────────────────────────────────────────────────────┤
│ © 2026 Nama. Privasi · Ketentuan · Cookie      [ID / EN] │
└──────────────────────────────────────────────────────────┘
```

- 3 sampai 4 kolom link plus satu kolom brand. Lebih dari lima kolom terbaca seperti dinding.
- Judul kolom pakai `<h2>` visual kecil dan setiap kolom dibungkus `<nav aria-label="...">` sendiri.
- Sertakan link legal (privasi, ketentuan, kebijakan cookie) dan, untuk perusahaan Indonesia, alamat badan usaha. Ini juga sinyal kepercayaan untuk Google.
- Newsletter opsional. Kalau dipasang, satu field, satu tombol, dan pesan sukses yang jelas.
- Jangan letakkan link penting hanya di footer. Kalau penting, ia layak ada di header atau di body.

---

## 7. Design system

Token dulu, komponen kemudian. Semua warna, jarak, radius, dan bayangan hidup sebagai CSS variables, sehingga dark mode dan rebranding cuma mengganti nilai.

```css
/* styles/globals.css */
@layer base {
  :root {
    --bg: 0 0% 100%;
    --fg: 222 15% 12%;
    --muted: 220 12% 46%;
    --accent: 240 72% 52%;
    --surface: 220 20% 97%;
    --border: 220 13% 90%;

    --radius: 0.625rem;
    --shadow-raised: 0 1px 2px hsl(var(--fg) / 0.06),
                     0 8px 24px hsl(var(--fg) / 0.06);

    --step--1: clamp(0.83rem, 0.8rem + 0.15vw, 0.9rem);
    --step-0:  clamp(1rem, 0.96rem + 0.2vw, 1.125rem);
    --step-1:  clamp(1.25rem, 1.15rem + 0.5vw, 1.5rem);
    --step-2:  clamp(1.6rem, 1.4rem + 1vw, 2.25rem);
    --step-3:  clamp(2.1rem, 1.7rem + 2vw, 3.5rem);
    --step-4:  clamp(2.8rem, 2rem + 3.5vw, 5rem);
  }

  [data-theme="dark"] {
    --bg: 224 22% 8%;
    --fg: 220 15% 94%;
    --muted: 220 10% 62%;
    --surface: 224 20% 12%;
    --border: 224 14% 20%;
  }
}
```

**Tipografi**

- Satu atau dua typeface saja. Kalau dua, bedanya harus jelas terlihat, bukan dua sans-serif yang mirip.
- Panjang baris teks di bawah 80 karakter (`max-w-[65ch]`). Serif boleh sedikit lebih panjang dan butuh `line-height` lebih longgar daripada sans-serif.
- Skala tipografi memakai `clamp()` seperti di atas, jadi tidak perlu breakpoint terpisah untuk ukuran teks.
- Muat font lokal lewat `next/font/local` dengan `display: "swap"` dan subset latin. Menghosting sendiri menghilangkan satu round trip ke server pihak ketiga.

**Spacing dan layout**

- Skala 4 px: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.
- Satu komponen `<Container>` dengan `max-w-[1200px]` dan padding horizontal responsif. Jangan menulis ulang lebar container di tiap section.
- Grid 12 kolom di desktop, 4 di mobile.

**Yang harus dihindari karena terbaca sebagai template**

- Semua elemen memakai border-radius dan drop shadow abu-abu yang sama, tanpa hierarki.
- Label ALL CAPS berspasi lebar di atas setiap heading.
- Satu kata di headline diwarnai beda atau di-italic.
- Gradient sebagai dekorasi tanpa alasan.
- Animasi fade-and-slide-up di setiap section saat scroll.
- Tanda panah "→" ditempel di setiap teks tombol.

---

## 8. SEO teknis

### 8.1 Metadata dasar

```ts
// config/site.ts
export const site = {
  name: "Nama Produk",
  url: "https://example.com",
  description: "Deskripsi 150 sampai 160 karakter yang menyebut manfaat utama.",
  locale: "id_ID",
  twitter: "@handle",
} as const;
```

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import { site } from "@/config/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name}: ${site.description.slice(0, 60)}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  alternates: {
    canonical: "/",
    languages: { "id-ID": "/", "en-US": "/en" },
  },
  openGraph: {
    type: "website",
    locale: site.locale,
    url: site.url,
    siteName: site.name,
    title: site.name,
    description: site.description,
  },
  twitter: { card: "summary_large_image", site: site.twitter },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};
```

### 8.2 Metadata dinamis per halaman

```tsx
// app/(marketing)/blog/[slug]/page.tsx
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      type: "article",
      publishedTime: post.publishedAt,
      authors: [post.author.name],
      images: [{ url: post.cover, width: 1200, height: 630 }],
    },
  };
}
```

Catatan Next.js 15: `params` dan `searchParams` sekarang berupa Promise, jadi harus di-`await`.

### 8.3 Sitemap dan robots

```ts
// app/sitemap.ts
import type { MetadataRoute } from "next";
import { site } from "@/config/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts();

  const statics = ["", "/about", "/pricing", "/blog", "/contact"].map((p) => ({
    url: `${site.url}${p}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.7,
  }));

  const dynamics = posts.map((post) => ({
    url: `${site.url}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...statics, ...dynamics];
}
```

```ts
// app/robots.ts
import type { MetadataRoute } from "next";
import { site } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard/"] }],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
```

### 8.4 Structured data (JSON-LD)

Ini yang membuat hasil pencarian tampil dengan rich result. Minimal pasang `Organization` dan `WebSite` di root, `BreadcrumbList` di halaman dalam, `Article` di blog, `FAQPage` di FAQ, `Product` plus `AggregateRating` di halaman produk.

```tsx
// components/shared/json-ld.tsx
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

```tsx
<JsonLd
  data={{
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: site.url,
    logo: `${site.url}/logo.png`,
    sameAs: ["https://linkedin.com/company/...", "https://github.com/..."],
  }}
/>
```

### 8.5 Open Graph image otomatis

```tsx
// app/opengraph-image.tsx
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ /* layout kartu OG di sini */ }}>...</div>
    ),
    size
  );
}
```

### 8.6 Hal yang sering terlewat

- **Satu `<h1>` per halaman**, dan hierarki heading tidak boleh melompat dari h2 ke h4.
- **Canonical URL** di setiap halaman, terutama halaman dengan parameter filter atau paginasi.
- **`alt` yang deskriptif** pada gambar bermakna, `alt=""` pada gambar dekoratif.
- **Breadcrumb** di halaman kedalaman 2 atau lebih, sekaligus sebagai `BreadcrumbList`.
- **Internal linking** dari artikel ke halaman pilar. Halaman yatim tanpa link masuk jarang terindeks dengan baik.
- **`hreflang`** kalau multi-bahasa, termasuk `x-default`.
- **404 yang berguna**: sertakan pencarian dan link ke halaman populer, jangan halaman kosong.
- Untuk pasar Indonesia, daftarkan properti di Google Search Console dan Bing Webmaster Tools, lalu kirim sitemap secara manual di awal.

---

## 9. Performa

Target Core Web Vitals untuk lolos di data lapangan (persentil 75):

| Metrik | Target | Penyebab umum kegagalan |
|---|---|---|
| LCP | di bawah 2.5 detik | Gambar hero tidak dioptimasi, font memblokir render, terlalu banyak client component |
| INP | di bawah 200 ms | Bundle JavaScript besar, handler yang berat di main thread |
| CLS | di bawah 0.1 | Gambar tanpa dimensi, iklan atau banner yang disisipkan, font swap tanpa fallback yang cocok |

**Praktik yang paling berdampak:**

- `next/image` dengan `priority` hanya pada gambar LCP, `sizes` yang benar, dan format AVIF atau WebP.
- `next/font/local` supaya font ikut di-cache bersama aset lain, dengan fallback metrics agar CLS mendekati nol.
- Bagi Server dan Client Component secara agresif. Ambil aturan sederhana: kalau tidak ada `useState`, `useEffect`, atau event handler, ia Server Component.
- Skrip pihak ketiga pakai `next/script` dengan `strategy="lazyOnload"`. Analytics dan chat widget adalah penyebab regresi INP nomor satu.
- Budget bundle: JavaScript rute awal di bawah 150 KB gzip. Pasang `@next/bundle-analyzer` dan cek setiap sebelum rilis.
- Nyalakan Lighthouse CI di pipeline agar regresi ketahuan sebelum merge, bukan setelah pengguna mengeluh.

---

## 10. Aksesibilitas

Bukan tambahan di akhir, tapi lantai kualitas. Target WCAG 2.2 level AA.

- Kontras teks minimal 4.5:1, teks besar 3:1, dan komponen UI 3:1.
- Semua interaksi bisa dijalankan dengan keyboard, dan fokus selalu terlihat. Jangan pernah `outline: none` tanpa pengganti.
- HTML semantik dulu, ARIA hanya kalau tidak ada elemen native yang cocok.
- Hormati `prefers-reduced-motion` dan matikan animasi non-esensial.
- Label form terhubung ke input, dan pesan error dijelaskan dalam teks, bukan hanya warna merah.
- Uji dengan keyboard saja, lalu dengan screen reader (NVDA atau VoiceOver) pada alur utama.

---

## 11. Checklist sebelum rilis

**Struktur**
- [ ] `config/navigation.ts` jadi sumber tunggal menu, footer, dan sitemap
- [ ] Tidak ada `"use client"` di komponen layout tingkat atas
- [ ] Variabel environment divalidasi Zod di `lib/env.ts`

**SEO**
- [ ] Title dan description unik di setiap halaman, panjang wajar
- [ ] Canonical benar, termasuk di halaman berparameter
- [ ] `sitemap.xml` dan `robots.txt` bisa diakses dan sudah dikirim ke Search Console
- [ ] JSON-LD lolos Rich Results Test
- [ ] Gambar OG muncul benar di WhatsApp, X, dan LinkedIn
- [ ] Satu `<h1>` per halaman, hierarki heading tidak melompat

**Performa**
- [ ] Lighthouse mobile di atas 90 untuk keempat kategori
- [ ] LCP di bawah 2.5 detik pada koneksi 4G yang di-throttle
- [ ] Tidak ada layout shift saat font dimuat

**Aksesibilitas**
- [ ] Seluruh homepage bisa dinavigasi dengan Tab
- [ ] Skip link berfungsi
- [ ] Axe DevTools nol pelanggaran serius

**Produksi**
- [ ] Security headers terpasang (CSP, HSTS, X-Content-Type-Options, Referrer-Policy)
- [ ] Error tracking aktif (Sentry atau sejenis)
- [ ] Analytics menghormati consent
- [ ] Halaman 404 dan 500 dirancang, bukan bawaan
- [ ] Redirect dari domain lama sudah dipetakan
