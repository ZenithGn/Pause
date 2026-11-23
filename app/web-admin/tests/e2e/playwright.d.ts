// Local type definitions so Playwright E2E specs pass `tsc --noEmit` even before
// `@playwright/test` is installed in app/web/node_modules.
declare module "@playwright/test" {
  export interface Locator {
    click(options?: { force?: boolean }): Promise<void>;
    fill(value: string): Promise<void>;
    selectOption(value: string): Promise<string[]>;
    first(): Locator;
    last(): Locator;
    nth(index: number): Locator;
    count(): Promise<number>;
    isVisible(): Promise<boolean>;
    isDisabled(): Promise<boolean>;
    textContent(): Promise<string | null>;
    getAttribute(name: string): Promise<string | null>;
    locator(selector: string): Locator;
    getByRole(role: string, options?: { name?: string | RegExp; exact?: boolean }): Locator;
    getByLabel(text: string | RegExp): Locator;
    getByText(text: string | RegExp, options?: { exact?: boolean }): Locator;
    getByPlaceholder(text: string | RegExp): Locator;
    waitFor(options?: { state?: "attached" | "detached" | "visible" | "hidden"; timeout?: number }): Promise<void>;
  }

  export interface APIResponse {
    status(): number;
    ok(): boolean;
    headers(): Record<string, string>;
    text(): Promise<string>;
    json(): Promise<unknown>;
  }

  export interface APIRequestContext {
    get(url: string, options?: { headers?: Record<string, string> }): Promise<APIResponse>;
    post(url: string, options?: { data?: unknown; headers?: Record<string, string> }): Promise<APIResponse>;
  }

  export interface Page {
    readonly request: APIRequestContext;
    goto(url: string, options?: { waitUntil?: "load" | "domcontentloaded" | "networkidle" }): Promise<unknown>;
    url(): string;
    title(): Promise<string>;
    waitForURL(url: string | RegExp, options?: { timeout?: number }): Promise<void>;
    reload(options?: { waitUntil?: "load" | "domcontentloaded" | "networkidle" }): Promise<unknown>;
    locator(selector: string): Locator;
    getByRole(role: string, options?: { name?: string | RegExp; exact?: boolean }): Locator;
    getByLabel(text: string | RegExp): Locator;
    getByText(text: string | RegExp, options?: { exact?: boolean }): Locator;
    getByPlaceholder(text: string | RegExp): Locator;
    getByTestId(testId: string): Locator;
  }

  export interface TestFixtures {
    page: Page;
    request: APIRequestContext;
  }

  export interface TestType {
    (title: string, testFn: (fixtures: TestFixtures) => Promise<void>): void;
    describe(title: string, fn: () => void): void;
    beforeEach(fn: (fixtures: TestFixtures) => Promise<void>): void;
    skip(condition: boolean, reason?: string): void;
  }

  export interface ExpectAssertion<T> {
    toBe(expected: T): Promise<void> | void;
    toEqual(expected: T): Promise<void> | void;
    toContain(expected: string): Promise<void> | void;
    toMatch(expected: RegExp | string): Promise<void> | void;
    toBeGreaterThan(expected: number): Promise<void> | void;
    toHaveURL(expected: string | RegExp): Promise<void> | void;
    toHaveTitle(expected: string | RegExp): Promise<void> | void;
    toBeVisible(options?: { timeout?: number }): Promise<void>;
    toBeHidden(options?: { timeout?: number }): Promise<void>;
    toBeDisabled(): Promise<void>;
    toBeEnabled(): Promise<void>;
    toHaveCount(count: number): Promise<void>;
    toHaveAttribute(name: string, value: string | RegExp): Promise<void>;
    toHaveText(expected: string | RegExp): Promise<void>;
    toContainText(expected: string | RegExp): Promise<void>;
    not: ExpectAssertion<T>;
  }

  export const test: TestType;
  export function expect<T>(actual: T): ExpectAssertion<T>;

  export interface PlaywrightProject {
    name: string;
    use?: Record<string, unknown>;
  }

  export interface PlaywrightTestConfig {
    testDir?: string;
    fullyParallel?: boolean;
    forbidOnly?: boolean;
    retries?: number;
    workers?: number;
    reporter?: string | Array<[string, Record<string, unknown>?]>;
    use?: Record<string, unknown>;
    projects?: PlaywrightProject[];
    webServer?: {
      command: string;
      url: string;
      reuseExistingServer?: boolean;
      timeout?: number;
    };
  }

  export function defineConfig(config: PlaywrightTestConfig): PlaywrightTestConfig;
  export const devices: Record<string, Record<string, unknown>>;
}
