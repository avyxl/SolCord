declare global {
    type React = typeof import("react");

    // ReactNative/Hermes globals
    var globalEvalWithSourceUrl: (script: string, sourceURL: string) => any;
    var nativePerformanceNow: typeof performance.now;
    var nativeModuleProxy: Record<string, any>;
    /** True in bundles built with --test for the emulator workflow */
    var __SOLCORD_TEST__: boolean;
    var __SOLCORD_BUNDLED_SEQUENCE__: number;
    /** The branch this build is published to, which the update check reads: --builds-branch, builds-mobile by default */
    var __BUILDS_BRANCH__: string;
    var __turboModuleProxy: (name: string) => any;

    interface Window {
        [key: string]: any;
        vendetta: any;
        bunny: typeof import("@lib");
    }
}

export { };
