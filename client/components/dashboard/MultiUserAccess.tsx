import React, { useState } from 'react';
import { Users, Plus, Trash2, Edit, Mail, Shield, UserCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { toast } from 'sonner';

type UserRole = 'admin' | 'manager' | 'viewer';

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: 'active' | 'pending' | 'suspended';
  addedAt: string;
  lastActive: string;
  permissions: {
    viewBookings: boolean;
    createBookings: boolean;
    modifyBookings: boolean;
    cancelBookings: boolean;
    viewPayments: boolean;
    makePayments: boolean;
    manageTeam: boolean;
  };
}

const defaultPermissions: Record<UserRole, TeamMember['permissions']> = {
  admin: {
    viewBookings: true,
    createBookings: true,
    modifyBookings: true,
    cancelBookings: true,
    viewPayments: true,
    makePayments: true,
    manageTeam: true
  },
  manager: {
    viewBookings: true,
    createBookings: true,
    modifyBookings: true,
    cancelBookings: true,
    viewPayments: true,
    makePayments: false,
    manageTeam: false
  },
  viewer: {
    viewBookings: true,
    createBookings: false,
    modifyBookings: false,
    cancelBookings: false,
    viewPayments: false,
    makePayments: false,
    manageTeam: false
  }
};

const mockTeamMembers: TeamMember[] = [
  {
    id: '1',
    email: 'jane.doe@company.com',
    name: 'Jane Doe',
    role: 'manager',
    status: 'active',
    addedAt: '2024-01-15',
    lastActive: '2024-02-20',
    permissions: defaultPermissions.manager
  },
  {
    id: '2',
    email: 'john.smith@company.com',
    name: 'John Smith',
    role: 'viewer',
    status: 'pending',
    addedAt: '2024-02-18',
    lastActive: 'Never',
    permissions: defaultPermissions.viewer
  }
];

export default function MultiUserAccess() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(mockTeamMembers);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    role: 'viewer' as UserRole
  });

  const handleInviteUser = () => {
    if (!inviteForm.email.trim() || !inviteForm.name.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newMember: TeamMember = {
      id: Date.now().toString(),
      email: inviteForm.email,
      name: inviteForm.name,
      role: inviteForm.role,
      status: 'pending',
      addedAt: new Date().toISOString().split('T')[0],
      lastActive: 'Never',
      permissions: defaultPermissions[inviteForm.role]
    };

    setTeamMembers(prev => [...prev, newMember]);
    setInviteForm({ email: '', name: '', role: 'viewer' });
    setIsInviteDialogOpen(false);
    toast.success(`Invitation sent to ${newMember.email}`);
  };

  const handleRemoveUser = (userId: string) => {
    setTeamMembers(prev => prev.filter(member => member.id !== userId));
    toast.success('User removed from team');
  };

  const handleEditUser = (member: TeamMember) => {
    setSelectedMember(member);
    setIsEditDialogOpen(true);
  };

  const handleSaveUserChanges = () => {
    if (!selectedMember) return;

    setTeamMembers(prev => prev.map(member => 
      member.id === selectedMember.id ? selectedMember : member
    ));
    setIsEditDialogOpen(false);
    toast.success('User permissions updated');
  };

  const updateMemberRole = (role: UserRole) => {
    if (!selectedMember) return;
    
    setSelectedMember({
      ...selectedMember,
      role,
      permissions: defaultPermissions[role]
    });
  };

  const updateMemberPermission = (permission: keyof TeamMember['permissions'], value: boolean) => {
    if (!selectedMember) return;
    
    setSelectedMember({
      ...selectedMember,
      permissions: {
        ...selectedMember.permissions,
        [permission]: value
      }
    });
  };

  const getRoleBadge = (role: UserRole) => {
    const roleConfig = {
      admin: { label: 'Admin', className: 'bg-red-100 text-red-800' },
      manager: { label: 'Manager', className: 'bg-blue-100 text-blue-800' },
      viewer: { label: 'Viewer', className: 'bg-gray-100 text-gray-800' }
    };

    const config = roleConfig[role];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: TeamMember['status']) => {
    const statusConfig = {
      active: { label: 'Active', className: 'bg-green-100 text-green-800' },
      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      suspended: { label: 'Suspended', className: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Access Management
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Invite team members and manage their access permissions
              </p>
            </div>
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-brand-purple hover:bg-brand-purple-dark">
                  <Plus className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="inviteEmail">Email Address *</Label>
                    <Input
                      id="inviteEmail"
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="inviteName">Full Name *</Label>
                    <Input
                      id="inviteName"
                      placeholder="John Doe"
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="inviteRole">Role</Label>
                    <select
                      id="inviteRole"
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value as UserRole }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-purple focus:border-transparent"
                    >
                      <option value="viewer">Viewer - Can only view bookings</option>
                      <option value="manager">Manager - Can create and modify bookings</option>
                      <option value="admin">Admin - Full access including team management</option>
                    </select>
                  </div>

                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Role Permissions:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      {Object.entries(defaultPermissions[inviteForm.role]).map(([permission, enabled]) => (
                        <li key={permission} className={enabled ? '' : 'line-through opacity-60'}>
                          • {permission.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleInviteUser} className="flex-1">
                      <Mail className="h-4 w-4 mr-2" />
                      Send Invitation
                    </Button>
                    <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members ({teamMembers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-foreground">No team members</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Invite your first team member to start collaborating.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {teamMembers.map((member) => (
                <div key={member.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-brand-purple rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold">{member.name}</h3>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                        {getRoleBadge(member.role)}
                        {getStatusBadge(member.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Added:</p>
                          <p>{new Date(member.addedAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Last Active:</p>
                          <p>{member.lastActive === 'Never' ? 'Never' : new Date(member.lastActive).toLocaleDateString()}</p>
                        </div>
                      </div>

                      {/* Permissions Preview */}
                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground mb-1">Permissions:</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(member.permissions).filter(([_, enabled]) => enabled).map(([permission]) => (
                            <Badge key={permission} variant="outline" className="text-xs">
                              {permission.replace(/([A-Z])/g, ' $1').toLowerCase()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditUser(member)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveUser(member.id)}
                        className="text-red-600 border-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        {selectedMember && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit User Permissions - {selectedMember.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <Label>Role</Label>
                <select
                  value={selectedMember.role}
                  onChange={(e) => updateMemberRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-purple focus:border-transparent mt-1"
                >
                  <option value="viewer">Viewer</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <Label>Custom Permissions</Label>
                <div className="space-y-3 mt-2">
                  {Object.entries(selectedMember.permissions).map(([permission, enabled]) => (
                    <div key={permission} className="flex items-center justify-between">
                      <span className="text-sm capitalize">
                        {permission.replace(/([A-Z])/g, ' $1')}
                      </span>
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => updateMemberPermission(permission as keyof TeamMember['permissions'], e.target.checked)}
                        className="rounded border-gray-300 text-brand-purple focus:ring-brand-purple"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleSaveUserChanges} className="flex-1">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
