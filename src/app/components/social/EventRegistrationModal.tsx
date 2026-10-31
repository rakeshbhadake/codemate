import React, { useState, useEffect } from 'react';
import { useAuth } from '../../utils/auth-context';
import { eventsAPI } from '../../utils/api';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Plus, Minus, Loader2, CheckCircle, Users } from 'lucide-react';
import { toast } from 'sonner';

const COUNTRY_CODES = [
  { code: '+1', label: '+1 US/CA' },
  { code: '+44', label: '+44 UK' },
  { code: '+91', label: '+91 India' },
  { code: '+86', label: '+86 China' },
  { code: '+49', label: '+49 Germany' },
  { code: '+33', label: '+33 France' },
  { code: '+81', label: '+81 Japan' },
  { code: '+82', label: '+82 Korea' },
  { code: '+61', label: '+61 Australia' },
  { code: '+55', label: '+55 Brazil' },
  { code: '+7', label: '+7 Russia' },
  { code: '+27', label: '+27 South Africa' },
  { code: '+234', label: '+234 Nigeria' },
  { code: '+20', label: '+20 Egypt' },
  { code: '+966', label: '+966 Saudi Arabia' },
  { code: '+971', label: '+971 UAE' },
  { code: '+65', label: '+65 Singapore' },
  { code: '+60', label: '+60 Malaysia' },
  { code: '+62', label: '+62 Indonesia' },
  { code: '+63', label: '+63 Philippines' },
  { code: '+84', label: '+84 Vietnam' },
  { code: '+66', label: '+66 Thailand' },
  { code: '+92', label: '+92 Pakistan' },
  { code: '+880', label: '+880 Bangladesh' },
  { code: '+94', label: '+94 Sri Lanka' },
  { code: '+977', label: '+977 Nepal' },
  { code: '+98', label: '+98 Iran' },
  { code: '+90', label: '+90 Turkey' },
  { code: '+48', label: '+48 Poland' },
  { code: '+39', label: '+39 Italy' },
  { code: '+34', label: '+34 Spain' },
  { code: '+31', label: '+31 Netherlands' },
  { code: '+46', label: '+46 Sweden' },
  { code: '+47', label: '+47 Norway' },
  { code: '+52', label: '+52 Mexico' },
  { code: '+57', label: '+57 Colombia' },
  { code: '+54', label: '+54 Argentina' },
  { code: '+56', label: '+56 Chile' },
];

interface Member {
  name: string;
  email: string;
  countryCode: string;
  phone: string;
}

interface EventRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: any;
  onRegistered?: () => void;
}

const emptyMember = (): Member => ({ name: '', email: '', countryCode: '+91', phone: '' });

export function EventRegistrationModal({ open, onOpenChange, event, onRegistered }: EventRegistrationModalProps) {
  const { user } = useAuth();

  // Use the event's actual values; fall back sensibly but don't cap artificially.
  // enrichedEvent already has localStorage-merged settings from EventCard.
  const minMembers = Math.max(Number(event?.minTeamSize) || 1, 1);
  const maxMembers = Math.max(Number(event?.maxTeamSize) || 20, minMembers);

  const [teamName, setTeamName] = useState('');
  const [members, setMembers] = useState<Member[]>(() =>
    Array.from({ length: minMembers }, emptyMember)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Reset form every time the modal opens, always matching the current event's minTeamSize.
  useEffect(() => {
    if (open) {
      setTeamName('');
      setMembers(Array.from({ length: minMembers }, emptyMember));
      setError('');
      setSuccess(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, event?.id, minMembers]);

  const addMember = () => {
    if (members.length >= maxMembers) return;
    setMembers(prev => [...prev, emptyMember()]);
  };

  const removeMember = (index: number) => {
    if (index < minMembers) return;
    setMembers(prev => prev.filter((_, i) => i !== index));
  };

  const updateMember = (index: number, field: keyof Member, value: string) => {
    setMembers(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone: string) => /^\d{6,15}$/.test(phone.replace(/[\s\-()]/g, ''));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!teamName.trim()) {
      setError('Team name is required');
      return;
    }

    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (!m.name.trim()) { setError(`Member ${i + 1}: Name is required`); return; }
      if (!m.email.trim()) { setError(`Member ${i + 1}: Email is required`); return; }
      if (!validateEmail(m.email)) { setError(`Member ${i + 1}: Invalid email address`); return; }
      if (!m.phone.trim()) { setError(`Member ${i + 1}: Phone number is required`); return; }
      if (!validatePhone(m.phone)) { setError(`Member ${i + 1}: Phone must be 6–15 digits`); return; }
    }

    const emails = members.map(m => m.email.trim().toLowerCase());
    if (new Set(emails).size !== emails.length) {
      setError('Duplicate email addresses found. Each member must have a unique email.');
      return;
    }

    const phones = members.map(m => m.phone.replace(/[\s\-()]/g, ''));
    if (new Set(phones).size !== phones.length) {
      setError('Duplicate phone numbers found. Each member must have a unique phone number.');
      return;
    }

    if (members.length < minMembers) {
      setError(`Minimum team size for this event is ${minMembers} member${minMembers !== 1 ? 's' : ''}`);
      return;
    }
    if (members.length > maxMembers) {
      setError(`Maximum team size for this event is ${maxMembers} member${maxMembers !== 1 ? 's' : ''}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const registrationPayload = {
        teamName: teamName.trim(),
        leaderName: user?.name || '',
        leaderEmail: (user as any)?.email || '',
        members: members.map(m => ({
          name: m.name.trim(),
          email: m.email.trim().toLowerCase(),
          phone: `${m.countryCode}${m.phone.replace(/[\s\-()]/g, '')}`
        }))
      };

      // Supabase is the source of truth. Do not report success or create a
      // local-only registration if the backend write fails.
      await eventsAPI.register(event.id, registrationPayload);

      setSuccess(true);
      toast.success('Team registered successfully!');
      onRegistered?.();
    } catch (err: any) {
      const message = err.message || 'Failed to register team. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <div className="text-center py-8 space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h3>Registration Successful!</h3>
            <p className="text-muted-foreground">
              Your team has been registered for <strong>{event?.title}</strong>.
            </p>
            <p className="text-sm text-muted-foreground">
              A confirmation will be sent to all registered team members.
            </p>
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register for {event?.title}</DialogTitle>
          <DialogDescription className="sr-only">Complete the form to register your team for this event.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Team Info */}
          <div className="space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Team Information
            </p>

            <div className="space-y-2">
              <Label htmlFor="teamName">Team Name *</Label>
              <Input
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g., Code Crusaders"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Team Leader</Label>
                <Input value={user?.name || ''} disabled className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label>Leader Email</Label>
                <Input value={(user as any)?.email || ''} disabled className="bg-muted/50" />
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Team Members
              </p>
              <Badge variant="secondary" className="text-xs">
                {members.length} / {maxMembers} max
              </Badge>
            </div>

            {members.map((member, index) => (
              <Card key={index}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      Member {index + 1}
                      {index < minMembers && (
                        <span className="text-destructive ml-1 text-xs">required</span>
                      )}
                    </p>
                    {index >= minMembers && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeMember(index)}
                        title="Remove member"
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Full Name *</Label>
                    <Input
                      value={member.name}
                      onChange={(e) => updateMember(index, 'name', e.target.value)}
                      placeholder="Full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={member.email}
                      onChange={(e) => updateMember(index, 'email', e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Phone Number *</Label>
                    <div className="flex gap-2">
                      <Select
                        value={member.countryCode}
                        onValueChange={(val) => updateMember(index, 'countryCode', val)}
                      >
                        <SelectTrigger className="w-36 flex-shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-48">
                          {COUNTRY_CODES.map(cc => (
                            <SelectItem key={cc.code} value={cc.code}>
                              {cc.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={member.phone}
                        onChange={(e) => updateMember(index, 'phone', e.target.value)}
                        placeholder="Phone number"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Add Member */}
            {members.length >= maxMembers ? (
              <p className="text-sm text-muted-foreground text-center py-2 border border-dashed border-border rounded-lg">
                <Users className="w-4 h-4 inline mr-1.5 opacity-60" />
                Maximum team size reached ({maxMembers} members).
              </p>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={addMember}
              >
                <Plus className="w-4 h-4" />
                Add Member
                <span className="text-muted-foreground text-xs">
                  ({members.length}/{maxMembers})
                </span>
              </Button>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                'Register Team'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
