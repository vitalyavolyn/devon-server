export interface Initable {
  init(args: string[]): Promise<void>;
}

export interface Importable {
  import(args: string[]): Promise<void>;
}

export interface ApiCompatibleIntegration {
  // TODO: i hate generics
  getRange(start: Date, end: Date): Promise<any[]>;
}
