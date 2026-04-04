"use client"

import { useState, useEffect } from "react"
import { getSignupRequests, updateSignupRequestStatus, deleteSignupRequest } from "@/lib/actions/auth-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Trash2, CheckCircle2, UserPlus, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"

export default function AdminSignupsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isActionInProgress, setIsActionInProgress] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchRequests()
  }, [])

  async function fetchRequests() {
    setIsLoading(true)
    try {
      const data = await getSignupRequests()
      setRequests(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch signup requests. Make sure you are the admin.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleStatusUpdate(id: string, newStatus: string) {
    setIsActionInProgress(id)
    try {
      const res = await updateSignupRequestStatus(id, newStatus)
      if (res.error) throw new Error(res.error)
      toast({ title: "Status Updated", description: "Signup request marked as " + newStatus })
      await fetchRequests()
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Admin: Signup Requests</h1>
        <p className="text-muted-foreground">Manage incoming access requests and user onboarding.</p>
      </div>

      <Card className="shadow-lg border-2">
        <CardHeader className="bg-muted/30 pb-6 border-b">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Waitlist Queue</CardTitle>
              <CardDescription>View all users waiting for beta access.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchRequests} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh Queue"}
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
                        {new Date(req.created_at).toLocaleDateString()} at {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
        <CardFooter className="bg-muted/10 py-3 border-t">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
             <UserPlus className="h-3 w-3" />
             Copy emails and create users manually as requested.
          </p>
        </CardFooter>
      </Card>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 flex gap-4 items-start">
         <div className="bg-blue-100 p-2 rounded-full mt-1">
            <UserPlus className="h-5 w-5 text-blue-600" />
         </div>
         <div className="space-y-1">
            <h3 className="font-semibold text-blue-900">Manual Onboarding Flow</h3>
            <p className="text-sm text-blue-800 leading-relaxed">
               For each approved request:
               1. Copy the email from the list above.
               2. Use your database tool to create a manual record in the <code>profiles</code> table.
               3. Use an external tool to send an invite or welcome email.
            </p>
         </div>
      </div>
    </div>
  )
}
