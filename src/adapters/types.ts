export interface Adapter<T extends AdapterSession> {
  openSession: () => T | Promise<T>
  closeSession: (session: T) => void | Promise<void>
}

export interface AdapterSession {
  translateText: (texts: string[]) => Promise<string[]>
}
