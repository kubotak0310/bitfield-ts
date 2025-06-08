// 型安全なTypeScriptビットフィールドクラス（isReadOnlyオプション対応・静的型安全）

type BitDefinition<Name extends string> = {
  name: Name;
  msb: number;
  lsb: number;
};

type BitDefinitions = readonly BitDefinition<string>[];

type BitFieldBits<T extends BitDefinitions> = {
  [K in T[number] as K['name']]: number;
};

class BitField<T extends BitDefinitions> {
  private _value: number;
  public bits: BitFieldBits<T>;

  constructor(value: number, bitDefs: T, isReadOnly: boolean = true) {
    this._value = value & 0xffffffff;
    const bitsObj = {} as BitFieldBits<T>;

    for (const def of bitDefs) {
      if (def.msb < def.lsb || def.msb > 31 || def.lsb < 0) {
        throw new Error(`Invalid bit range for ${def.name}`);
      }

      const bitLength = def.msb - def.lsb + 1;
      const mask = ((1 << bitLength) - 1) << def.lsb;

      const descriptor: PropertyDescriptor = {
        enumerable: true,
        get: () => (this._value & mask) >>> def.lsb,
      };

      if (!isReadOnly) {
        descriptor.set = (newValue: number) => {
          const maskedValue = (newValue & ((1 << bitLength) - 1)) << def.lsb;
          this._value = (this._value & ~mask) | maskedValue;
        };
      }

      Object.defineProperty(bitsObj, def.name, descriptor);
    }

    this.bits = bitsObj;
  }

  // オプション: 現在の32bit値を取得
  get word(): number {
    return this._value;
  }
}

// --- 使用例 ---

// as constをつけないと型チェックが効かないことに注意
const bitDef = [
  { name: 'hoge1', msb: 1, lsb: 0 },
  { name: 'hoge2', msb: 7, lsb: 4 },
] as const;

// デフォルト（読み取り専用）
const readOnlyField = new BitField(0x23, bitDef);
// OK: 存在するフィールドへのアクセス
console.log(readOnlyField.bits.hoge1); // 1
// NG: 存在しないフィールドへのアクセス（コンパイルエラー）
console.log(readOnlyField.bits.hoge2); // Property 'hoge3' does not exist

// 書き込み可能
// const writeField = new BitField(0x21, bitDef, false);
// writeField.bits.hoge2 = 0xA;
// console.log(writeField.bits.hoge2); // 10

// // 現在値の確認
// console.log(writeField.word.toString(16)); // 0xA1
