"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BarChart2, Send, Loader2 } from "lucide-react";

interface EodTabsClientProps {
  activeTab: string;
  isSuperAdmin: boolean;
}

export function EodTabsClient({ activeTab, isSuperAdmin }: EodTabsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [clickedTab, setClickedTab] = useState<string | null>(null);

  const [prevActiveTab, setPrevActiveTab] = useState(activeTab);

  if (activeTab !== prevActiveTab) {
    setPrevActiveTab(activeTab);
    setClickedTab(null);
  }

  const handleTabChange = (tab: string) => {
    if (tab === activeTab || isPending) return;
    setClickedTab(tab);
    
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  return (
    <div className="flex bg-card text-card-foreground border-border dark:bg-zinc-950 p-1 rounded-xl h-[48px] items-center">
      <button
        onClick={() => handleTabChange('review')}
        disabled={isPending}
        className={`px-4 h-full rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
          activeTab === 'review' ? 'bg-foreground text-background shadow' : 'text-zinc-900 dark:text-zinc-100 hover:text-zinc-900 dark:text-zinc-100'
        } ${isPending ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        {isPending && clickedTab === 'review' ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart2 className="w-4 h-4" />}
        Review EOD
      </button>
      {!isSuperAdmin && (
        <button
          onClick={() => handleTabChange('submit')}
          disabled={isPending}
          className={`px-4 h-full rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'submit' ? 'bg-foreground text-background shadow' : 'text-zinc-900 dark:text-zinc-100 hover:text-zinc-900 dark:text-zinc-100'
          } ${isPending ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isPending && clickedTab === 'submit' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Submit EOD
        </button>
      )}
    </div>
  );
}
