import { poseidon } from "poseidon-h";
import { Leaf, OrderedLeaf } from "./leaf";
import { Binary, MerkleProof } from "./proof";
import { chunk, toBinary, toDecimal, zip } from "./utils";

export interface MerkleTreeOptions {
  depth?: number;
}

export class MerkleTree {
  public depth: number;
  public orderedLeaves: OrderedLeaf[];

  constructor(
    leaves: Leaf[],
    inputsLength: number,
    options?: MerkleTreeOptions,
  ) {
    this.depth = options?.depth ?? Math.ceil(Math.log2(leaves.length));
    const diff = Math.pow(2, this.depth) - leaves.length;
    this.orderedLeaves = leaves.map((leaf, index) => ({
      index,
      leaf,
    }));
    for (let i = 0; i < diff; i++) {
      this.orderedLeaves.push({
        index: this.orderedLeaves.length,
        leaf: poseidon(Array.from({ length: inputsLength }, () => BigInt(0))),
      });
    }
  }

  root(): Leaf {
    let root = this.getLeaves();
    for (let i = 0; i < this.depth; i++) {
      root = chunk(root, 2).map(([a, b]) => poseidon([a, b]));
    }
    return root[0];
  }

  prove(merkleLeaf: Leaf): MerkleProof {
    const merklePath = this.merklePath(merkleLeaf);
    let leaves = this.getLeaves();
    const merkleWitness: Leaf[] = [];
    for (let i = this.depth; i > 0; i--) {
      const position = toDecimal(merklePath.slice(0, i));
      const sibilingPosition = position + (merklePath[i - 1] === "1" ? -1 : 1);
      merkleWitness.push(leaves[sibilingPosition]);
      leaves = chunk(leaves, 2).map(poseidon);
    }
    merklePath.reverse();
    return {
      merklePath,
      merkleWitness,
      merkleLeaf,
      merkleRoot: this.root(),
    };
  }

  static verify(
    merkleRoot: Leaf,
    merkleLeaf: Leaf,
    merklePath: Binary[],
    merkleWitness: Leaf[],
  ): boolean {
    return this.verifyProof({
      merklePath,
      merkleWitness,
      merkleLeaf,
      merkleRoot,
    });
  }

  static verifyProof(proof: MerkleProof): boolean {
    const { merklePath, merkleWitness, merkleLeaf, merkleRoot } = proof;
    let current = merkleLeaf;
    for (const [binary, sibling] of zip(merklePath, merkleWitness)) {
      current = poseidon(
        binary === "0" ? [current, sibling] : [sibling, current],
      );
    }
    return current === merkleRoot;
  }

  getLeaves(): Leaf[] {
    this.orderedLeaves.sort((a, b) => a.index - b.index);
    return this.orderedLeaves.map(({ leaf }) => leaf);
  }

  private merklePath(leaf: Leaf): Binary[] {
    const result = this.orderedLeaves.find(({ leaf: l }) => l === leaf);
    if (!result) {
      throw new Error("Leaf not found");
    }
    const { index } = result;
    return toBinary(index, this.depth);
  }
}
