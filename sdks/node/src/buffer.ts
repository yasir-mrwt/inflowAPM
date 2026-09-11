export class BoundedBuffer<T> {
  readonly #items: Array<T | undefined>;
  #head = 0;
  #length = 0;

  constructor(readonly capacity: number) {
    this.#items = new Array<T | undefined>(capacity);
  }

  get size(): number {
    return this.#length;
  }

  push(item: T): boolean {
    if (this.#length === this.capacity) return false;
    const tail = (this.#head + this.#length) % this.capacity;
    this.#items[tail] = item;
    this.#length += 1;
    return true;
  }

  peek(): T | undefined {
    if (this.#length === 0) return undefined;
    return this.#items[this.#head];
  }

  shift(): T | undefined {
    if (this.#length === 0) return undefined;
    const item = this.#items[this.#head];
    this.#items[this.#head] = undefined;
    this.#head = (this.#head + 1) % this.capacity;
    this.#length -= 1;
    return item;
  }

  clear(): number {
    const removed = this.#length;
    this.#items.fill(undefined);
    this.#head = 0;
    this.#length = 0;
    return removed;
  }
}
