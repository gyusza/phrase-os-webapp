import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Option {
  value: string
  label: string
}

interface MultiSelectProps {
  options: Option[]
  maxSelections?: number
  defaultValue?: string[]
  id?: string
}

export function MultiSelect({ options, maxSelections = Infinity, defaultValue = [], id }: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedValues, setSelectedValues] = React.useState<string[]>(defaultValue)

  const handleSelect = (value: string) => {
    if (selectedValues.includes(value)) {
      setSelectedValues(selectedValues.filter((v) => v !== value))
    } else if (selectedValues.length < maxSelections) {
      setSelectedValues([...selectedValues, value])
    }
  }

  const isSelected = (value: string) => selectedValues.includes(value)
  const isDisabled = (value: string) => !isSelected(value) && selectedValues.length >= maxSelections

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-controls={id ? `${id}-content` : undefined}
          className="w-full justify-between"
        >
          <span className="truncate">
            {selectedValues.length > 0
              ? options
                  .filter((option) => selectedValues.includes(option.value))
                  .map((option) => option.label)
                  .join(", ")
              : "Select options..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" id={id ? `${id}-content` : undefined}>
        <Command>
          <CommandInput placeholder="Search options..." />
          <CommandEmpty>No options found.</CommandEmpty>
          <CommandGroup>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                onSelect={() => handleSelect(option.value)}
                disabled={isDisabled(option.value)}
                className={cn(
                  "flex items-center gap-2",
                  isSelected(option.value) && "bg-primary/10",
                )}
              >
                <Check
                  className={cn(
                    "h-4 w-4",
                    isSelected(option.value) ? "opacity-100" : "opacity-0"
                  )}
                />
                {option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}