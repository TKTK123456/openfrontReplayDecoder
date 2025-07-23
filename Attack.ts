import { PseudoRandom } from "./PseudoRandom";

type PlayerID = string;
type TileID = number;

interface MapState {
  ownerMap: Map<TileID, PlayerID | null>;
  neighborMap: Map<TileID, TileID[]>;
  terrainMap?: Map<TileID, "Plains" | "Highland" | "Mountain">;
}

export class ReplayAttackExecutor {
  private toConquer: [TileID, number][] = [];
  private seen = new Set<TileID>();
  private rng: PseudoRandom;

  constructor(
    private map: MapState,
    private sourceTile: TileID,
    private ownerID: PlayerID,
    private targetID: PlayerID | null,
    private troopCount: number,
    seed = 123
  ) {
    this.rng = new PseudoRandom(seed);
  }

  /**
   * Returns list of tiles conquered in order of interaction
   */
  public simulate(): TileID[] {
    const result: TileID[] = [];

    this.addNeighbors(this.sourceTile);

    while (this.toConquer.length > 0 && this.troopCount > 0) {
      this.toConquer.sort((a, b) => a[1] - b[1]);
      const [tile] = this.toConquer.shift()!;
      if (this.seen.has(tile)) continue;

      const owner = this.map.ownerMap.get(tile);
      if (owner !== this.targetID) continue;

      const isBorderedByOwner = this.map.neighborMap
        .get(tile)!
        .some((n) => this.map.ownerMap.get(n) === this.ownerID);
      if (!isBorderedByOwner) continue;

      // conquer it
      this.map.ownerMap.set(tile, this.ownerID);
      this.troopCount -= 1; // fake 1 troop cost
      result.push(tile);
      this.seen.add(tile);
      this.addNeighbors(tile);
    }

    return result;
  }

  private addNeighbors(tile: TileID) {
    const neighbors = this.map.neighborMap.get(tile) ?? [];
    for (const n of neighbors) {
      if (this.seen.has(n)) continue;
      if (this.map.ownerMap.get(n) !== this.targetID) continue;

      const ownedByMe = this.map.neighborMap
        .get(n)!
        .filter((adj) => this.map.ownerMap.get(adj) === this.ownerID).length;

      const terrain =
        this.map.terrainMap?.get(n) ?? "Plains";

      let mag = 1;
      if (terrain === "Highland") mag = 1.5;
      if (terrain === "Mountain") mag = 2;

      const priority =
        (this.rng.nextInt(0, 7) + 10) * (1 - ownedByMe * 0.5 + mag / 2);

      this.toConquer.push([n, priority]);
    }
  }
}
