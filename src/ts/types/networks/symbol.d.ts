// Symbol types from symbol-sdk

export type SymbolGetPublicKey = {
    path: string | number[],
    showOnTrezor?: boolean,
};

export type SymbolPublicKey = {
    publicKey: string,
    path: number[],
    serializedPath: string,
};
