import { request } from './http'

export const catalogService = {
  getSectors() {
    return request<string[]>('/sectors')
  },
}
