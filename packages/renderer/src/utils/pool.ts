/**
 * Generic high-performance ObjectPool for reusing memory allocations (e.g. vectors, bounds, matrices).
 * Eliminates garbage collection churn during rendering loops.
 */
export class ObjectPool<T> {
  private readonly pool: T[] = [];

  constructor(
    private readonly creator: () => T,
    private readonly resetter?: (obj: T) => void,
    private readonly maxCapacity: number = 1000
  ) {}

  /**
   * Acquires a recycled object from the pool, or creates a new one if the pool is empty.
   */
  public acquire(): T {
    const obj = this.pool.pop();
    if (obj !== undefined) {
      return obj;
    }
    return this.creator();
  }

  /**
   * Releases an object back to the pool to be recycled.
   */
  public release(obj: T): void {
    if (this.pool.length >= this.maxCapacity) {
      return; // Pool capacity exceeded, let GC clean it up
    }
    if (this.resetter) {
      this.resetter(obj);
    }
    this.pool.push(obj);
  }

  /**
   * Clears the entire pool.
   */
  public clear(): void {
    this.pool.length = 0;
  }

  /**
   * Retrieves the current size of the pool.
   */
  public get size(): number {
    return this.pool.length;
  }
}
