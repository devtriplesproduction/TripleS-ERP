import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EodCard } from '@/components/eod/EodCard';

describe('EodCard completed tasks and logged hours row spacing & alignment', () => {
  const baseEod = {
    id: 'eod-1',
    employee_id: 'emp-1',
    report_date: '2026-10-26',
    tasks_accomplished: 'Task 1\nTask 2\nTask 3',
    office_hours: 8.5,
    location: 'OFFICE',
    status: 'Approved',
    profiles: {
      first_name: 'John',
      last_name: 'Doe',
      department: 'Engineering',
    },
  };

  it('renders completed tasks and logged hours in fixed-width columns with separator', () => {
    const html = renderToStaticMarkup(<EodCard eod={baseEod as any} />);

    // Check task count and logged hours are rendered
    expect(html).toContain('3 completed');
    expect(html).toContain('8h 30m logged');

    // Verify fixed-width column classes to prevent text shifts across rows
    expect(html).toContain('w-[120px] sm:w-[125px]');
    expect(html).toContain('w-[125px] sm:w-[135px]');
    expect(html).toContain('shrink-0');

    // Verify separator element exists between the two groups
    expect(html).toContain('w-px h-4 bg-border');

    // Verify equal horizontal spacing (gap-2) inside both icon-text groups
    expect(html).toContain('flex items-center gap-2 text-sm text-muted-foreground w-[120px] sm:w-[125px]');
    expect(html).toContain('flex items-center gap-2 text-sm text-muted-foreground w-[125px] sm:w-[135px]');

    // Verify vertical centering classes
    expect(html).toContain('items-center');
  });

  it('consistently formats varying task counts (3, 7, 18) and logged hours (8h, 8h 30m, 6h 30m) across rows', () => {
    const eod1 = { ...baseEod, id: 'eod-1', tasks_accomplished: '1\n2\n3', office_hours: 8.5 };
    const eod2 = { ...baseEod, id: 'eod-2', tasks_accomplished: '1\n2\n3', office_hours: 8.0 };
    const eod3 = {
      ...baseEod,
      id: 'eod-3',
      tasks_accomplished: Array.from({ length: 18 }, (_, i) => `Task ${i + 1}`).join('\n'),
      office_hours: 6.5,
    };
    const eod4 = {
      ...baseEod,
      id: 'eod-4',
      tasks_accomplished: Array.from({ length: 7 }, (_, i) => `Task ${i + 1}`).join('\n'),
      office_hours: 8.0,
    };

    const html1 = renderToStaticMarkup(<EodCard eod={eod1 as any} />);
    const html2 = renderToStaticMarkup(<EodCard eod={eod2 as any} />);
    const html3 = renderToStaticMarkup(<EodCard eod={eod3 as any} />);
    const html4 = renderToStaticMarkup(<EodCard eod={eod4 as any} />);

    // Row 1
    expect(html1).toContain('3 completed');
    expect(html1).toContain('8h 30m logged');

    // Row 2
    expect(html2).toContain('3 completed');
    expect(html2).toContain('8h logged');

    // Row 3 (18 tasks, 6h 30m)
    expect(html3).toContain('18 completed');
    expect(html3).toContain('6h 30m logged');

    // Row 4 (7 tasks, 8h)
    expect(html4).toContain('7 completed');
    expect(html4).toContain('8h logged');

    // All rows share the same column wrappers and separator classes
    [html1, html2, html3, html4].forEach((html) => {
      expect(html).toContain('w-[120px] sm:w-[125px]');
      expect(html).toContain('w-[125px] sm:w-[135px]');
      expect(html).toContain('w-px h-4 bg-border');
    });
  });
});
