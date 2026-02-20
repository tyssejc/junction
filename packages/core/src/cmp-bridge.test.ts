import { beforeEach, describe, expect, it, vi } from "vitest";
import { type CmpBridgeConfig, createCmpBridge } from "./cmp-bridge.js";

describe("CMP Bridge", () => {
  let mockCollector: { consent: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockCollector = { consent: vi.fn() };
  });

  function makeConfig<T>(overrides?: Partial<CmpBridgeConfig<T>>): CmpBridgeConfig<T> {
    return {
      collector: mockCollector,
      readState: vi.fn(() => null) as any,
      subscribe: vi.fn(() => vi.fn()) as any,
      mapState: vi.fn((_state: T) => ({ analytics: true })) as any,
      ...overrides,
    };
  }

  it("calls collector.consent() immediately when readState() returns a value", () => {
    const config = makeConfig<string>({
      readState: () => "some-state",
      mapState: () => ({ analytics: true, marketing: false }),
    });

    createCmpBridge(config);

    expect(mockCollector.consent).toHaveBeenCalledOnce();
    expect(mockCollector.consent).toHaveBeenCalledWith({ analytics: true, marketing: false });
  });

  it("does NOT call collector.consent() when readState() returns null", () => {
    const config = makeConfig<string>({
      readState: () => null,
    });

    createCmpBridge(config);

    expect(mockCollector.consent).not.toHaveBeenCalled();
  });

  it("does NOT call collector.consent() when readState() returns undefined", () => {
    const config = makeConfig<string>({
      readState: () => undefined,
    });

    createCmpBridge(config);

    expect(mockCollector.consent).not.toHaveBeenCalled();
  });

  it("calls collector.consent() when subscribe callback fires", () => {
    let subscribeCb: (() => void) | undefined;

    const config = makeConfig<string>({
      readState: vi
        .fn()
        .mockReturnValueOnce(null) // initial read — CMP not loaded
        .mockReturnValueOnce("updated-state") as any, // read triggered by subscribe callback
      subscribe: (cb) => {
        subscribeCb = cb;
        return vi.fn();
      },
      mapState: () => ({ analytics: true }),
    });

    createCmpBridge(config);
    expect(mockCollector.consent).not.toHaveBeenCalled();

    // Simulate CMP state change
    subscribeCb!();

    expect(mockCollector.consent).toHaveBeenCalledOnce();
    expect(mockCollector.consent).toHaveBeenCalledWith({ analytics: true });
  });

  it("destroy() calls the unsubscribe function", () => {
    const unsubscribe = vi.fn();
    const config = makeConfig<string>({
      subscribe: () => unsubscribe,
    });

    const bridge = createCmpBridge(config);
    expect(unsubscribe).not.toHaveBeenCalled();

    bridge.destroy();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("sync() re-reads and pushes updated state", () => {
    let currentState: string | null = "initial";

    const config = makeConfig<string>({
      readState: () => currentState,
      mapState: (s) => (s === "initial" ? { analytics: false } : { analytics: true }),
    });

    const bridge = createCmpBridge(config);
    expect(mockCollector.consent).toHaveBeenCalledWith({ analytics: false });

    currentState = "updated";
    bridge.sync();

    expect(mockCollector.consent).toHaveBeenCalledTimes(2);
    expect(mockCollector.consent).toHaveBeenLastCalledWith({ analytics: true });
  });

  it("debug mode logs to console", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const config = makeConfig<string>({
      readState: () => "some-state",
      mapState: () => ({ analytics: true }),
      debug: true,
    });

    createCmpBridge(config);

    expect(consoleSpy).toHaveBeenCalledWith("[Junction:CmpBridge] Syncing consent state:", { analytics: true });

    consoleSpy.mockRestore();
  });

  it("debug mode logs pending message when readState returns null", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const config = makeConfig<string>({
      readState: () => null,
      debug: true,
    });

    createCmpBridge(config);

    expect(consoleSpy).toHaveBeenCalledWith("[Junction:CmpBridge] CMP state not available yet, staying pending");

    consoleSpy.mockRestore();
  });
});
