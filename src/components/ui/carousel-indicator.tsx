export function CarouselIndicator({
  isActive,
  onClick,
}: {
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      className={`h-2 w-4 rounded-full transition-all ${
        isActive ? "bg-black" : "bg-gray-300"
      }`}
      onClick={onClick}
    />
  )
}