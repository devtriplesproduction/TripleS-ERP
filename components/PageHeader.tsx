import React, { ReactNode } from "react";
import {
  LucideIcon,
  LayoutDashboard,
  Users,
  Settings,
  FileText,
  ClipboardList,
  Building,
  Briefcase,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string | ReactNode;
  subtitle?: string | ReactNode;
  icon?: LucideIcon;
  iconClassName?: string;
  actions?: ReactNode;
  className?: string;
}

function getPageHeaderIcon(title: string | ReactNode, PropIcon?: LucideIcon): LucideIcon {
  if (PropIcon) return PropIcon;
  if (typeof title === 'string') {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('dashboard')) return LayoutDashboard;
    if (lowerTitle.includes('employee') || lowerTitle.includes('user') || lowerTitle.includes('onboard')) return Users;
    if (lowerTitle.includes('setting')) return Settings;
    if (lowerTitle.includes('report') || lowerTitle.includes('document')) return FileText;
    if (lowerTitle.includes('task') || lowerTitle.includes('eod') || lowerTitle.includes('submission')) return ClipboardList;
    if (lowerTitle.includes('company') || lowerTitle.includes('organization')) return Building;
    if (lowerTitle.includes('project') || lowerTitle.includes('job')) return Briefcase;
  }
  return Star;
}

function renderPageHeaderIcon(title: string | ReactNode, icon: LucideIcon | undefined, iconClassName: string) {
  return React.createElement(getPageHeaderIcon(title, icon), {
    className: cn("w-6 h-6 sm:w-7 sm:h-7", iconClassName),
  });
}

export function PageHeader({
  title,
  subtitle,
  icon: PropIcon,
  iconClassName = "text-primary",
  actions,
  className
}: PageHeaderProps) {

  const renderTitle = () => {
    if (typeof title === 'string') {
      const words = title.split(' ');
      if (words.length > 1) {
        return (
          <>
            {words[0]}{' '}
            <span>{words[1]}</span>
            {words.length > 2 && ' ' + words.slice(2).join(' ')}
          </>
        );
      }
    }
    return title;
  };

  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full", className)}>
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 shadow-sm">
          {renderPageHeaderIcon(title, PropIcon, iconClassName)}
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
            {renderTitle()}
          </h1>
          {subtitle && (
            <p className="text-sm sm:text-base text-muted-foreground mt-0.5 font-medium">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto flex-shrink-0 mt-2 sm:mt-0">
          {actions}
        </div>
      )}
    </div>
  );
}
