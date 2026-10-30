import React, { useState, useEffect } from 'react';
import { eventsAPI } from '../../utils/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Loader2, Search, Download, Check, X, ChevronDown, ChevronRight, Users } from 'lucide-react';

interface EventRegistrationsViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: any;
}

export function EventRegistrationsView({ open, onOpenChange, event }: EventRegistrationsViewProps) {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'time' | 'name'>('time');
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (open && event?.id) {
      loadRegistrations();
    }
  }, [open, event?.id]);

  const loadRegistrations = async () => {
    setIsLoading(true);
    try {
      const result = await eventsAPI.getRegistrations(event.id);
      const apiRegs = result.registrations || [];
      // Merge with any locally-stored registrations (created when API was unavailable)
      const localRegs = getLocalRegistrations(event.id);
      const merged = mergeRegistrations(apiRegs, localRegs);
      setRegistrations(merged);
    } catch {
      // API endpoint unavailable — use only local storage
      setRegistrations(getLocalRegistrations(event.id));
    } finally {
      setIsLoading(false);
    }
  };

  function getLocalRegistrations(eventId: string): any[] {
    try {
      return JSON.parse(localStorage.getItem(`event_registrations_${eventId}`) || '[]');
    } catch {
      return [];
    }
  }

  // Deduplicate by id: API records take precedence over local ones.
  function mergeRegistrations(apiRegs: any[], localRegs: any[]): any[] {
    const apiIds = new Set(apiRegs.map((r: any) => r.id));
    const onlyLocal = localRegs.filter(r => !apiIds.has(r.id));
    return [...apiRegs, ...onlyLocal];
  }

  const isRegistrationOpen = () => {
    if (!event?.registrationDeadline) return true;
    return new Date(event.registrationDeadline) > new Date();
  };

  const getRegistrationStatus = () => {
    if (!event?.registrationDeadline) return { label: 'Open', variant: 'default' as const };
    const now = new Date();
    const deadline = new Date(event.registrationDeadline);
    const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (now > deadline) return { label: 'Closed', variant: 'secondary' as const };
    if (hoursLeft <= 24) return { label: 'Closing Soon', variant: 'destructive' as const };
    return { label: 'Open', variant: 'default' as const };
  };

  const filtered = registrations
    .filter(r => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.teamName?.toLowerCase().includes(q) ||
        r.leaderName?.toLowerCase().includes(q) ||
        r.leaderEmail?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'name') return (a.teamName || '').localeCompare(b.teamName || '');
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

  const stats = {
    total: registrations.length,
    approved: registrations.filter(r => r.status === 'approved').length,
    pending: registrations.filter(r => !r.status || r.status === 'pending').length,
    remaining: event?.maxTeams ? Math.max(0, Number(event.maxTeams) - registrations.length) : null
  };

  const exportCSV = () => {
    const headers = ['Team Name', 'Leader', 'Leader Email', 'Member Count', 'Registration Time', 'Status'];
    const memberHeaders = ['Member Name', 'Member Email', 'Member Phone'];

    // Build rows with member details
    const rows: string[][] = [headers.concat(memberHeaders)];
    registrations.forEach(r => {
      const baseRow = [
        r.teamName || '',
        r.leaderName || '',
        r.leaderEmail || '',
        String(r.members?.length || 0),
        r.createdAt ? new Date(r.createdAt).toLocaleString() : '',
        r.status || 'pending'
      ];
      if (!r.members || r.members.length === 0) {
        rows.push(baseRow.concat(['', '', '']));
      } else {
        r.members.forEach((m: any, i: number) => {
          if (i === 0) {
            rows.push(baseRow.concat([m.name || '', m.email || '', m.phone || '']));
          } else {
            rows.push(['', '', '', '', '', ''].concat([m.name || '', m.email || '', m.phone || '']));
          }
        });
      }
    });

    const csv = rows.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(event?.title || 'event').replace(/\s+/g, '-')}-registrations.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateStatus = async (registrationId: string, status: string) => {
    setUpdatingId(registrationId);
    try {
      try {
        await eventsAPI.updateRegistration(event.id, registrationId, { status });
      } catch {
        // API unavailable — update localStorage record
        const key = `event_registrations_${event.id}`;
        try {
          const existing = JSON.parse(localStorage.getItem(key) || '[]');
          localStorage.setItem(
            key,
            JSON.stringify(existing.map((r: any) => r.id === registrationId ? { ...r, status } : r))
          );
        } catch {}
      }
      // Update UI state regardless of which path succeeded
      setRegistrations(prev =>
        prev.map(r => r.id === registrationId ? { ...r, status } : r)
      );
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setUpdatingId(null);
    }
  };

  const regStatus = getRegistrationStatus();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Event Registrations — {event?.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-semibold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Teams</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-semibold text-green-600 dark:text-green-400">{stats.approved}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-semibold text-muted-foreground">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-semibold">{stats.remaining ?? '∞'}</p>
                <p className="text-xs text-muted-foreground">Slots Left</p>
              </CardContent>
            </Card>
          </div>

          {/* Controls row */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant={regStatus.variant}>
              {regStatus.label}
            </Badge>
            {event?.registrationDeadline && (
              <p className="text-xs text-muted-foreground">
                Deadline: {new Date(event.registrationDeadline).toLocaleString()}
              </p>
            )}
            <div className="flex-1" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'time' | 'name')}
              className="text-sm border border-border rounded-md px-2 py-1.5 bg-background text-foreground"
            >
              <option value="time">Sort: Latest First</option>
              <option value="name">Sort: Team Name</option>
            </select>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCSV}>
              <Download className="w-3 h-3" />
              Export CSV
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search teams by name or leader..."
              className="pl-9"
            />
          </div>

          {/* Team list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">
                {registrations.length === 0
                  ? 'No registrations yet.'
                  : 'No teams match your search.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((reg) => (
                <Card key={reg.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="flex-1 flex items-center gap-3 text-left min-w-0"
                        onClick={() => setExpandedTeam(expandedTeam === reg.id ? null : reg.id)}
                      >
                        {expandedTeam === reg.id
                          ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        }
                        <div className="min-w-0">
                          <p className="font-medium truncate">{reg.teamName}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            Leader: {reg.leaderName}
                            {reg.members?.length ? ` · ${reg.members.length} member${reg.members.length !== 1 ? 's' : ''}` : ''}
                            {reg.createdAt ? ` · ${new Date(reg.createdAt).toLocaleString()}` : ''}
                          </p>
                        </div>
                      </button>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Badge
                          variant={
                            reg.status === 'approved' ? 'default' :
                            reg.status === 'rejected' ? 'destructive' :
                            'secondary'
                          }
                          className="text-xs"
                        >
                          {reg.status || 'pending'}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                          onClick={() => updateStatus(reg.id, 'approved')}
                          disabled={updatingId === reg.id}
                          title="Approve"
                        >
                          {updatingId === reg.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Check className="w-3 h-3" />
                          }
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => updateStatus(reg.id, 'rejected')}
                          disabled={updatingId === reg.id}
                          title="Reject"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    {expandedTeam === reg.id && (
                      <div className="mt-4 pt-4 border-t border-border space-y-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Team Members
                        </p>
                        {(reg.members || []).length === 0 ? (
                          <p className="text-sm text-muted-foreground">No member details recorded.</p>
                        ) : (
                          <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground font-medium pb-1 border-b border-border">
                              <span>Name</span>
                              <span>Email</span>
                              <span>Phone</span>
                            </div>
                            {(reg.members || []).map((member: any, i: number) => (
                              <div key={i} className="grid grid-cols-3 gap-2 text-sm">
                                <span className="truncate">{member.name || '—'}</span>
                                <span className="text-muted-foreground truncate">{member.email || '—'}</span>
                                <span className="text-muted-foreground truncate">{member.phone || '—'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
