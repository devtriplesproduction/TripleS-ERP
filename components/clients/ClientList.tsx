'use client'

import { useState } from 'react'
import { Client } from '@/types/project-management'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Building2, MapPin, Phone, Mail, MessageSquare, Edit2, Search, Plus } from 'lucide-react'
import { ClientModal } from './ClientModal'
import dayjs from 'dayjs'
import { PageHeader } from '@/components/PageHeader'

interface ClientListProps {
  initialClients: Client[]
  canManage: boolean
  canViewContact: boolean
}

export function ClientList({ initialClients, canManage, canViewContact }: ClientListProps) {
  const [clients, setClients] = useState<Client[]>(initialClients)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Inactive'>('ALL')
  const [viewMode, setViewMode] = useState<'LIST' | 'GRID'>('LIST')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null)

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.location.toLowerCase().includes(search.toLowerCase()) ||
      c.client_id_display.toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const handleOpenCreate = () => {
    setClientToEdit(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (client: Client) => {
    setClientToEdit(client)
    setIsModalOpen(true)
  }

  const handleSuccess = () => {
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <PageHeader 
        title="Clients"
        subtitle="Manage your corporate clients, organizational accounts, and locations."
        icon={Building2}
        actions={
          canManage && (
            <Button
              onClick={handleOpenCreate}
              className="w-full sm:w-auto h-11 px-5 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Client
            </Button>
          )
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by client name, location, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border filter-control"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto filter-toggle-container">
          {(['ALL', 'Active', 'Inactive'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-4 text-sm font-medium rounded-md border transition-colors whitespace-nowrap min-w-[70px] filter-toggle-btn ${
                statusFilter === st
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              {st === 'ALL' ? 'All Status' : st}
            </button>
          ))}
        </div>
        
        <div className="flex bg-card border border-border rounded-md shrink-0 filter-toggle-container self-start sm:self-auto">
          <button
            onClick={() => setViewMode('GRID')}
            className={`px-4 text-xs font-medium rounded-sm transition-colors filter-toggle-btn ${
              viewMode === 'GRID' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('LIST')}
            className={`px-4 text-xs font-medium rounded-sm transition-colors filter-toggle-btn ${
              viewMode === 'LIST' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            List
          </button>
        </div>
      </div>

      {viewMode === 'LIST' ? (
        <>
          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block bg-card border border-border rounded-lg overflow-hidden shadow-xs">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted border-b border-border text-muted-foreground uppercase text-xs tracking-wider">
            <tr>
              <th className="p-4 font-medium">Client ID</th>
              <th className="p-4 font-medium">Client Name</th>
              <th className="p-4 font-medium">Location</th>
              {canViewContact && (
                <>
                  <th className="p-4 font-medium">Contact / Phone</th>
                  <th className="p-4 font-medium">Email</th>
                </>
              )}
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Created Date</th>
              {canManage && <th className="p-4 text-right font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredClients.length === 0 ? (
              <tr>
                <td
                  colSpan={canViewContact ? (canManage ? 8 : 7) : (canManage ? 6 : 5)}
                  className="p-8 text-center text-muted-foreground"
                >
                  No clients found.
                </td>
              </tr>
            ) : (
              filteredClients.map((client, idx) => (
                <tr key={client.id} className="hover:bg-accent/40 transition-colors">
                  <td className="p-4 font-mono font-medium text-xs">{client.client_id_display}</td>
                  <td className="p-4 font-semibold text-foreground">{client.name}</td>
                  <td className="p-4 text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {client.location}
                    </span>
                  </td>
                  {canViewContact && (
                    <>
                      <td className="p-4 text-muted-foreground">
                        <div className="space-y-0.5 text-xs">
                          {client.contact_number && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3 shrink-0" /> {client.contact_number}
                            </div>
                          )}
                          {client.whatsapp_number && (
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3 shrink-0" /> {client.whatsapp_number}
                            </div>
                          )}
                          {!client.contact_number && !client.whatsapp_number && '—'}
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground text-xs">
                        {client.email ? (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 shrink-0" /> {client.email}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                    </>
                  )}
                  <td className="p-4">
                    <Badge
                      variant="outline"
                      className={
                        client.status === 'Active'
                          ? 'border-foreground/30 text-foreground bg-accent/30'
                          : 'border-muted-foreground/30 text-muted-foreground'
                      }
                    >
                      {client.status}
                    </Badge>
                  </td>
                  <td className="p-4 text-muted-foreground text-xs">
                    {dayjs(client.created_at).format('DD MMM YYYY')}
                  </td>
                  {canManage && (
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(client)}
                        className="h-9 w-9 p-0 hover:bg-accent"
                        title="Edit Client"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Grid (< 768px) for LIST view */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {filteredClients.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground bg-card border border-border rounded-lg">
            No clients found.
          </div>
        ) : (
          filteredClients.map((client) => (
            <Card key={client.id} className="border-border bg-card shadow-xs">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">{client.client_id_display}</span>
                    <h3 className="font-bold text-base text-foreground mt-0.5">{client.name}</h3>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      client.status === 'Active'
                        ? 'border-foreground/30 text-foreground bg-accent/30 shrink-0'
                        : 'border-muted-foreground/30 text-muted-foreground shrink-0'
                    }
                  >
                    {client.status}
                  </Badge>
                </div>

                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>{client.location}</span>
                </div>

                {canViewContact && (
                  <div className="pt-2 border-t border-border/60 text-xs space-y-1.5 text-muted-foreground">
                    {client.contact_number && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span>{client.contact_number}</span>
                      </div>
                    )}
                    {client.whatsapp_number && (
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                        <span>{client.whatsapp_number}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span>{client.email}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs text-muted-foreground">
                  <span>Created {dayjs(client.created_at).format('DD MMM YYYY')}</span>
                  {canManage && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(client)}
                      className="h-8 px-3 text-xs"
                    >
                      <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      </>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredClients.length === 0 ? (
          <div className="col-span-full p-8 text-center text-muted-foreground bg-card border border-border rounded-lg">
            No clients found.
          </div>
        ) : (
          filteredClients.map((client) => (
            <Card key={client.id} className="border-border bg-card shadow-xs">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-semibold text-muted-foreground bg-secondary/60 border border-border/50 px-2.5 py-1 rounded-md mb-1 inline-block">{client.client_id_display}</span>
                    <h3 className="font-bold text-lg text-foreground leading-tight mt-1">{client.name}</h3>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      client.status === 'Active'
                        ? 'border-foreground/30 text-foreground bg-accent/30 shrink-0'
                        : 'border-muted-foreground/30 text-muted-foreground shrink-0'
                    }
                  >
                    {client.status}
                  </Badge>
                </div>

                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">{client.location}</span>
                </div>

                {canViewContact && (
                  <div className="pt-3 border-t border-border/60 text-sm space-y-2 text-muted-foreground">
                    {client.contact_number && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 shrink-0" />
                        <span className="truncate">{client.contact_number}</span>
                      </div>
                    )}
                    {client.whatsapp_number && (
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 shrink-0" />
                        <span className="truncate">{client.whatsapp_number}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-border/40 text-xs text-muted-foreground">
                  <span>Created {dayjs(client.created_at).format('DD MMM YYYY')}</span>
                  {canManage && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(client)}
                      className="h-8 px-3 text-xs"
                    >
                      <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      )}

      {/* Client Modal */}
      {isModalOpen && (
        <ClientModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleSuccess}
          clientToEdit={clientToEdit}
        />
      )}
    </div>
  )
}
