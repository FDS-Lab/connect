/* @flow */

import AbstractMethod from './AbstractMethod';
import { validateParams, validateCoinPath, getFirmwareRange } from './helpers/paramsValidator';
import { validatePath, getLabel, getSerializedPath } from '../../utils/pathUtils';
import { getBitcoinNetwork, fixCoinInfoNetwork } from '../../data/CoinInfo';
import { NO_COIN_INFO } from '../../constants/errors';
import { uniqBy } from 'lodash';

import * as UI from '../../constants/ui';
import { UiMessage } from '../../message/builder';

import type { Address } from '../../types/trezor';
import type { CoreMessage, UiPromiseResponse, BitcoinNetworkInfo } from '../../types';

type Batch = {
    path: Array<number>,
    address: ?string,
    coinInfo: BitcoinNetworkInfo,
    showOnTrezor: boolean,
}

type Params = Array<Batch>;

export default class GetAddress extends AbstractMethod {
    confirmed: boolean = false;
    params: Params;
    progress: number = 0;

    constructor(message: CoreMessage) {
        super(message);

        this.requiredPermissions = ['read'];

        // create a bundle with only one batch if bundle doesn't exists
        const payload: Object = !message.payload.hasOwnProperty('bundle') ? { ...message.payload, bundle: [ ...message.payload ] } : message.payload;

        // validate bundle type
        validateParams(payload, [
            { name: 'bundle', type: 'array' },
            { name: 'useEventListener', type: 'boolean' },
        ]);

        const bundle = [];
        payload.bundle.forEach(batch => {
            // validate incoming parameters for each batch
            validateParams(batch, [
                { name: 'path', obligatory: true },
                { name: 'coin', type: 'string' },
                { name: 'address', type: 'string' },
                { name: 'showOnTrezor', type: 'boolean' },
            ]);

            const path: Array<number> = validatePath(batch.path, 3);
            let coinInfo: ?BitcoinNetworkInfo;
            if (batch.coin) {
                coinInfo = getBitcoinNetwork(batch.coin);
            }

            if (coinInfo && !batch.crossChain) {
                validateCoinPath(coinInfo, path);
            } else if (!coinInfo) {
                coinInfo = getBitcoinNetwork(path);
            }

            let showOnTrezor: boolean = true;
            if (batch.hasOwnProperty('showOnTrezor')) {
                showOnTrezor = batch.showOnTrezor;
            }

            if (!coinInfo) {
                throw NO_COIN_INFO;
            } else if (coinInfo) {
                // set required firmware from coinInfo support
                this.firmwareRange = getFirmwareRange(this.name, coinInfo, this.firmwareRange);
            }

            // fix coinInfo network values (segwit/legacy)
            coinInfo = fixCoinInfoNetwork(coinInfo, path);

            bundle.push({
                path,
                address: batch.address,
                coinInfo,
                showOnTrezor,
            });
        });

        const useEventListener = payload.useEventListener && payload.bundle.length === 1 && typeof payload.bundle[0].address === 'string' && payload.bundle[0].showOnTrezor;
        this.confirmed = useEventListener;
        this.useUi = !useEventListener;

        // set info
        if (bundle.length === 1) {
            this.info = getLabel('Export #NETWORK address', bundle[0].coinInfo);
        } else {
            const requestedNetworks: Array<?BitcoinNetworkInfo> = bundle.map(b => b.coinInfo);
            const uniqNetworks = uniqBy(requestedNetworks, (ci) => { return ci ? ci.shortcut : null; });
            if (uniqNetworks.length === 1 && uniqNetworks[0]) {
                this.info = getLabel('Export multiple #NETWORK addresses', uniqNetworks[0]);
            } else {
                this.info = 'Export multiple addresses';
            }
        }

        this.params = bundle;
    }

    getButtonRequestData(code: string) {
        if (code === 'ButtonRequest_Address') {
            const data = {
                type: 'address',
                serializedPath: getSerializedPath(this.params[this.progress].path),
                address: this.params[this.progress].address || 'not-set',
            };
            return data;
        }
        return null;
    }

    async confirmation(): Promise<boolean> {
        if (this.confirmed) return true;
        // wait for popup window
        await this.getPopupPromise().promise;
        // initialize user response promise
        const uiPromise = this.createUiPromise(UI.RECEIVE_CONFIRMATION, this.device);

        const label: string = this.info;
        // request confirmation view
        this.postMessage(new UiMessage(UI.REQUEST_CONFIRMATION, {
            view: 'export-address',
            label,
        }));

        // wait for user action
        const uiResp: UiPromiseResponse = await uiPromise.promise;
        const resp: string = uiResp.payload;

        this.confirmed = (resp === 'true');
        return this.confirmed;
    }

    async run(): Promise<Address | Array<Address>> {
        const responses: Array<Address> = [];
        const bundledResponse = this.params.length > 1;

        for (let i = 0; i < this.params.length; i++) {
            const batch = this.params[i];
            // silently get address and compare with requested address
            // or display as default inside popup
            if (batch.showOnTrezor) {
                const silent = await this.device.getCommands().getAddress(
                    batch.path,
                    batch.coinInfo,
                    false
                );
                if (typeof batch.address === 'string') {
                    if (batch.address !== silent.address) {
                        throw new Error('Addresses do not match');
                    }
                } else {
                    batch.address = silent.address;
                }
            }

            const response = await this.device.getCommands().getAddress(
                batch.path,
                batch.coinInfo,
                batch.showOnTrezor
            );
            responses.push(response);

            if (bundledResponse) {
                // send progress
                this.postMessage(new UiMessage(UI.BUNDLE_PROGRESS, {
                    progress: i,
                    response,
                }));
            }

            this.progress++;
        }
        return bundledResponse ? responses : responses[0];
    }
}
