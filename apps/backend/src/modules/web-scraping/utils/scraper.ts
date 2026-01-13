import puppeteer, { Browser, Page } from 'puppeteer';

interface ScrapedContent {
  url: string;
  title: string;
  text: string;
}

// Singleton para manejar una única instancia del navegador
class BrowserManager {
  private static instance: BrowserManager | null = null;
  private static browser: Browser | null = null;
  private static activeUsers = 0;

  private constructor() {}

  static async getInstance(): Promise<BrowserManager> {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager();
    }
    return BrowserManager.instance;
  }

  async getBrowser(): Promise<Browser> {
    if (!BrowserManager.browser) {
      BrowserManager.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
      });
    }
    BrowserManager.activeUsers++;
    return BrowserManager.browser;
  }

  async releaseBrowser(): Promise<void> {
    BrowserManager.activeUsers--;
    if (BrowserManager.activeUsers === 0 && BrowserManager.browser) {
      await BrowserManager.browser.close();
      BrowserManager.browser = null;
    }
  }
}

class ScrapingSession {
  private browser: Browser | null = null;
  private visitedUrls: Set<string> = new Set();
  private allRoutes: string[] = [];
  private baseUrl: string;
  private exactDomain: string;
  private readonly MAX_CONCURRENT = 5;
  private readonly TIMEOUT = 10000;
  private activeCrawls = 0;
  private urlQueue: string[] = [];
  private pagePool: Array<Page & { inUse?: boolean }> = [];

  constructor(private startUrl: string) {
    const url = new URL(startUrl);
    this.baseUrl = url.origin;
    this.exactDomain = url.hostname;
  }

  private async initialize(): Promise<void> {
    // Obtener el navegador compartido
    const browserManager = await BrowserManager.getInstance();
    this.browser = await browserManager.getBrowser();

    // Obtener links iniciales y agregarlos a las rutas y cola
    const initialLinks = await this.getInitialLinks();
    
    // Agregar la URL inicial normalizada
    const startUrlNormalized = this.normalizeUrl(this.startUrl);
    if (startUrlNormalized) {
      this.visitedUrls.add(startUrlNormalized);
      this.allRoutes.push(startUrlNormalized);
      this.urlQueue.push(this.startUrl);
    }
    
    // Agregar links iniciales a las rutas y la cola
    initialLinks.forEach(link => {
      const normalizedLink = this.normalizeUrl(link);
      if (normalizedLink && !this.visitedUrls.has(normalizedLink)) {
        this.visitedUrls.add(normalizedLink);
        this.allRoutes.push(normalizedLink);
        this.urlQueue.push(link);
      }
    });

    const neededPages = Math.min(this.urlQueue.length, this.MAX_CONCURRENT);
    
    // Inicializar pool solo con las páginas necesarias
    for (let i = 0; i < neededPages; i++) {
      this.pagePool.push(await this.initPage());
    }
  }

  private async getInitialLinks(): Promise<string[]> {
    // Crear una página temporal para el escaneo inicial
    const tempPage = await this.initPage();
    try {
      await Promise.race([
        tempPage.goto(this.startUrl, { waitUntil: 'domcontentloaded' }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), this.TIMEOUT)
        ),
      ]);

      const links = await this.extractLinks(tempPage);
      return links;
    } catch (error) {
      return [];
    } finally {
      await tempPage.close();
    }
  }

  private async cleanup(): Promise<void> {
    // Limpiar recursos de esta sesión
    for (const page of this.pagePool) {
      await page.close();
    }
    this.pagePool = [];

    // Liberar el navegador compartido
    const browserManager = await BrowserManager.getInstance();
    await browserManager.releaseBrowser();
  }

  private async initPage(): Promise<Page> {
    if (!this.browser) throw new Error('Browser not initialized');
    
    const page = await this.browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (['image', 'stylesheet', 'font', 'script'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });
    return page;
  }

  private getPage(): (Page & { inUse?: boolean }) | null {
    return this.pagePool.find((page) => !page.inUse) || null;
  }

  private normalizeUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      if (urlObj.hash || urlObj.search) return null;
      const normalized = urlObj.origin + urlObj.pathname.replace(/\/$/, '');
      const pathSegments = urlObj.pathname.split('/').filter(Boolean);
      return pathSegments.length <= 1 && !pathSegments[0]?.includes('.')
        ? normalized
        : null;
    } catch {
      return null;
    }
  }

  private async extractLinks(page: Page): Promise<string[]> {
    const links = await page.evaluate(
      ({ domain }) =>
        Array.from(document.querySelectorAll('a[href]'))
          .map((link) => (link as HTMLAnchorElement).href)
          .filter((href) => {
            try {
              const url = new URL(href);
              return url.hostname === domain;
            } catch {
              return false;
            }
          }),
      { domain: this.exactDomain }
    );

    // Filtrar y normalizar URLs fuera del evaluate para mejor control
    const uniqueLinks = new Set<string>();
    
    for (const link of links) {
      const normalizedUrl = this.normalizeUrl(link);
      if (normalizedUrl) {
        uniqueLinks.add(normalizedUrl);
      }
    }

    return Array.from(uniqueLinks);
  }

  private async processUrl(url: string): Promise<void> {
    const normalizedUrl = this.normalizeUrl(url);
    if (!normalizedUrl || this.visitedUrls.has(normalizedUrl)) {
      this.activeCrawls--;
      this.processQueue();
      return;
    }

    this.visitedUrls.add(normalizedUrl);
    this.allRoutes.push(normalizedUrl);

    const page = this.getPage();
    if (!page) {
      this.urlQueue.push(url); // Usamos la URL original para la cola
      this.activeCrawls--;
      this.processQueue();
      return;
    }

    page.inUse = true;

    try {
      await Promise.race([
        page.goto(url, { waitUntil: 'domcontentloaded' }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), this.TIMEOUT)
        ),
      ]);

      const links = await this.extractLinks(page);

      for (const link of links) {
        const normalizedLink = this.normalizeUrl(link);
        if (normalizedLink && !this.visitedUrls.has(normalizedLink)) {
          this.urlQueue.push(link); // Usamos la URL original para la cola
        }
      }
    } catch (error) {
      // Error al explorar URL
    }

    page.inUse = false;
    this.activeCrawls--;
    this.processQueue();
  }

  private processQueue(): void {
    while (
      this.activeCrawls < this.MAX_CONCURRENT &&
      this.urlQueue.length > 0 &&
      this.getPage()
    ) {
      const url = this.urlQueue.shift();
      if (url) {
        this.activeCrawls++;
        this.processUrl(url);
      }
    }
  }

  async start(): Promise<string[]> {
    try {
      await this.initialize();
      this.processQueue();

      // Esperar a que terminen todos los crawls
      while (this.activeCrawls > 0 || this.urlQueue.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      return this.allRoutes;
    } finally {
      await this.cleanup();
    }
  }
}

export async function getAllRoutes(startUrl: string): Promise<string[]> {
  const session = new ScrapingSession(startUrl);
  return await session.start();
}

export async function scrapeUrl(url: string): Promise<ScrapedContent | null> {
  // Usar el navegador compartido
  const browserManager = await BrowserManager.getInstance();
  const browser = await browserManager.getBrowser();

  const page = await browser.newPage();
  await page.setRequestInterception(true);

  page.on('request', (request) => {
    const resourceType = request.resourceType();
    if (['image', 'stylesheet', 'font', 'script'].includes(resourceType)) {
      request.abort();
    } else {
      request.continue();
    }
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const content = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      text: document.body.innerText,
    }));

    return content;
  } catch (error) {
    return null;
  } finally {
    await page.close();
    await browserManager.releaseBrowser();
  }
} 