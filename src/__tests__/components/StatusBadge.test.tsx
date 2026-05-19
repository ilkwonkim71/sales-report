import { render, screen } from "@testing-library/react"
import { StatusBadge } from "@/components/StatusBadge"

describe("StatusBadge", () => {
  it('renders "작성완료" for complete status', () => {
    render(<StatusBadge status="complete" />)
    expect(screen.getByText("작성완료")).toBeInTheDocument()
  })

  it('renders "미작성" for pending status', () => {
    render(<StatusBadge status="pending" />)
    expect(screen.getByText("미작성")).toBeInTheDocument()
  })

  it("applies green styles for complete status", () => {
    render(<StatusBadge status="complete" />)
    const badge = screen.getByText("작성완료")
    expect(badge).toHaveClass("bg-green-100", "text-green-800")
  })

  it("applies gray styles for pending status", () => {
    render(<StatusBadge status="pending" />)
    const badge = screen.getByText("미작성")
    expect(badge).toHaveClass("bg-gray-100", "text-gray-600")
  })

  it("renders a span element", () => {
    render(<StatusBadge status="complete" />)
    expect(screen.getByText("작성완료").tagName).toBe("SPAN")
  })
})
