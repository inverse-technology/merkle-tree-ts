import { LeafInputs, Leaf } from "../src";
import { poseidon, randomFieldElement } from "poseidon-h";

type Inputs = [bigint, bigint, bigint];

class TestLeaf implements LeafInputs {
  private inputs: Inputs;

  constructor(inputs: Inputs) {
    this.inputs = inputs;
  }

  hash(): Leaf {
    return poseidon(this.inputs);
  }

  zeroHash(): Leaf {
    return poseidon(this.inputs.map(() => BigInt(0)));
  }

  toInputs(): Inputs {
    return this.inputs;
  }
}

export const dummyLeaves = (n: number) => {
  return Array.from({ length: n }, () =>
    new TestLeaf([
      randomFieldElement(),
      randomFieldElement(),
      randomFieldElement(),
    ]).hash(),
  );
};
