'use client'

import React from 'react'
import { Zap, Award } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import {
  getInitials,
  getRankColor,
  type TopContributorData,
  type LeaderboardEntry,
} from '@/lib/utils/top-contributor'

interface TopContributorCardProps {
  data: TopContributorData
  className?: string
}

export function TopContributorCard({ data, className }: TopContributorCardProps) {
  const { topContributor, leaderboard, period } = data
  const hasContributors = Boolean(topContributor && leaderboard.length > 0)
  // Display strictly the top 3 contributors matching the reference design
  const displayLeaderboard = leaderboard.slice(0, 3)

  return (
    <div
      data-slot="top-contributor-card"
      title={period?.monthName ? `Contributions for ${period.monthName}` : undefined}
      className={cn(
        'w-full max-w-[340px] sm:w-[340px] rounded-2xl sm:rounded-3xl border border-border bg-card p-5 text-card-foreground shadow-xs transition-all duration-200 shrink-0',
        className
      )}
    >
      {/* 1. Header: Lightning Icon + Single-line 'Top Contributor' heading */}
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-5 w-5 text-foreground stroke-[2.2] shrink-0" />
        <h3 className="text-base sm:text-lg font-semibold tracking-tight text-foreground whitespace-nowrap">
          Top Contributor
        </h3>
      </div>

      {hasContributors && topContributor ? (
        <>
          {/* 2. Highlighted Top Contributor Box */}
          <div
            className={cn(
              'rounded-2xl border border-border bg-secondary/40 dark:bg-secondary/30 p-5',
              'flex flex-col items-center justify-center text-center relative overflow-hidden shadow-xs'
            )}
          >
            {/* Center Avatar with monochrome ring */}
            <div className="relative p-0.5 rounded-full ring-2 ring-foreground/20 dark:ring-foreground/30 ring-offset-2 ring-offset-card shadow-xs">
              <Avatar className="size-16">
                {topContributor.avatarUrl && (
                  <AvatarImage
                    src={topContributor.avatarUrl}
                    alt={topContributor.name}
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="bg-secondary text-foreground font-bold text-base sm:text-lg">
                  {getInitials(topContributor.name)}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Contributor Name */}
            <h4
              className="text-base font-bold text-foreground mt-3 tracking-tight truncate max-w-full px-2"
              title={`${topContributor.name} • ${topContributor.formattedHours} (${topContributor.detailedHours})`}
            >
              {topContributor.name}
            </h4>

            {/* Approved Hours */}
            <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-0.5">
              Hours: <span className="font-semibold text-foreground">{topContributor.formattedHours}</span>
            </p>
          </div>

          {/* 3. Leaderboard Section: Top 3 only */}
          <div className="mt-5">
            <h5 className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase mb-3 px-1">
              LEADERBOARD (HOURS)
            </h5>

            <ul className="space-y-2.5" role="list">
              {displayLeaderboard.map((item: LeaderboardEntry) => (
                <li
                  key={item.employeeId}
                  className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg transition-colors hover:bg-muted/50 group"
                  title={`${item.name} • ${item.formattedHours} (${item.detailedHours})`}
                >
                  {/* Left: Rank + Name */}
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span className={cn('w-6 shrink-0 text-sm tabular-nums', getRankColor(item.rank))}>
                      #{item.rank}
                    </span>
                    <span className="font-medium text-foreground truncate text-sm">
                      {item.name}
                    </span>
                  </div>

                  {/* Right: Formatted Hours */}
                  <span className="shrink-0 text-sm font-semibold text-foreground tabular-nums text-right ml-2">
                    {item.formattedHours}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-border/70 p-6 flex flex-col items-center justify-center text-center my-2 space-y-3">
          <div className="size-12 rounded-full bg-secondary/80 flex items-center justify-center text-foreground">
            <Award className="size-6 stroke-[1.8]" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">No Approved Hours Yet</p>
            <p className="text-xs text-muted-foreground max-w-[220px]">
              Approved EOD reports for {period.monthName} will appear here.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
