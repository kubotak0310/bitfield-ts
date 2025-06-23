type BitDefinition<Name extends string> = {
  name: Name;
  msb: number;
  lsb: number;
};

type BitDefinitions = readonly BitDefinition<string>[];

// 簡潔な型定義に変更
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
      // 32ビットマスクの明示的対応
      const mask = bitLength === 32 ? 0xffffffff : ((1 << bitLength) - 1) << def.lsb;

      const descriptor: PropertyDescriptor = {
        enumerable: true,
        get: () => (this._value & mask) >>> def.lsb,
      };

      if (!isReadOnly) {
        descriptor.set = (newValue: number) => {
          const valueMask = (1 << bitLength) - 1;
          const maskedValue = (newValue & valueMask) << def.lsb;
          // 更新時に32ビット範囲を明示的にマスク
          this._value = ((this._value & ~mask) | maskedValue) & 0xffffffff;
        };
      }

      Object.defineProperty(bitsObj, def.name, descriptor);
    }

    this.bits = bitsObj;
  }

  get word(): number {
    return this._value;
  }
}

// --- 使用例 ---
const bitDef = [{ name: 'hoge1', msb: 31, lsb: 0 }] as const;

// 読み取り専用
const readOnlyField = new BitField(0x23, bitDef);
console.log(readOnlyField.bits.hoge1); // 35 (0x23)

// 書き込み可能
const writeField = new BitField(0x21, bitDef, false);
writeField.bits.hoge1 = 0xa; // フィールド名を修正
console.log(writeField.bits.hoge1); // 10
console.log(writeField.word.toString(16)); // 'a' (0xA)
