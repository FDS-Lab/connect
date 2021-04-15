// NEM2 types from symbol-sdk

export type NEM2GetPublicKey = {
    path: string | number[],
    showOnTrezor?: boolean,
};

export type NEM2PublicKey = {
    publicKey: string,
    path: number[],
    serializedPath: string,
};
