"use client";

import { cn } from "@/lib/utils";

type Props = {
  content: string;
  className?: string;
  tone?: "assistant" | "user" | "system";
};

export function MarkdownMessage({
  content,
  className,
  tone = "assistant",
}: Props) {
  // Simple text formatter with basic line break support
  const formatText = (text: string) => {
    return text.split('\n').map((line, i) => (
      <span key={i}>
        {line}
        {i < text.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  return (
    <div
      className={cn(
        "min-w-0 max-w-full overflow-hidden text-[15px] leading-7 whitespace-pre-wrap break-words",
        tone === "user" && "text-primary-foreground",
        className
      )}
    >
      {formatText(content)}
    </div>
  );
}
