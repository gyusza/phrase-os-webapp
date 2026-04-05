"use client"

import { useState, useEffect } from "react"
import { 
  getSignupRequests, 
  updateSignupRequestStatus, 
  deleteSignupRequest, 
  getAllProfiles, 
  clearUserScenarios, 
  clearUserVocabulary 
} from "@/lib/actions/auth-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Loader2, 
  Trash2, 
  CheckCircle2, 
  UserPlus, 
  Clock, 
  Users, 
  Scissors, 
  BookX, 
  RefreshCcw,
  ShieldCheck,
  UserCheck
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AdminUserManagement() {
  const [requests, setRequests] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUsersLoading, setIsUsersLoading] = useState(true)
  const [isActionInProgress, setIsActionInProgress] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    fetchRequests()
    fetchUsers()
  }

  async function fetchRequests() {
    setIsLoading(true)
    try {
      const data = await getSignupRequests()
      setRequests(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch signup requests.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchUsers() {
    setIsUsersLoading(true)
    try {
      const data = await getAllProfiles()
      setUsers(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch active users.",
        variant: "destructive",
      })
    } finally {
      setIsUsersLoading(false)
    }
  }

  async function handleStatusUpdate(id: string, newStatus: string) {
    setIsActionInProgress(id)
    try {
      const res = await updateSignupRequestStatus(id, newStatus)
      if (res.error) throw new Error(res.error)
      
      toast({ 
        title: "Status Updated", 
        description: `Signup request marked as ${newStatus}.${newStatus === 'approved' ? ' User profile created.' : ''}` 
      })
      
      await fetchRequests()
      if (newStatus === 'approved') await fetchUsers()
    } catch (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" })
    } finally {
      setIsActionInProgress(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this request?")) return
    setIsActionInProgress(id)
    try {
      const res = await deleteSignupRequest(id)
      if (res.error) throw new Error(res.error)
      toast({ title: "Deleted", description: "Signup request removed." })
      await fetchRequests()
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete request", variant: "destructive" })
    } finally {
      setIsActionInProgress(null)
    }
  }

  async function handleClearScenarios(userId: string) {
    if (!confirm("Are you sure you want to clear all scenarios for this user? This action cannot be undone.")) return
    setIsActionInProgress(userId + '-scenarios')
    try {
      const res = await clearUserScenarios(userId)
      if (res.error) throw new Error(res.error)
      toast({ title: "Success", description: "All scenarios cleared for user." })
    } catch (error) {
      toast({ title: "Error", description: "Failed to clear scenarios", variant: "destructive" })
    } finally {
      setIsActionInProgress(null)
    }
  }

  async function handleClearVocabulary(userId: string) {
    if (!confirm("Are you sure you want to clear all vocabulary for this user? This action cannot be undone.")) return
    setIsActionInProgress(userId + '-vocab')
    try {
      const res = await clearUserVocabulary(userId)
      if (res.error) throw new Error(res.error)
      toast({ title: "Success", description: "All vocabulary and reviews cleared for user." })
    } catch (error) {
      toast({ title: "Error", description: "Failed to clear vocabulary", variant: "destructive" })
    } finally {
      setIsActionInProgress(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Admin: User Management</h1>
        </div>
        <p className="text-muted-foreground">Manage waitlist requests, active users, and system data.</p>
      </div>

      <Tabs defaultValue="waitlist" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
          <TabsTrigger value="waitlist" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Waitlist Queue
            {requests.filter(r => r.status === 'pending').length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-[10px]">
                {requests.filter(r => r.status === 'pending').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Active Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="waitlist" className="space-y-4">
          <Card className="shadow-lg border-2">
            <CardHeader className="bg-muted/30 pb-6 border-b">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle>Waitlist Queue</CardTitle>
                  <CardDescription>View all users waiting for beta access.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchRequests} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center p-20 space-y-4">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-muted-foreground">Loading queue...</p>
                </div>
              ) : requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 space-y-4 text-center">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                    <Clock className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-xl">The queue is empty</h3>
                    <p className="text-muted-foreground">No new signup requests yet.</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/10">
                      <TableRow>
                        <TableHead className="w-[300px]">Email address</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Requested Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((req) => (
                        <TableRow key={req.id} className="group hover:bg-muted/5 transition-colors">
                          <TableCell className="font-medium align-middle">
                            <span className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                {req.email.substring(0, 2).toUpperCase()}
                              </div>
                              {req.email}
                            </span>
                          </TableCell>
                          <TableCell className="align-middle">
                            <Badge variant={req.status === 'pending' ? 'secondary' : 'default'}>
                              {req.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground align-middle">
                            {new Date(req.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right align-middle">
                            <div className="flex justify-end gap-2">
                              {req.status === 'pending' && (
                                <Button 
                                  size="sm" 
                                  variant="default"
                                  onClick={() => handleStatusUpdate(req.id, 'approved')}
                                  disabled={isActionInProgress === req.id}
                                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Approve
                                </Button>
                              )}
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleDelete(req.id)}
                                disabled={isActionInProgress === req.id}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card className="shadow-lg border-2">
            <CardHeader className="bg-muted/30 pb-6 border-b">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle>Active Users</CardTitle>
                  <CardDescription>Manage actual system users and their data.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={fetchUsers} disabled={isUsersLoading}>
                  {isUsersLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
                  Refresh Users
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isUsersLoading ? (
                <div className="flex flex-col items-center justify-center p-20 space-y-4">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-muted-foreground">Loading users...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 space-y-4 text-center">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-xl">No users found</h3>
                    <p className="text-muted-foreground">Approve waitlist requests to create users.</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/10">
                      <TableRow>
                        <TableHead className="w-[250px]">User / Email</TableHead>
                        <TableHead>Password (Initial)</TableHead>
                        <TableHead>Joined Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} className="group hover:bg-muted/5 transition-colors">
                          <TableCell className="font-medium align-middle">
                            <div className="flex flex-col">
                              <span className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold">
                                  <UserCheck className="h-4 w-4" />
                                </div>
                                {user.full_name || 'No Name'}
                              </span>
                              <span className="text-xs text-muted-foreground ml-10">{user.email}</span>
                            </div>
                          </TableCell>
                          <TableCell className="align-middle">
                            <code className="bg-muted px-2 py-1 rounded text-sm select-all">
                              {user.password || '********'}
                            </code>
                          </TableCell>
                          <TableCell className="text-muted-foreground align-middle">
                            {new Date(user.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right align-middle">
                            <div className="flex justify-end gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleClearScenarios(user.id)}
                                disabled={isActionInProgress === user.id + '-scenarios'}
                                className="border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                                title="Clear Scenarios"
                              >
                                {isActionInProgress === user.id + '-scenarios' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scissors className="h-4 w-4 mr-2" />}
                                Scenarios
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleClearVocabulary(user.id)}
                                disabled={isActionInProgress === user.id + '-vocab'}
                                className="border-red-200 hover:bg-red-50 hover:text-red-700"
                                title="Clear Vocabulary"
                              >
                                {isActionInProgress === user.id + '-vocab' ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookX className="h-4 w-4 mr-2" />}
                                Vocab
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 flex gap-4 items-start">
         <div className="bg-primary/10 p-2 rounded-full mt-1">
            <UserCheck className="h-5 w-5 text-primary" />
         </div>
         <div className="space-y-1">
            <h3 className="font-semibold text-primary/90">Automated Onboarding</h3>
            <p className="text-sm text-primary/80 leading-relaxed">
               Approving a waitlist request now automatically:
               1. Creates a user profile in the system.
               2. Sets the initial password to the email prefix (before @).
               3. Redirects them to the active users list for management.
            </p>
         </div>
      </div>
    </div>
  )
}
