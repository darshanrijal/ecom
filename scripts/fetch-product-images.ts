// biome-ignore-all lint: dev script
/**
 * Downloads a real product photo for every catalog product from Wikimedia
 * Commons into public/products/ and writes src/lib/product-images.json:
 *
 *   { "iphone-15": "/products/iphone-15.jpg", ... }
 *
 * seed.ts reads that manifest, so the database never contains placeholder
 * image URLs. Re-run with: bun scripts/fetch-product-images.ts
 * Already-downloaded images are skipped, so re-runs resume where they left off.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CATEGORIES, slugify } from "../src/lib/catalog";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "public", "products");
const MANIFEST = path.join(ROOT, "src", "lib", "product-images.json");

const UA = "GadaElectronicsSeeder/1.0 (seed script; runs once per reseed)";
const API_DELAY_MS = 1400; // stay under the Commons anonymous API limit
const DOWNLOAD_DELAY_MS = 250;

/**
 * Per-category search strategy:
 * - primary: phrase used for the brand-specific fallback query
 * - anchors: words that MUST appear in the chosen photo title
 *   (otherwise we get results like "Flat white" for a television)
 */
const CATEGORY_STRATEGY: Record<
  string,
  { primary: string; anchors: string[]; extra?: string[] }
> = {
  "mobile phones": {
    primary: "smartphone",
    anchors: [
      "phone",
      "pixel",
      "galaxy",
      "iphone",
      "redmi",
      "oneplus",
      "smartphone",
      "mobile",
    ],
  },
  televisions: {
    primary: "flat screen television",
    anchors: ["television", "tv"],
    extra: ["smart television screen", "LCD television", "LED television"],
  },
  refrigerators: {
    primary: "refrigerator",
    anchors: ["refrigerator", "fridge"],
  },
  "washing machines": {
    primary: "washing machine",
    anchors: ["washing", "washer"],
  },
  "ovens & microwaves": {
    primary: "microwave oven",
    anchors: ["microwave", "oven", "otg"],
  },
  "mixers & grinders": {
    primary: "mixer grinder",
    anchors: ["mixer", "grinder", "blender"],
  },
  laptops: { primary: "laptop", anchors: ["laptop", "macbook", "notebook"] },
  "air conditioners": {
    primary: "air conditioner indoor unit",
    anchors: ["conditioner", "air conditioner"],
  },
  "headphones & earphones": {
    primary: "headphones",
    anchors: ["headphone", "earphone", "earbud"],
  },
  speakers: { primary: "bluetooth speaker", anchors: ["speaker", "echo"] },
};

/** Brand-token aliases when the first word of the product name is too generic. */
const BRAND_ALIASES: Record<string, string[]> = {
  mi: ["xiaomi", "mi "],
  boat: ["boat"],
};

/** Titles containing these words are almost never usable product photos. */
const BAD_WORDS = [
  "logo",
  "icon",
  "diagram",
  "schematic",
  "chart",
  "graph",
  "map of",
  "symbol",
  "seal",
  "flag",
  "wordmark",
  "advertisement",
  "poster",
  "billboard",
  "banner",
  "font",
  "crest",
  "drawing",
  "sketch",
  "clipart",
  "equation",
  "screenshot",
  "signature",
  "plaque",
  "interior",
  "teardown",
  "exploded",
  "patent",
  "cover page",
  "title card",
  "fingerprint",
  "scanner",
  "circuit",
  "motherboard",
  "packaging",
  "manual",
  "sticker",
  // miscategorized / junk photo signals discovered during QA
  "vintage",
  "pocket",
  "watchman",
  "travelvision",
  "miniature",
  "broken",
  "cracked",
  "outdoor unit",
  "laundry room",
  "drum of",
  "wooden",
  "blade",
  "keyboard",
  "trackpad",
  "dpla",
  "clay",
  "improvement in",
  "savannah",
  "guitar amplifier",
  "old",
  "open",
  "power module",
  "exhibition",
  "frame grabber",
  "crt",
  "box",
  "badge",
  "pictogram",
  "laundry",
  "clown",
  "museum",
  "1920",
  "1930",
  "sign",
  "ancient",
  "slicers",
  "shop front",
  "storefront",
  "cement",
  "concrete",
];

/** Titles written in non-Latin scripts are usually not usable product photos. */
const NON_LATIN_SCRIPT = /[ऀ-ॿঀ-৿؀-࿿က-႟぀-ヿ가-힯一-鿿]/;

/** Escapes a phrase and matches its words with any separator (space/hyphen...). */
function phrasePattern(phrase: string): string {
  return phrase
    .split(/\s+/)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[^a-z0-9]+");
}

/** Matches a phrase allowing a trailing plural ("blade" also catches "blades"). */
function boundaryRegex(phrase: string): RegExp {
  return new RegExp(
    `(^|[^a-z0-9])${phrasePattern(phrase)}s?([^a-z0-9]|$)`,
    "i"
  );
}

function isBadTitle(title: string): boolean {
  return BAD_WORDS.some((bad) => boundaryRegex(bad).test(title));
}

type Candidate = {
  title: string;
  thumbUrl: string;
  width: number;
  height: number;
  score: number;
};

const usedFiles = new Set<string>();

/** Dedup key: Openverse mirrors Commons without the ".jpg" suffix. */
function dedupKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/\.(jpe?g|png)$/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function apiFetch(url: URL, attempts = 4): Promise<Response> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const res = await fetch(url, { headers: { "user-agent": UA } });
    if (res.status === 429) {
      const waitMs = 15_000 * attempt;
      console.log(
        `    ⏳ rate-limited, waiting ${waitMs / 1000}s (attempt ${attempt}/${attempts})...`
      );
      await sleep(waitMs);
      continue;
    }
    if (!res.ok) {
      throw new Error(`Commons API ${res.status}`);
    }
    return res;
  }
  throw new Error("Commons API 429 (gave up)");
}

async function searchCommons(query: string, limit = 10): Promise<Candidate[]> {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", query);
  url.searchParams.set("gsrnamespace", "6");
  url.searchParams.set("gsrlimit", String(limit));
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|size");
  url.searchParams.set("iiurlwidth", "1000");

  const res = await apiFetch(url);

  const data = (await res.json()) as {
    query?: {
      pages?: Record<
        string,
        {
          title: string;
          imageinfo?: Array<{
            thumburl?: string;
            width?: number;
            height?: number;
          }>;
        }
      >;
    };
  };

  const pages = Object.values(data.query?.pages ?? {});
  const candidates: Candidate[] = [];

  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info?.thumburl || !info.width || !info.height) {
      continue;
    }

    const title = page.title.replace(/^File:/, "");
    if (!/\.(jpe?g|png)$/i.test(title)) {
      continue;
    }

    if (NON_LATIN_SCRIPT.test(title)) {
      continue;
    }

    // Skip unusable aspect ratios / tiny images.
    const ratio = info.width / info.height;
    if (info.width < 500 || info.height < 400 || ratio < 0.4 || ratio > 2.6) {
      continue;
    }

    candidates.push({
      title,
      thumbUrl: info.thumburl.split("?")[0],
      width: info.width,
      height: info.height,
      score: 0,
    });
  }

  return candidates;
}

/**
 * Openverse (Flickr + friends, CC-licensed) — used as a secondary source
 * when Commons cannot offer a unique, usable photo.
 */
async function searchOpenverse(
  query: string,
  limit = 12
): Promise<Candidate[]> {
  const url = new URL("https://api.openverse.org/v1/images/");
  url.searchParams.set("q", query);
  url.searchParams.set("page_size", String(limit));

  const res = await apiFetch(url);
  const data = (await res.json()) as {
    results?: Array<{
      title?: string;
      url?: string;
      width?: number;
      height?: number;
    }>;
  };

  const candidates: Candidate[] = [];
  for (const result of data.results ?? []) {
    const title = result.title?.trim();
    if (!title || !result.url || !result.width || !result.height) {
      continue;
    }
    if (NON_LATIN_SCRIPT.test(title) || isBadTitle(title)) {
      continue;
    }
    const ratio = result.width / result.height;
    if (
      result.width < 500 ||
      result.height < 400 ||
      ratio < 0.4 ||
      ratio > 2.6
    ) {
      continue;
    }
    candidates.push({
      title,
      thumbUrl: result.url,
      width: result.width,
      height: result.height,
      score: 0,
    });
  }

  return candidates;
}

function hasAnchor(titleNorm: string, anchors: string[]): boolean {
  // boundary-aware, and plural-tolerant ("televisions" matches "television")
  return anchors.some((anchor) => boundaryRegex(anchor).test(titleNorm));
}

function scoreCandidate(
  candidate: Candidate,
  name: string,
  strategy: { primary: string; anchors: string[] },
  rank: number,
  relaxed: boolean
): number {
  const titleNorm = candidate.title.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  let score = 30 - rank * 2; // earlier Commons results are usually better

  // Hard reject: junk photo signals (vintage sets, patent scans, close-ups...).
  if (isBadTitle(candidate.title)) {
    return Number.NEGATIVE_INFINITY;
  }

  // Photo must show this kind of product at all, or it is useless to us.
  if (!hasAnchor(titleNorm, strategy.anchors)) {
    return relaxed ? Number.NEGATIVE_INFINITY : score - 45;
  }
  score += 15;

  if (relaxed) {
    // Generic fallback: anchor match is enough, but still avoid duplicates.
    return usedFiles.has(candidate.title) ? score - 25 : score;
  }

  // Brand: first word of the product name (with aliases).
  const brand = name.split(/\s+/)[0].toLowerCase();
  const brandTerms = BRAND_ALIASES[brand] ?? [brand];
  const brandHit =
    brandTerms.some((term) =>
      term.endsWith(" ")
        ? titleNorm.includes(term)
        : titleNorm.includes(` ${term} `)
    ) || titleNorm.startsWith(`${brandTerms[0]} `);
  score += brandHit ? 12 : -15;

  // Model/size numbers: matching is a strong signal, mismatching is a warning.
  const nameTokens = name.toLowerCase().split(/\s+/);
  const digitTokens = nameTokens.filter((t) => /\d/.test(t));
  if (digitTokens.length > 0) {
    const titleTokens = new Set(titleNorm.split(/\s+/));
    const anyDigitInTitle = [...titleTokens].some((t) => /\d/.test(t));
    const matched = digitTokens.some(
      (d) => titleTokens.has(d) || [...titleTokens].some((t) => t.includes(d))
    );
    if (matched) {
      score += 8;
    } else if (anyDigitInTitle) {
      score -= 6; // different model number, but same brand + type
    }
  }

  // Other product-name words (storage size, wattage...).
  for (const token of nameTokens) {
    if (token.length > 2 && titleNorm.includes(` ${token} `)) {
      score += 4;
    }
  }

  if (usedFiles.has(dedupKey(candidate.title))) {
    score -= 25; // discourage reusing the same photo, allow as last resort
  }

  return score;
}

/**
 * Picks the highest-scoring usable candidate.
 * - unusedOnly: never return a photo already assigned to another product
 * - relaxed: only require a category-anchor match (skip brand/model scoring)
 */
function bestCandidate(
  candidates: Candidate[],
  name: string,
  strategy: { primary: string; anchors: string[] },
  options: { relaxed?: boolean; unusedOnly?: boolean } = {}
): Candidate | null {
  const { relaxed = false, unusedOnly = false } = options;

  let best: Candidate | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const [rank, candidate] of candidates.entries()) {
    if (unusedOnly && usedFiles.has(dedupKey(candidate.title))) {
      continue;
    }
    const score = scoreCandidate(candidate, name, strategy, rank, relaxed);
    candidate.score = score;
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  if (!best || !Number.isFinite(bestScore) || bestScore < 0) {
    return null;
  }

  return best;
}

async function downloadImage(url: string, slug: string): Promise<string> {
  const res = await apiFetch(new URL(url));
  if (!res.ok) {
    throw new Error(`Download ${res.status}: ${url}`);
  }

  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < 5_000) {
    throw new Error(`Image too small (${bytes.length} bytes): ${url}`);
  }

  // Pick extension from actual magic bytes so served content-type is correct.
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
  const ext = isPng ? "png" : "jpg";
  const filePath = path.join(OUT_DIR, `${slug}.${ext}`);
  await writeFile(filePath, bytes);
  return `/products/${slug}.${ext}`;
}

async function pickImageForProduct(
  name: string,
  strategy: { primary: string; anchors: string[]; extra?: string[] }
): Promise<{ candidate: Candidate; queriesUsed: string }> {
  const brand = name.split(/\s+/)[0];

  const queries = [
    `${name} filetype:bitmap`,
    `${brand} ${strategy.primary} filetype:bitmap`,
    ...(strategy.extra ?? []).map((q) => `${q} filetype:bitmap`),
    `${strategy.primary} filetype:bitmap`,
  ];
  const relaxedQuery = `${strategy.primary} filetype:bitmap`;

  const tryCommons = async (
    query: string,
    opts: { relaxed?: boolean; unusedOnly?: boolean }
  ) => {
    const candidates = await searchCommons(query);
    const best = bestCandidate(candidates, name, strategy, opts);
    await sleep(API_DELAY_MS);
    return best;
  };

  // 1. Commons, strict brand/model scoring, unique photo only.
  for (const query of queries) {
    const best = await tryCommons(query, { unusedOnly: true });
    if (best) {
      return { candidate: best, queriesUsed: query };
    }
  }

  // 2. Commons, generic type query with relaxed brand matching, unique only.
  const relaxedBest = await tryCommons(relaxedQuery, {
    unusedOnly: true,
    relaxed: true,
  });
  if (relaxedBest) {
    return {
      candidate: relaxedBest,
      queriesUsed: `${relaxedQuery} [relaxed]`,
    };
  }

  // 3. Openverse (Flickr et al.): richer pool, unique photo only.
  //    Openverse ANDs all terms, so try progressively looser queries.
  for (const openverseQ of [
    name,
    `${brand} ${strategy.primary}`,
    strategy.primary,
    ...(strategy.extra ?? []),
  ]) {
    const candidates = await searchOpenverse(openverseQ);
    const best = bestCandidate(candidates, name, strategy, {
      unusedOnly: true,
    });
    await sleep(API_DELAY_MS);
    if (best) {
      return { candidate: best, queriesUsed: `openverse: ${openverseQ}` };
    }
  }

  // 4. Last resort: duplicate an existing Commons photo (better than none).
  for (const [query, opts] of [
    [queries[0], { unusedOnly: false }],
    [relaxedQuery, { unusedOnly: false, relaxed: true }],
  ] as const) {
    const best = await tryCommons(query, opts);
    if (best) {
      return { candidate: best, queriesUsed: `${query} [duplicate allowed]` };
    }
  }

  // 5. Or duplicate an Openverse photo.
  {
    const candidates = await searchOpenverse(strategy.primary);
    const best = bestCandidate(candidates, name, strategy, {});
    await sleep(API_DELAY_MS);
    if (best) {
      return {
        candidate: best,
        queriesUsed: `openverse [duplicate allowed]: ${strategy.primary}`,
      };
    }
  }

  throw new Error(`No usable image found for "${name}"`);
}

type ManifestEntry = { path: string; title: string };

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // Load existing manifest so re-runs skip already-downloaded images and
  // never reuse a Commons photo for two different products.
  const manifest: Record<string, ManifestEntry> = {};
  try {
    const raw = JSON.parse(await readFile(MANIFEST, "utf8")) as Record<
      string,
      string | ManifestEntry
    >;
    for (const [slug, value] of Object.entries(raw)) {
      if (typeof value === "string") {
        // legacy path-only format (no title -> cannot dedup, but still valid)
        manifest[slug] = { path: value, title: "" };
      } else {
        manifest[slug] = value;
      }
      if (manifest[slug].title) {
        usedFiles.add(dedupKey(manifest[slug].title));
      }
    }
  } catch {
    // first run
  }

  const jobs: Array<{ slug: string; name: string; category: string }> = [];

  for (const category of CATEGORIES) {
    for (const product of category.products) {
      const slug = slugify(product.name);
      if (manifest[slug]) {
        continue;
      }
      jobs.push({ slug, name: product.name, category: category.name });
    }
  }

  console.log(
    `Fetching images: ${jobs.length} to download, ${
      Object.keys(manifest).length
    } already done.`
  );

  const failures: Array<{ name: string; slug: string; error: string }> = [];

  // Sequential: the Commons API rate-limits anonymous bursts.
  for (const job of jobs) {
    const strategy = CATEGORY_STRATEGY[job.category.toLowerCase()] ?? {
      primary: job.category.toLowerCase(),
      anchors: [job.category.split(/\s+/)[0].toLowerCase()],
    };

    let picked = false;
    let lastError: unknown = null;

    // Up to 3 attempts: if a chosen photo fails to download, its source is
    // blocked, so mark it unusable and let the next attempt pick another one.
    for (let attempt = 0; attempt < 3 && !picked; attempt++) {
      let chosen: { candidate: Candidate; queriesUsed: string };
      try {
        chosen = await pickImageForProduct(job.name, strategy);
      } catch (error) {
        lastError = error; // search space exhausted — no point retrying
        break;
      }

      try {
        const localPath = await downloadImage(
          chosen.candidate.thumbUrl,
          job.slug
        );
        manifest[job.slug] = { path: localPath, title: chosen.candidate.title };
        usedFiles.add(dedupKey(chosen.candidate.title));
        picked = true;
        console.log(
          `  ✓ ${job.name.padEnd(45)} → ${chosen.candidate.title}  [${chosen.queriesUsed}]`
        );
        await sleep(DOWNLOAD_DELAY_MS);
      } catch (error) {
        // Source blocks downloads (hotlink protection, dead link...).
        usedFiles.add(dedupKey(chosen.candidate.title));
        lastError = error;
        console.log(
          `  ↻ download failed for "${chosen.candidate.title}", trying another...`
        );
      }
    }

    if (!picked) {
      // Safety net: reuse a sibling product's photo from the same category
      // so seeding never ends up with a product without any image.
      const sibling = CATEGORIES.find((c) => c.name === job.category)
        ?.products.map((p) => slugify(p.name))
        .find((slug) => slug !== job.slug && manifest[slug]);

      if (sibling) {
        const source = manifest[sibling];
        const ext = path.extname(source.path);
        const bytes = await readFile(path.join(OUT_DIR, `${sibling}${ext}`));
        await writeFile(path.join(OUT_DIR, `${job.slug}${ext}`), bytes);
        manifest[job.slug] = { path: `/products/${job.slug}${ext}`, title: "" };
        console.log(
          `  ↻ ${job.name.padEnd(45)} → reused ${sibling}${ext} (no unique match: ${
            lastError instanceof Error ? lastError.message : String(lastError)
          })`
        );
      } else {
        failures.push({
          name: job.name,
          slug: job.slug,
          error:
            lastError instanceof Error ? lastError.message : String(lastError),
        });
        console.log(`  ✗ ${job.name}: ${String(lastError)}`);
      }
    }

    // Persist incrementally so interrupted runs keep their progress.
    await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} product(s) failed:`);
    for (const f of failures) {
      console.error(`  - ${f.name} (${f.slug}): ${f.error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `\nDone. Manifest has ${Object.keys(manifest).length} images → ${MANIFEST}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
