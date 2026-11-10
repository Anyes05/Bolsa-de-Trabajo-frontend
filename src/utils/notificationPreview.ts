export type NotificationPreview = {
  id: string
  title: string
  body: string
  createdAt: string | null
  unread: boolean
}

export const NOTIFICATION_PREVIEW_LIMIT = 10

function timestamp(value: string | null): number {
  const parsed = value ? Date.parse(value) : NaN
  return Number.isNaN(parsed) ? -Infinity : parsed
}

export function recentNotifications(items: readonly NotificationPreview[]): NotificationPreview[] {
  return [...items].sort((left, right) => {
    const leftTime = timestamp(left.createdAt)
    const rightTime = timestamp(right.createdAt)
    return leftTime === rightTime ? 0 : leftTime > rightTime ? -1 : 1
  }).slice(0, NOTIFICATION_PREVIEW_LIMIT)
}
