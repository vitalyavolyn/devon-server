export interface Initable {
  init(args: string[]): Promise<void>;
}

export interface Importable {
  import(args: string[]): Promise<void>;
}
