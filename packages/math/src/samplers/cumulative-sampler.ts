/**
 * CumulativeSampler (IntervalTree) — O(log n) weighted random selection.
 *
 * Efficiently selects items by binary-searching across the cumulative weight interval.
 * Uses an AVL-balanced tree to ensure O(log n) performance for both lookup and insertion.
 * Best for collections where weights are frequently updated.
 */

interface AVLNode<T> {
  value: T
  weight: number
  leftW: number // total weight of left subtree
  rightW: number // total weight of right subtree
  left: AVLNode<T> | null
  right: AVLNode<T> | null
  h: number // height
}

function nodeH<T>(n: AVLNode<T> | null): number {
  return n === null ? 0 : n.h
}

function nodeW<T>(n: AVLNode<T> | null): number {
  return n === null ? 0 : n.leftW + n.weight + n.rightW
}

function updMeta<T>(n: AVLNode<T>): void {
  n.h = 1 + Math.max(nodeH(n.left), nodeH(n.right))
  n.leftW = nodeW(n.left)
  n.rightW = nodeW(n.right)
}

function rotR<T>(y: AVLNode<T>): AVLNode<T> {
  const x = y.left!
  y.left = x.right
  x.right = y
  updMeta(y)
  updMeta(x)
  return x
}

function rotL<T>(x: AVLNode<T>): AVLNode<T> {
  const y = x.right!
  x.right = y.left
  y.left = x
  updMeta(x)
  updMeta(y)
  return y
}

function bal<T>(n: AVLNode<T>): AVLNode<T> {
  updMeta(n)
  const bf = nodeH(n.left) - nodeH(n.right)
  if (bf > 1) {
    if (nodeH(n.left!.left) < nodeH(n.left!.right)) n.left = rotL(n.left!)
    return rotR(n)
  }
  if (bf < -1) {
    if (nodeH(n.right!.right) < nodeH(n.right!.left)) n.right = rotR(n.right!)
    return rotL(n)
  }
  return n
}

function buildBal<T>(
  items: ReadonlyArray<readonly [T, number]>,
  lo: number,
  hi: number,
): AVLNode<T> | null {
  if (lo > hi) return null
  const mid = (lo + hi) >>> 1
  const left = buildBal(items, lo, mid - 1)
  const right = buildBal(items, mid + 1, hi)
  return {
    value: items[mid]![0],
    weight: items[mid]![1],
    leftW: nodeW(left),
    rightW: nodeW(right),
    left,
    right,
    h: 1 + Math.max(nodeH(left), nodeH(right)),
  }
}

function avlInsert<T>(n: AVLNode<T> | null, value: T, weight: number): AVLNode<T> {
  if (n === null) return { value, weight, leftW: 0, rightW: 0, left: null, right: null, h: 1 }
  n.right = avlInsert(n.right, value, weight)
  return bal(n)
}

export class CumulativeSampler<T> {
  private root: AVLNode<T> | null = null
  private _tw = 0
  private _sz = 0

  get totalWeight(): number {
    return this._tw
  }

  get size(): number {
    return this._sz
  }

  /**
   * Build from weighted items in O(n).
   */
  static build<T>(items: ReadonlyArray<readonly [T, number]>): CumulativeSampler<T> {
    const t = new CumulativeSampler<T>()
    if (items.length === 0) return t
    t.root = buildBal(items, 0, items.length - 1)
    t._sz = items.length
    t._tw = nodeW(t.root)
    return t
  }

  /**
   * O(log n) lookup: find value whose cumulative weight interval contains `target`.
   */
  lookup(target: number): T {
    let node = this.root
    let t = target
    while (node !== null) {
      if (t < node.leftW) {
        node = node.left
        continue
      }
      t -= node.leftW
      if (t < node.weight) return node.value
      t -= node.weight
      node = node.right
    }
    throw new Error('CumulativeSampler: target out of range')
  }

  /** O(log n) insertion with rebalancing. */
  insert(value: T, weight: number): void {
    this.root = avlInsert(this.root, value, weight)
    this._tw += weight
    this._sz++
  }

  toArray(): Array<[T, number]> {
    const out: Array<[T, number]> = []
    const walk = (n: AVLNode<T> | null): void => {
      if (!n) return
      walk(n.left)
      out.push([n.value, n.weight])
      walk(n.right)
    }
    walk(this.root)
    return out
  }
}
