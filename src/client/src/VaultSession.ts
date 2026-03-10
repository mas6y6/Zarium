class VaultSession {
    private static vaultKey: Uint8Array | null = null;

    static setKey(key: Uint8Array) {
        this.vaultKey = key;
    }

    static getKey(): Uint8Array | null {
        return this.vaultKey;
    }

    static clear() {
        if (this.vaultKey) {
            this.vaultKey.fill(0); // wipe memory
        }
        this.vaultKey = null;
    }
}

export default VaultSession;