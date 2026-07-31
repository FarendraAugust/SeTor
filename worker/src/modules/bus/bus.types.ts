export interface BusEvent {
  type: string
  data: unknown
  source: string
  timestamp: number
}

export type BusHandler = (event: BusEvent) => void | Promise<void>
