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

  constructor(value: number, bitDefs: T) {
    this._value = value & 0xffffffff;
    const bitsObj = {} as BitFieldBits<T>;

    for (const def of bitDefs) {
      if (def.msb < def.lsb || def.msb > 31 || def.lsb < 0) {
        throw new Error(`Invalid bit range for ${def.name}`);
      }

      const bitLength = def.msb - def.lsb + 1;
      const mask = bitLength === 32 ? 0xffffffff : ((1 << bitLength) - 1) << def.lsb;

      Object.defineProperty(bitsObj, def.name, {
        enumerable: true,
        get: () => (this._value & mask) >>> def.lsb,
        set: (newValue: number) => {
          const valueMask = (1 << bitLength) - 1;
          const maskedValue = (newValue & valueMask) << def.lsb;
          this._value = ((this._value & ~mask) | maskedValue) & 0xffffffff;
        },
      });
    }

    this.bits = bitsObj;
  }

  get word(): number {
    return this._value;
  }
}

class TableBitDef<T extends readonly (readonly BitDefinition<string>[])[]> {
  public readonly words: {
    [I in keyof T]: BitField<T[I]>;
  };

  constructor(data: number[], bitDefs: T) {
    if (data.length !== bitDefs.length) {
      throw new Error('Data and bitDefs must have the same length');
    }
    this.words = data.map((value, index) => new BitField(value, bitDefs[index])) as {
      [I in keyof T]: BitField<T[I]>;
    };
  }
}

// 使用例
const bitDefs = [
  [
    { name: 'hoge01', msb: 1, lsb: 0 },
    { name: 'hoge02', msb: 4, lsb: 4 },
  ],
  [
    { name: 'hoge11', msb: 3, lsb: 0 },
    { name: 'hoge12', msb: 8, lsb: 6 },
  ],
  [{ name: 'hoge21', msb: 31, lsb: 0 }],
  [
    { name: 'hoge31', msb: 1, lsb: 0 },
    { name: 'hoge32', msb: 3, lsb: 2 },
    { name: 'hoge33', msb: 9, lsb: 8 },
    { name: 'hoge34', msb: 15, lsb: 10 },
  ],
] as const;

const data = [0x00000012, 0x000001c7, 0x10000001, 0x00000f3c];

const tbl = new TableBitDef(data, bitDefs);

// ワード値確認
for (let i = 0; i < bitDefs.length; i++) {
  console.log(tbl.words[i].word.toString(16).padStart(8, '0'));
}

// 読み取り
console.log(tbl.words[0].bits.hoge01);
console.log(tbl.words[0].bits.hoge02);

// 書き込み
tbl.words[0].bits.hoge01 = 3;
console.log(tbl.words[0].bits.hoge01); // 3

// ワード値確認
for (let i = 0; i < bitDefs.length; i++) {
  console.log(tbl.words[i].word.toString(16).padStart(8, '0'));
}
