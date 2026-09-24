'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
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
import { EmployeeDetailsModal } from '@/components/hr/employee-details-modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { DatePicker } from '@/components/ui/date-picker'
import { ChevronLeft, ChevronRight, Trash2, Search, Filter, Loader2 } from 'lucide-react'

import { Employee } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'
import { deleteEmployee, deleteEmployeesBulk } from '@/lib/actions/onboarding'
import { useToast } from '@/hooks/use-toast'

export function OnboardingTable({ employees }: { employees: Employee[] }) {
  const supabase = createClient()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [jobTitleFilter, setJobTitleFilter] = useState('')
  const [joiningDateFilter, setJoiningDateFilter] = useState('')

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

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredEmployees.map(emp => emp.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleDelete = async (id: string) => {
    setIsDeleting(true)
    try {
      await deleteEmployee(id)
      toast({ title: 'Deleted', description: 'Employee has been deleted.' })
      setSelectedIds(prev => prev.filter(x => x !== id))
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBulkDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteEmployeesBulk(selectedIds)
      toast({ title: 'Deleted', description: `${selectedIds.length} employees have been deleted.` })
      setSelectedIds([])
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row flex-wrap items-start md:items-center gap-3 bg-[#111111] p-3 rounded-xl border border-border">
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name, email, department..." 
            className="w-full bg-input/50 border-border pl-9 h-9 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Select value={departmentFilter} onValueChange={(val) => setDepartmentFilter(val ?? "")}>
          <SelectTrigger className="w-full md:w-[180px] h-9 bg-input/50 border-border text-xs shrink-0">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            {/* "All" is handled by placeholder & clear button */}
            {uniqueDepartments.map(dept => (
              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={jobTitleFilter} onValueChange={(val) => setJobTitleFilter(val ?? "")}>
          <SelectTrigger className="w-full md:w-[180px] h-9 bg-input/50 border-border text-xs shrink-0">
            <SelectValue placeholder="All Job Titles" />
          </SelectTrigger>
          <SelectContent>
            {/* "All" is handled by placeholder & clear button */}
            {uniqueJobTitles.map(title => (
              <SelectItem key={title} value={title}>{title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="w-full md:w-[160px] shrink-0">
          <DatePicker
            value={joiningDateFilter}
            onChange={setJoiningDateFilter}
            placeholder="Joining Date"
            iconLeft={true}
            showChevron={true}
          />
        </div>

        {(searchQuery || departmentFilter || jobTitleFilter || joiningDateFilter) && (
          <Button 
            variant="outline" 
            className="h-9 text-xs shrink-0 bg-[#1a1a1a] hover:bg-[#252525] border-border text-muted-foreground hover:text-foreground"
            onClick={() => {
              setSearchQuery('')
              setDepartmentFilter('')
              setJobTitleFilter('')
              setJoiningDateFilter('')
            }}
          >
            Clear Filters
          </Button>
        )}

        <div className="md:ml-auto w-full md:w-auto flex justify-end">
          {selectedIds.length > 0 && (
            <ConfirmModal
              title="Delete Employees"
              description={`Are you sure you want to delete ${selectedIds.length} selected employees? This action cannot be undone.`}
              onConfirm={handleBulkDelete}
              confirmText="Delete Selected"
            >
              <Button 
                variant="destructive" 
                disabled={isDeleting}
                className="h-9 font-bold shrink-0 text-xs"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Delete Selected ({selectedIds.length})
              </Button>
            </ConfirmModal>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-transparent hover:bg-transparent">
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="w-12 text-center">
                <input 
                  type="checkbox" 
                  className="rounded border-border bg-input" 
                  checked={filteredEmployees.length > 0 && selectedIds.length === filteredEmployees.length}
                  onChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="w-12 text-center text-muted-foreground font-medium">#</TableHead>
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
                <TableCell colSpan={8} className="text-center h-32 text-muted-foreground">
                  No onboarding records found.
                </TableCell>
              </TableRow>
            ) : (
              filteredEmployees.map((emp, index) => (
                <TableRow key={emp.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                  <TableCell className="text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-border bg-input" 
                      checked={selectedIds.includes(emp.id)}
                      onChange={() => handleSelectOne(emp.id)}
                    />
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
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
                      <div>
                        <div className="font-medium text-foreground">{emp.first_name} {emp.last_name}</div>
                        <div className="text-xs text-muted-foreground">{emp.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-foreground">{emp.department || 'Not Set'}</TableCell>
                  <TableCell className="text-sm text-foreground">{emp.job_title || 'Not Set'}</TableCell>
                  <TableCell className="text-sm text-foreground">
                    {new Date(emp.joining_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <div className="flex items-center justify-end gap-2">
                      <EmployeeDetailsModal employee={emp} />
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
                          {isDeleting && selectedIds.includes(emp.id) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </ConfirmModal>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card">
          <p className="text-sm text-muted-foreground">
            Showing 1 to {filteredEmployees.length} of {filteredEmployees.length} results
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent border-border text-muted-foreground" disabled>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 bg-foreground text-background border-foreground">
              1
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent border-border text-muted-foreground hover:bg-muted">
              2
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent border-border text-muted-foreground hover:bg-muted">
              3
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent border-border text-muted-foreground hover:bg-muted">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}
