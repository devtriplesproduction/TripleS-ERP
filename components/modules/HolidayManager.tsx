"use client";

import { useState, useMemo } from "react";
import { Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Trash2, Edit2, LayoutList, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createHolidayAction, updateHolidayAction, deleteHolidayAction } from "@/actions/holiday.actions";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { getISTDateString } from "@/lib/utils/time";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface Holiday {
  id: string;
  date: string;
  name: string;
  is_optional: boolean;
  holiday_type?: 'PAID' | 'UNPAID';
  created_at?: string;
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.substring(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function HolidayManager({ initialHolidays, isAdmin }: { initialHolidays: Holiday[], isAdmin: boolean }) {
  const [holidays, setHolidays] = useState<Holiday[]>(initialHolidays);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [view, setView] = useState<"list" | "grid">("grid");
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [isOptional, setIsOptional] = useState<boolean>(false);
  const [holidayType, setHolidayType] = useState<"PAID" | "UNPAID">("PAID");

  const months = useMemo(() => {
    const m = Array.from({ length: 12 }, (_, i) => ({
      month: i,
      abbr: new Date(currentYear, i).toLocaleString("default", { month: "short" }).toUpperCase(),
      name: new Date(currentYear, i).toLocaleString("default", { month: "long" }),
      holidays: [] as Holiday[],
    }));
    holidays.forEach(h => {
      const d = parseLocalDate(h.date);
      if (d.getFullYear() === currentYear) m[d.getMonth()].holidays.push(h);
    });
    m.forEach(mo => mo.holidays.sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()));
    return m.filter(mo => mo.holidays.length > 0);
  }, [holidays, currentYear]);

  const totalHolidays = holidays.filter(h => parseLocalDate(h.date).getFullYear() === currentYear).length;

  const handleOpenNew = () => { setEditingId(null); setName(""); setDate(undefined); setIsOptional(false); setHolidayType("PAID"); setIsOpen(true); };
  const handleOpenEdit = (h: Holiday) => { setEditingId(h.id); setName(h.name); setDate(parseLocalDate(h.date)); setIsOptional(h.is_optional || false); setHolidayType(h.holiday_type || "PAID"); setIsOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) { toast.error("Please enter a holiday name."); return; }
    if (!date) { toast.error("Please select a holiday date."); return; }
    if (isNaN(date.getTime())) { toast.error("Please select a valid holiday date."); return; }
    setIsSubmitting(true);
    const payload = { name, date: getISTDateString(date), is_optional: isOptional, holiday_type: "PAID" };
    try {
      if (editingId) {
        const res = await updateHolidayAction(editingId, payload);
        if (res.success && res.data) { toast.success("The holiday details have been updated."); setHolidays(prev => prev.map(h => h.id === editingId ? res.data : h)); setIsOpen(false); }
        else toast.error(res.error || "Failed to update");
      } else {
        const res = await createHolidayAction(payload);
        if (res.success && res.data) { toast.success("The holiday has been added successfully."); setHolidays(prev => [...prev, res.data]); setIsOpen(false); }
        else toast.error(res.error || "Failed to add");
      }
    } catch { toast.error("An error occurred."); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await deleteHolidayAction(id);
      if (res.success) { toast.success("The holiday has been removed."); setHolidays(prev => prev.filter(h => h.id !== id)); }
      else toast.error(res.error || "Failed to delete");
    } catch { toast.error("An error occurred"); }
  };

  const emptyState = (
    <div className="flex flex-col items-center justify-center text-center py-24 bg-card rounded-2xl ring-1 ring-border">
      <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
        <CalendarIcon className="w-8 h-8 text-primary opacity-80" />
      </div>
      <h3 className="text-lg font-bold text-foreground">No holidays for {currentYear}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">No public holidays have been added yet.</p>
      {isAdmin && (
        <Button onClick={handleOpenNew} variant="default" className="mt-5 h-10 rounded-xl gap-2 px-4">
          <Plus className="w-4 h-4" /> Add First Holiday
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Holiday <span className="text-primary">Calendar</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalHolidays} public {totalHolidays === 1 ? "holiday" : "holidays"} in {currentYear}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-card rounded-xl ring-1 ring-border p-1">
            <Button variant="ghost" size="icon" onClick={() => setCurrentYear(y => y - 1)} className="h-8 w-8 rounded-lg">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 font-bold text-base w-16 text-center">{currentYear}</span>
            <Button variant="ghost" size="icon" onClick={() => setCurrentYear(y => y + 1)} className="h-8 w-8 rounded-lg">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center bg-card rounded-xl ring-1 ring-border p-1 gap-0.5">
            <button
              onClick={() => setView("list")}
              className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                view === "list" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
              title="List view"
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("grid")}
              className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                view === "grid" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          {isAdmin && (
            <Button onClick={handleOpenNew} variant="default" className="h-10 rounded-xl gap-2 px-4">
              <Plus className="w-4 h-4" /> Add Holiday
            </Button>
          )}
        </div>
      </div>

      {view === "list" && (
        months.length > 0 ? (
          <div className="bg-card rounded-2xl ring-1 ring-border overflow-hidden">
            {months.map(({ month, abbr, name, holidays }, idx) => (
              <div key={month} className={idx < months.length - 1 ? "border-b border-border" : ""}>
                <div className="flex items-stretch min-h-[72px]">
                  <div className="w-24 sm:w-32 flex-shrink-0 flex flex-col items-center justify-center border-r border-border bg-muted/30 py-4 gap-0.5">
                    <span className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">{abbr}</span>
                    <span className="text-xs text-muted-foreground/60 font-medium">
                      {holidays.length} {holidays.length === 1 ? "day" : "days"}
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col divide-y divide-border/50">
                    {holidays.map(h => {
                      const d = parseLocalDate(h.date);
                      return (
                        <div key={h.id} className="group flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-extrabold text-primary">{d.getDate()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{h.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-muted-foreground">
                                {d.toLocaleString("default", { weekday: "long" })}, {name} {d.getDate()}
                              </p>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                                Paid Holiday
                              </span>
                            </div>
                          </div>
                          {isAdmin && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => handleOpenEdit(h)}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <ConfirmModal title="Delete Holiday" description="Are you sure you want to delete this holiday?" onConfirm={() => handleDelete(h.id)} confirmText="Delete" variant="destructive">
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </ConfirmModal>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : emptyState
      )}

      {view === "grid" && (
        months.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {months.map(({ month, abbr, name, holidays }) => (
              <div key={month} className="rounded-2xl ring-1 ring-border bg-card overflow-hidden flex flex-col">
                <div className="px-5 py-4 flex justify-between items-center border-b border-border">
                  <p className="text-base font-bold text-foreground">{name}</p>
                  <span className="text-xs font-semibold bg-primary/10 text-primary rounded-full px-2.5 py-0.5">
                    {holidays.length} {holidays.length === 1 ? "day" : "days"}
                  </span>
                </div>
                <div className="p-3 flex flex-col gap-1 flex-1">
                  {holidays.map(h => {
                    const d = parseLocalDate(h.date);
                    return (
                      <div key={h.id} className="group flex items-center gap-3 px-2.5 py-2.5 rounded-xl hover:bg-muted/40 transition-colors">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex flex-col items-center justify-center">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-primary/70 leading-none">
                            {d.toLocaleString("default", { weekday: "short" })}
                          </span>
                          <span className="text-base font-extrabold text-primary leading-tight">{d.getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{h.name}</p>
                          <p className="text-[11px] text-muted-foreground">Paid Holiday</p>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => handleOpenEdit(h)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <ConfirmModal title="Delete Holiday" description="Are you sure you want to delete this holiday?" onConfirm={() => handleDelete(h.id)} confirmText="Delete" variant="destructive">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </ConfirmModal>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : emptyState
      )}

      <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isSubmitting) setIsOpen(false); }}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-[24px] shadow-2xl border-0 bg-background">
          <div className="bg-muted/30 p-6 border-b border-border">
            <DialogHeader>
              <div className="flex items-center gap-3.5">
                <div className="h-11 w-11 bg-primary rounded-2xl flex items-center justify-center shadow-md shadow-primary/20 rotate-3">
                  <CalendarIcon className="w-5 h-5 text-primary-foreground -rotate-3" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-foreground">
                    {editingId ? "Edit Holiday" : "Add Holiday"}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    {editingId ? "Update the details below." : "Add a new public holiday."}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-semibold ml-1">Holiday Name</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="E.g., New Year's Day"
                className="bg-muted/30 border-transparent focus:bg-background focus:border-primary focus-visible:ring-primary/20 py-6 px-4 rounded-xl text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold ml-1">Date</Label>
              <DatePicker 
                value={date} 
                onChange={(d) => setDate(d ? new Date(d) : undefined)} 
                className="bg-muted/30 border-transparent focus-visible:bg-background focus-visible:border-primary focus-visible:ring-primary/20 h-[52px] px-4 rounded-xl text-sm"
                iconLeft={true}
                showChevron={true}
                placeholder="Select Date"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="h-11 px-5 rounded-xl">
                Cancel
              </Button>
              <Button type="submit" variant="default" disabled={isSubmitting} className="h-11 px-7 rounded-xl shadow-md shadow-primary/20">
                {isSubmitting ? "Saving…" : editingId ? "Save Changes" : "Add Holiday"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
