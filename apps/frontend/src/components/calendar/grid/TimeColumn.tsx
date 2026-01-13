interface TimeColumnProps {
  timeBlocks: string[]
}

export function TimeColumn({ timeBlocks }: TimeColumnProps) {
  return (
    <div className="w-20 border-r bg-background">
      {timeBlocks.map((time) => (
        <div
          key={time}
          className="border-b h-12 flex items-center justify-center text-sm text-muted-foreground"
        >
          {time}
        </div>
      ))}
    </div>
  )
}