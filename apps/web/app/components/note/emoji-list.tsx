import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { cn } from "#app/utils/misc.tsx"

interface EmojiItem {
    name: string
    emoji: string
    fallbackImage?: string
}

interface EmojiListProps {
    items: EmojiItem[]
    command: (item: { name: string }) => void
}

interface EmojiListRef {
    onKeyDown: (args: { event: React.KeyboardEvent }) => boolean
}

export const EmojiList = forwardRef<EmojiListRef, EmojiListProps>((props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    const selectItem = (index: number) => {
        const item = props.items[index]
        if (item) {
            props.command({ name: item.name })
        }
    }

    const upHandler = () => {
        setSelectedIndex(((selectedIndex + props.items.length) - 1) % props.items.length)
    }

    const downHandler = () => {
        setSelectedIndex((selectedIndex + 1) % props.items.length)
    }

    const enterHandler = () => {
        selectItem(selectedIndex)
    }

    useEffect(() => setSelectedIndex(0), [props.items])

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: { event: React.KeyboardEvent }) => {
            if (event.key === 'ArrowUp') {
                upHandler()
                return true
            }

            if (event.key === 'ArrowDown') {
                downHandler()
                return true
            }

            if (event.key === 'Enter') {
                enterHandler()
                return true
            }

            return false
        },
    }))

    return (
        <div className="z-[9999] min-w-[12rem] max-w-[16rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1" style={{ pointerEvents: 'auto' }}>
            {props.items.length ? (
                props.items.map((item, index) => (
                    <button
                        key={index}
                        className={cn(
                            "relative flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                            index === selectedIndex && "bg-accent text-accent-foreground"
                        )}
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            selectItem(index)
                        }}
                        onMouseDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                        }}
                    >
                        <span className="text-base">{item.emoji}</span>
                        <span className="truncate">:{item.name}:</span>
                    </button>
                ))
            ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">
                    No emojis found
                </div>
            )}
        </div>
    )
})

EmojiList.displayName = "EmojiList"