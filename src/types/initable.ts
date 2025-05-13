export interface Initable {
  init(args: string[]): Promise<void>;
}
