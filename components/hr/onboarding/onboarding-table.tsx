'use client'

import { useState } from 'react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { DatePicker } from '@/components/ui/date-picker'
import { ChevronLeft, ChevronRight, Trash2, Search, Filter, Loader2, Eye, Calendar, Building2, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'

import { Employee } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'
import { deleteEmployee, deleteEmployeesBulk } from '@/lib/actions/onboarding'
import { useToast } from '@/hooks/use-toast'

export function OnboardingTable({ employees }: { employees: Employee[] }) {
  const supabase = createClient()
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [jobTitleFilter, setJobTitleFilter] = useState('')
  const [joiningDateFilter, setJoiningDateFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const uniqueDepartments = Array.from(new Set(employees.map(e => e.department))).filter(Boolean)
  const uniqueJobTitles = Array.from(new Set(employees.map(e => e.job_title))).filter(Boolean)

  const filteredEmployees = employees.filter(emp => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch = 
        emp.first_name?.toLowerCase().includes(query) ||
        emp.last_name?.toLowerCase().includes(query) ||
        emp.email?.toLowerCase().includes(query) ||
        emp.department?.toLowerCase().includes(query)
      if (!matchesSearch) return false
    }
    if (departmentFilter && emp.department !== departmentFilter) return false
    if (jobTitleFilter && emp.job_title !== jobTitleFilter) return false
    if (joiningDateFilter && emp.joining_date !== joiningDateFilter) return false
    return true
  })

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage)
  const currentEmployees = filteredEmployees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleDelete = async (id: string) => {
    setIsDeleting(true)
    try {
      await deleteEmployee(id)
      toast({ title: 'Deleted', description: 'Employee has been deleted.' })
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }



  return (
    <div className="space-y-4">
      {/* Filters Toolbar */}
      <div className="flex flex-col lg:flex-row flex-wrap items-start lg:items-center gap-2.5 sm:gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3 flex-1 w-full">
          <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input 
            placeholder="Search by name, email, department..." 
            className="w-full bg-input/50 border-border pl-9 h-10 text-sm"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
        </div>
        
        <Select value={departmentFilter} onValueChange={(val) => { setDepartmentFilter(val ?? ""); setCurrentPage(1); }}>
          <SelectTrigger className="w-full h-10 bg-input/50 border-border text-sm shrink-0">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            {uniqueDepartments.map(dept => (
              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={jobTitleFilter} onValueChange={(val) => { setJobTitleFilter(val ?? ""); setCurrentPage(1); }}>
          <SelectTrigger className="w-full h-10 bg-input/50 border-border text-sm shrink-0">
            <SelectValue placeholder="All Job Titles" />
          </SelectTrigger>
          <SelectContent>
            {uniqueJobTitles.map(title => (
              <SelectItem key={title} value={title}>{title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

          <div className="w-full">
          <DatePicker
            value={joiningDateFilter}
            onChange={(val) => { setJoiningDateFilter(val); setCurrentPage(1); }}
            placeholder="Joining Date"
            iconLeft={true}
            showChevron={true}
            className="w-full h-10 bg-input/50 border-border text-sm shrink-0"
          />
          </div>

          <Button 
            variant="outline" 
            className="w-full h-10 text-sm shrink-0 bg-secondary hover:bg-accent border-border text-muted-foreground hover:text-foreground"
            onClick={() => {
              setSearchQuery('')
              setDepartmentFilter('')
              setJobTitleFilter('')
              setJoiningDateFilter('')
            }}
          >
            Clear Filters
          </Button>
        </div>

        <div className="lg:ml-auto w-full lg:w-auto flex justify-end">
        </div>
      </div>

      {/* Content Container */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="bg-transparent hover:bg-transparent">
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground font-medium">Employee Name</TableHead>
                <TableHead className="text-muted-foreground font-medium">Department</TableHead>
                <TableHead className="text-muted-foreground font-medium">Job Title</TableHead>
                <TableHead className="text-muted-foreground font-medium">Joining Date ↕</TableHead>
                <TableHead className="text-right text-muted-foreground font-medium pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                    No onboarding records found.
                  </TableCell>
                </TableRow>
              ) : (
                currentEmployees.map((emp, index) => (
                  <TableRow key={emp.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <Link href={`/hr/onboarding/${emp.id}`} className="flex items-center gap-3 hover:bg-muted/50 p-1 -m-1 rounded-lg transition-colors cursor-pointer group">
                        <div className="w-10 h-10 rounded-full bg-input text-foreground flex items-center justify-center text-xs font-bold border border-border overflow-hidden shrink-0 group-hover:border-foreground/50 transition-colors">
                          {emp.profile_photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={supabase.storage.from('employee-documents').getPublicUrl(emp.profile_photo).data.publicUrl} 
                              alt={`${emp.first_name} ${emp.last_name}`} 
                              className="w-full h-full object-cover object-top scale-110" 
                            />
                          ) : (
                            <>{emp.first_name[0]}{emp.last_name[0]}</>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-foreground transition-all">{emp.first_name} {emp.last_name}</div>
                          <div className="text-xs text-muted-foreground">{emp.email}</div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">{emp.department || 'Not Set'}</TableCell>
                    <TableCell className="text-sm text-foreground">{emp.job_title || 'Not Set'}</TableCell>
                    <TableCell className="text-sm text-foreground">
                      {new Date(emp.joining_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-2">
                        <ConfirmModal
                          title="Delete Employee"
                          description={`Are you sure you want to delete ${emp.first_name} ${emp.last_name}? This action cannot be undone.`}
                          onConfirm={() => handleDelete(emp.id)}
                          confirmText="Delete"
                        >
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            disabled={isDeleting}
                            className="h-8 w-8 bg-input hover:bg-destructive/20 text-muted-foreground hover:text-destructive rounded-md border border-border"
                          >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </ConfirmModal>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards View */}
        <div className="block md:hidden divide-y divide-border">
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No onboarding records found.
            </div>
          ) : (
            currentEmployees.map((emp, index) => (
              <div key={emp.id} className="p-4 space-y-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-input text-foreground flex items-center justify-center text-xs font-bold border border-border overflow-hidden shrink-0">
                      {emp.profile_photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={supabase.storage.from('employee-documents').getPublicUrl(emp.profile_photo).data.publicUrl} 
                          alt={`${emp.first_name} ${emp.last_name}`} 
                          className="w-full h-full object-cover object-top scale-110" 
                        />
                      ) : (
                        <>{emp.first_name[0]}{emp.last_name[0]}</>
                      )}
                    </div>
                    <div className="min-w-0">
                      <Link href={`/hr/onboarding/${emp.id}`} className="font-semibold text-foreground text-sm truncate block">
                        {emp.first_name} {emp.last_name}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                    </div>
                  </div>
                  <ConfirmModal
                    title="Delete Employee"
                    description={`Are you sure you want to delete ${emp.first_name} ${emp.last_name}? This action cannot be undone.`}
                    onConfirm={() => handleDelete(emp.id)}
                    confirmText="Delete"
                  >
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      disabled={isDeleting}
                      className="h-9 w-9 bg-input hover:bg-destructive/20 text-muted-foreground hover:text-destructive rounded-md border border-border shrink-0"
                    >
                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </ConfirmModal>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-muted/20 p-2.5 rounded-lg border border-border/50">
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1 text-[11px] mb-0.5">
                      <Building2 className="w-3 h-3" /> Dept
                    </span>
                    <span className="font-medium text-foreground truncate block">{emp.department || 'Not Set'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1 text-[11px] mb-0.5">
                      <Briefcase className="w-3 h-3" /> Job Title
                    </span>
                    <span className="font-medium text-foreground truncate block">{emp.job_title || 'Not Set'}</span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-border/30 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Joined
                    </span>
                    <span className="font-medium text-foreground">
                      {new Date(emp.joining_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div>
                  <Link 
                    href={`/hr/onboarding/${emp.id}`}
                    className={cn(buttonVariants({ variant: "outline" }), "w-full min-h-[44px] text-xs justify-center gap-2")}
                  >
                    <Eye className="w-4 h-4" /> View Full Profile
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Pagination Footer */}
        {totalPages > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-border bg-card">
            <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredEmployees.length)} of {filteredEmployees.length} results
            </p>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 bg-transparent border-border text-muted-foreground hover:bg-muted disabled:opacity-50" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button 
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="icon" 
                  className={cn("h-8 w-8 text-xs", currentPage !== page && "bg-transparent border-border text-muted-foreground hover:bg-muted")}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 bg-transparent border-border text-muted-foreground hover:bg-muted disabled:opacity-50"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
