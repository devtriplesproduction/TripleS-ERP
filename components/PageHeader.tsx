import React, { ReactNode } from "react";
import {
  LucideIcon,
  LayoutDashboard,
  Users,
  UserPlus,
  Settings,
  FileText,
  ClipboardList,
  Building2,
  Briefcase,
  Star,
  Clock,
  Calendar,
  CalendarDays,
  CalendarCheck2,
  CreditCard,
  Megaphone,
  FolderKanban,
  CheckSquare,
  ListTodo,
  BookOpen,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string | ReactNode;
  subtitle?: string | ReactNode;
  icon?: LucideIcon;
  iconClassName?: string;
  containerClassName?: string;
  actions?: ReactNode;
  className?: string;
}

export function getPageHeaderIcon(title: string | ReactNode, PropIcon?: LucideIcon): LucideIcon {
  if (PropIcon) return PropIcon;
  if (typeof title === 'string') {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('dashboard')) return LayoutDashboard;
    if (lowerTitle.includes('time') || lowerTitle.includes('track') || lowerTitle.includes('clock') || lowerTitle.includes('activity')) return Clock;
    if (lowerTitle.includes('onboard') || lowerTitle.includes('create employee')) return UserPlus;
    if (lowerTitle.includes('employee') || lowerTitle.includes('user') || lowerTitle.includes('staff')) return Users;
    if (lowerTitle.includes('setting')) return Settings;
    if (lowerTitle.includes('quick task')) return CheckSquare;
    if (lowerTitle.includes('my task')) return ListTodo;
    if (lowerTitle.includes('tasks board') || lowerTitle.includes('task')) return CheckSquare;
    if (lowerTitle.includes('eod') || lowerTitle.includes('submission')) return ClipboardList;
    if (lowerTitle.includes('report') || lowerTitle.includes('document')) return FileText;
    if (lowerTitle.includes('announcement') || lowerTitle.includes('notice')) return Megaphone;
    if (lowerTitle.includes('rulebook') || lowerTitle.includes('policy')) return BookOpen;
    if (lowerTitle.includes('note')) return StickyNote;
    if (lowerTitle.includes('holiday')) return CalendarDays;
    if (lowerTitle.includes('attendance')) return CalendarCheck2;
    if (lowerTitle.includes('leave')) return Calendar;
    if (lowerTitle.includes('payroll') || lowerTitle.includes('salary')) return CreditCard;
    if (lowerTitle.includes('project') || lowerTitle.includes('job')) return FolderKanban;
    if (lowerTitle.includes('company') || lowerTitle.includes('organization') || lowerTitle.includes('client')) return Building2;
  }
  return Star;
}

export function PageHeader({
  title,
  subtitle,
  icon: PropIcon,
  iconClassName = "text-foreground",
  containerClassName,
  actions,
  className
}: PageHeaderProps) {
  const IconComponent = getPageHeaderIcon(title, PropIcon);

  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 w-full min-w-0 select-none", className)}>
      <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
        <div
          suppressHydrationWarning
          className={cn(
            "w-14 h-14 rounded-2xl bg-card border border-border flex items-center justify-center shrink-0 shadow-xs",
            containerClassName
          )}
        >
          <IconComponent className={cn("w-5 h-5 text-foreground stroke-[1.75]", iconClassName)} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight truncate font-sans">
            {title}
          </h1>
          {subtitle && (
            <div className="text-xs sm:text-sm text-muted-foreground font-normal mt-0.5 line-clamp-2 sm:line-clamp-none">
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto shrink-0 mt-1 sm:mt-0">
          {actions}
        </div>
      )}
    </div>
  );
}
