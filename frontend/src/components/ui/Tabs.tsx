"use client";

import type { ReactNode } from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

interface Tab {
  value: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultValue?: string;
  className?: string;
}

function Tabs({ tabs, defaultValue, className }: TabsProps) {
  return (
    <TabsPrimitive.Root
      defaultValue={defaultValue || tabs[0]?.value}
      className={cn("w-full", className)}
    >
      <TabsPrimitive.List className="inline-flex w-full gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1 backdrop-blur-xl">
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "relative flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200",
              "text-gray-500 hover:text-gray-300",
              "data-[state=active]:text-white"
            )}
          >
            {tab.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {tabs.map((tab) => (
        <TabsPrimitive.Content
          key={tab.value}
          value={tab.value}
          className="mt-4 focus-visible:outline-hidden"
        >
          {tab.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}

export { Tabs };
export type { Tab, TabsProps };
