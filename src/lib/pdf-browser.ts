import type { Browser } from "puppeteer-core";

const PDF_BROWSER_ARGS = ["--no-sandbox", "--disable-setuid-sandbox"];

function isServerlessRuntime(): boolean {
  return Boolean(
    process.env.NETLIFY ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.AWS_EXECUTION_ENV ||
      process.env.AWS_LAMBDA_JS_RUNTIME ||
      process.env.LAMBDA_TASK_ROOT,
  );
}

function configureNetlifyLambdaRuntime(): void {
  if (!process.env.NETLIFY || process.env.AWS_LAMBDA_JS_RUNTIME) {
    return;
  }

  const nodeMajor = Number.parseInt(process.versions.node.split(".")[0] ?? "20", 10);
  process.env.AWS_LAMBDA_JS_RUNTIME =
    nodeMajor >= 20 ? "nodejs20.x" : `nodejs${nodeMajor}.x`;
}

async function launchPdfBrowser(): Promise<Browser> {
  if (isServerlessRuntime()) {
    configureNetlifyLambdaRuntime();

    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteer = await import("puppeteer-core");
    chromium.setGraphicsMode = false;

    return puppeteer.launch({
      args: puppeteer.defaultArgs({
        args: chromium.args,
        headless: "shell",
      }),
      defaultViewport: {
        deviceScaleFactor: 1,
        hasTouch: false,
        height: 1080,
        isLandscape: true,
        isMobile: false,
        width: 1920,
      },
      executablePath: await chromium.executablePath(),
      headless: "shell",
    });
  }

  const puppeteer = await import("puppeteer");

  return puppeteer.default.launch({
    headless: true,
    args: PDF_BROWSER_ARGS,
  });
}

let sharedBrowserPromise: Promise<Browser> | null = null;

/**
 * Returns a shared Puppeteer browser instance, launching one only if none is
 * cached yet or the cached one died. Callers must close the `page` they open,
 * never the browser itself — it stays alive across requests.
 */
export async function getPdfBrowser(): Promise<Browser> {
  if (sharedBrowserPromise) {
    const browser = await sharedBrowserPromise;
    if (browser.isConnected()) return browser;
    sharedBrowserPromise = null;
  }

  sharedBrowserPromise = launchPdfBrowser().catch((error) => {
    sharedBrowserPromise = null;
    throw error;
  });

  return sharedBrowserPromise;
}
