export interface FmField {
  valueType: string
  value: string
  typeId: string
}

export type Open = 'Y' | 'N'

export interface ContactFields {
  name: string
  lastName: string
  assignedById: number
  open: Open
  typeId: string
  sourceId: string
  post: string
  fm: FmField[]
}

export interface CompanyFields {
  title: string
  assignedById: number
  open: Open
  typeId: string
  sourceId: string
  fm: FmField[]
}

export interface CrmItemAddResult {
  item: {
    id: number
  }
}
