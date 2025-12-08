
import * as loader from "@assemblyscript/loader";

interface WasmExports {
    getSecretKey(): number; // Returns pointer to string
}

let wasmModule: any = null;

export const loadWasmModule = async (): Promise<any> => {
    if (wasmModule) return wasmModule;

    try {
        const response = await fetch("/wasm/secure.wasm");
        if (!response.ok) {
            throw new Error(`Failed to load WASM: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();

        // Instantiate using the loader to get string management utilities (__getString)
        // @ts-ignore - Loader type mismatch workaround
        const module = await (loader as any).instantiate(arrayBuffer, {});

        wasmModule = module.exports;
        return wasmModule!;
    } catch (error) {
        console.error("WASM Load Error:", error);
        throw error;
    }
};

export const getSecureKeyFromWasm = async (): Promise<string> => {
    const wasm = await loadWasmModule();
    const keyPtr = wasm.getSecretKey();
    // __getString is provided by the loader to read string from memory pointer
    return wasm.__getString(keyPtr);
};
