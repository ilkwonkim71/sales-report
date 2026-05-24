import type { ReportStatus } from "@/types"

interface Props {
  status: ReportStatus
}

const styles: Record<ReportStatus, string> = {
  complete: "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800",
  pending: "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600",
}

const labels: Record<ReportStatus, string> = {
  complete: "작성완료",
  pending: "미작성",
}

export function StatusBadge({ status }: Props) {
  return <span className={styles[status]}>{labels[status]}</span>
}
