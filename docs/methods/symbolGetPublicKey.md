## Symbol: Get Public Key
Ask device for public key at given path.

ES6
```javascript
const result = await TrezorConnect.symbolGetPublicKey(params);
```

CommonJS
```javascript
TrezorConnect.symbolGetPublicKey(params).then(function(result) {

});
```

### Params
[****Optional common params****](commonParams.md)
#### Exporting single public key
* `path` — *obligatory* `string | Array<number>` minimum length is `5`. [read more](path.md)
* `showOnTrezor` — *optional* `boolean` determines if key will be displayed on device. Default is set to `true`

#### Exporting bundle of public keys
- `bundle` - `Array` of Objects with `path` and `showOnTrezor` fields

### Example
Retrieve public key of third symbol account:
```javascript
TrezorConnect.symbolGetPublicKey({
    path: "m/44'/43'/2'/0'/0'"
});
```
Return a bundle of Symbol public keys without displaying them on device:
```javascript
TrezorConnect.symbolGetPublicKey({
    bundle: [
        { path: "m/44'/43'/0'/0'/0'", showOnTrezor: false }, // account 1
        { path: "m/44'/43'/1'/0'/0'", showOnTrezor: false }, // account 2
        { path: "m/44'/43'/2'/0'/0'", showOnTrezor: false }  // account 3
    ]
});
```

### Result
Result with only one public key
```javascript
{
    success: true,
    payload: {
        public_key: string,
    }
}
```
Result with bundle of public keys
```javascript
{
    success: true,
    payload: [
        { public_key: string }, // account 1
        { public_key: string }, // account 2
        { public_key: string }, // account 3
    ]
}
```
Error
```javascript
{
    success: false,
    payload: {
        error: string // error message
    }
}
```