/**
 * PermitPulse — Configurable Permit Scraper
 *
 * Each city portal is different. This file provides:
 *   1. A `ScraperConfig` type — define selectors for your city.
 *   2. A `checkPermitStatus()` function — drives Playwright, returns the status.
 *   3. Pre-built configs for common portal platforms (add yours below).
 *
 * HOW TO ADD A NEW CITY
 * ─────────────────────
 * 1. Inspect the city portal in your browser DevTools.
 * 2. Find the permit search form and the status text element.
 * 3. Create a `ScraperConfig` entry in CITY_CONFIGS below.
 * 4. Pass that city's config when calling `checkPermitStatus()`.
 */

import chromiumMin from "@sparticuz/chromium-min";
import { chromium, Browser, Page } from "playwright-core";

// ── Config type ───────────────────────────────────────────────────────────────

export interface ScraperConfig {
  /** Label shown in logs/errors */
  cityName: string;

  /** Full URL of the permit search page */
  portalUrl: string;

  /** CSS selector for the permit number input field */
  searchInputSelector: string;

  /** CSS selector for the submit/search button */
  searchButtonSelector: string;

  /** CSS selector for the element that contains the permit status text */
  statusSelector: string;

  /**
   * Optional: if the portal requires selecting a search type first
   * (e.g. a dropdown to choose "By Permit Number"), configure here.
   */
  preSearch?: {
    selector: string;
    value: string; // option value or visible text
  };

  /**
   * Optional: transform the raw scraped text into a normalized status.
   * Defaults to trimming whitespace.
   */
  normalizeStatus?: (raw: string) => string;

  /** How long to wait (ms) for status element after search. Default: 10000 */
  waitTimeout?: number;
}

// ── Pre-built city configs ────────────────────────────────────────────────────
// These cover the most common portal platforms.
// Replace selectors with what you find in DevTools for your specific city.

export const CITY_CONFIGS: Record<string, ScraperConfig> = {
  /**
   * Generic config — works for many "Accela" platform portals
   * (used by 1,000+ municipalities in the US).
   * Portal URL pattern: https://aca-prod.accela.com/[CITY]/Default.aspx
   */
  accela_generic: {
    cityName: "Accela Portal (Generic)",
    portalUrl: "https://aca-prod.accela.com/YOUR_CITY/Cap/CapHome.aspx?module=Building",
    searchInputSelector: "#ctl00_PlaceHolderMain_generalSearchForm_txtGSPermitNumber",
    searchButtonSelector: "#ctl00_PlaceHolderMain_btnNewSearch",
    statusSelector: ".ACA_Grid_OverFlow td:nth-child(5)", // status column
    normalizeStatus: (raw) => raw.trim().toUpperCase(),
    waitTimeout: 12000,
  },

  /**
   * Generic config for "OpenGov Permit & Licensing" portals
   * (modern SaaS platform used by many newer city implementations).
   */
  opengov_generic: {
    cityName: "OpenGov Portal (Generic)",
    portalUrl: "https://YOUR_CITY.permit.opengov.com",
    searchInputSelector: "input[placeholder*='permit number' i], input[name='search']",
    searchButtonSelector: "button[type='submit'], button:has-text('Search')",
    statusSelector: "[data-testid='permit-status'], .permit-status, .status-badge",
    normalizeStatus: (raw) => raw.trim(),
    waitTimeout: 10000,
  },

  /**
   * Generic config for "Tyler EnerGov" portals
   * (common in southeastern US municipalities).
   */
  energov_generic: {
    cityName: "EnerGov Portal (Generic)",
    portalUrl: "https://YOUR_CITY_URL/energov_prod/selfservice",
    searchInputSelector: "#PermitNumber",
    searchButtonSelector: ".btn-search, button[value='Search']",
    statusSelector: ".searchResultStatus, td.Status",
    normalizeStatus: (raw) => raw.trim(),
    waitTimeout: 10000,
  },
};

// ── Core scraping function ────────────────────────────────────────────────────

export interface ScrapeResult {
  permitNumber: string;
  status: string;
  rawText: string;
  scrapedAt: Date;
  error?: string;
}

let browser: Browser | null = null;

// Remote chromium binary for Vercel/Lambda serverless environments
const CHROMIUM_REMOTE_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar";

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.isConnected()) {
    const executablePath = await chromiumMin.executablePath(CHROMIUM_REMOTE_URL);
    browser = await chromium.launch({
      args: chromiumMin.args,
      executablePath,
      headless: chromiumMin.headless === true || chromiumMin.headless === "new" ? true : false,
    });
  }
  return browser;
}

export async function checkPermitStatus(
  permitNumber: string,
  config: ScraperConfig
): Promise<ScrapeResult> {
  const b = await getBrowser();
  const page: Page = await b.newPage();

  try {
    // Block images/fonts/media to speed up scraping
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (["image", "media", "font", "stylesheet"].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto(config.portalUrl, { waitUntil: "domcontentloaded", timeout: 20000 });

    // Pre-search step (e.g. select dropdown)
    if (config.preSearch) {
      const el = page.locator(config.preSearch.selector);
      await el.selectOption(config.preSearch.value);
    }

    // Clear and fill the permit number input
    const input = page.locator(config.searchInputSelector);
    await input.waitFor({ timeout: 8000 });
    await input.fill("");
    await input.fill(permitNumber);

    // Click search
    await page.locator(config.searchButtonSelector).click();

    // Wait for the status element to appear
    const statusEl = page.locator(config.statusSelector);
    await statusEl.waitFor({ timeout: config.waitTimeout ?? 10000 });

    const rawText = (await statusEl.textContent()) ?? "";
    const status = config.normalizeStatus
      ? config.normalizeStatus(rawText)
      : rawText.trim();

    return { permitNumber, status, rawText, scrapedAt: new Date() };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[scraper] Failed for ${permitNumber} @ ${config.cityName}: ${error}`);
    return {
      permitNumber,
      status: "ERROR",
      rawText: "",
      scrapedAt: new Date(),
      error,
    };
  } finally {
    await page.close();
  }
}

export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

// ── Batch check (used by cron job) ───────────────────────────────────────────

export async function batchCheckPermits(
  permits: Array<{
    id: string;
    permitNumber: string;
    portalUrl: string;
    scraperConfig: Record<string, unknown>;
  }>
): Promise<Map<string, ScrapeResult>> {
  const results = new Map<string, ScrapeResult>();

  for (const permit of permits) {
    // Build config: start from a base template if city matches, then
    // override with any per-permit scraper_config stored in the DB.
    const baseConfig = (permit.scraperConfig?.template as string)
      ? CITY_CONFIGS[permit.scraperConfig.template as string]
      : null;

    const config: ScraperConfig = {
      ...(baseConfig ?? CITY_CONFIGS["accela_generic"]),
      portalUrl: permit.portalUrl,
      ...(permit.scraperConfig as Partial<ScraperConfig>),
    };

    const result = await checkPermitStatus(permit.permitNumber, config);
    results.set(permit.id, result);

    // Be polite — small delay between requests to the same portal
    await new Promise((r) => setTimeout(r, 1500));
  }

  return results;
}
