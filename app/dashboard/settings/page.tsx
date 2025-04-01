"use client"

import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { User, Globe, Bell, CreditCard } from 'lucide-react'
import DashboardHeader from "@/components/dashboard-header"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url: string
}

interface UserSettings {
  source_languages: string[]
  target_language: string
  notification_preferences: {
    email: boolean
    push: boolean
  }
  theme: string
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchProfileAndSettings()
  }, [])

  const fetchProfileAndSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)

      // Fetch settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (settingsError) throw settingsError
      setSettings(settingsData)
    } catch (error) {
      console.error('Error fetching profile and settings:', error)
      toast({
        title: "Error",
        description: "Failed to load profile and settings.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!profile) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)

      if (error) throw error

    toast({
      title: "Profile updated",
      description: "Your profile information has been saved.",
    })
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveLanguage = async () => {
    if (!settings) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({
          source_languages: settings.source_languages,
          target_language: settings.target_language,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', settings.user_id)

      if (error) throw error

    toast({
      title: "Language settings updated",
      description: "Your language preferences have been saved.",
    })
    } catch (error) {
      console.error('Error updating language settings:', error)
      toast({
        title: "Error",
        description: "Failed to update language settings.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveNotifications = async () => {
    if (!settings) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({
          notification_preferences: settings.notification_preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', settings.user_id)

      if (error) throw error

    toast({
      title: "Notification settings updated",
      description: "Your notification preferences have been saved.",
    })
    } catch (error) {
      console.error('Error updating notification settings:', error)
      toast({
        title: "Error",
        description: "Failed to update notification settings.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <DashboardHeader />
        <main className="flex-1 container py-6">
          <div>Loading...</div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />

      <main className="flex-1 container py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">Manage your account settings and preferences.</p>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-md">
            <TabsTrigger value="profile" className="flex items-center gap-2" id="profile">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="languages" className="flex items-center gap-2" id="languages">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Languages</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2" id="notifications">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2" id="subscription">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Subscription</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Manage your personal information and account settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                    <Label htmlFor="full-name">Full name</Label>
                    <Input 
                      id="full-name" 
                      value={profile?.full_name || ''}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={profile?.email || ''}
                      disabled
                    />
                  </div>
                    <div className="space-y-2">
                    <Label htmlFor="avatar-url">Avatar URL</Label>
                    <Input 
                      id="avatar-url" 
                      value={profile?.avatar_url || ''}
                      onChange={(e) => setProfile(prev => prev ? { ...prev, avatar_url: e.target.value } : null)}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save changes"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="languages">
            <Card>
              <CardHeader>
                <CardTitle>Language Settings</CardTitle>
                <CardDescription>Configure your language learning preferences.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                    <Label htmlFor="source-languages">Source Languages (Select up to 2)</Label>
                    <div className="flex flex-wrap gap-2">
                      {['en', 'hu', 'da', 'de'].map((lang) => (
                        <Button
                          key={lang}
                          variant={settings?.source_languages?.includes(lang) ? "default" : "outline"}
                          onClick={() => {
                            const current = settings?.source_languages || []
                            const newSelection = current.includes(lang)
                              ? current.filter(l => l !== lang)
                              : current.length < 2
                                ? [...current, lang]
                                : current
                            setSettings(prev => prev ? { ...prev, source_languages: newSelection } : null)
                          }}
                        >
                          {lang === 'en' ? 'English' : 
                           lang === 'hu' ? 'Hungarian' : 
                           lang === 'da' ? 'Danish' : 'German'}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target-language">Target Language</Label>
                    <Select 
                      value={settings?.target_language || 'en'}
                      onValueChange={(value) => setSettings(prev => prev ? { ...prev, target_language: value } : null)}
                    >
                      <SelectTrigger id="target-language">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="hu">Hungarian</SelectItem>
                        <SelectItem value="da">Danish</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveLanguage} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save changes"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Manage your notification preferences.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="email-notifications" className="flex flex-col space-y-1">
                      <span>Email notifications</span>
                      <span className="font-normal text-sm text-muted-foreground">
                        Receive email updates about your progress and new features.
                      </span>
                    </Label>
                    <Switch
                      id="email-notifications"
                      checked={settings?.notification_preferences?.email || false}
                      onCheckedChange={(checked) => setSettings(prev => prev ? {
                        ...prev,
                        notification_preferences: {
                          ...prev.notification_preferences,
                          email: checked
                        }
                      } : null)}
                    />
                  </div>
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="push-notifications" className="flex flex-col space-y-1">
                      <span>Push notifications</span>
                      <span className="font-normal text-sm text-muted-foreground">
                        Receive push notifications for daily reminders and achievements.
                      </span>
                    </Label>
                    <Switch
                      id="push-notifications"
                      checked={settings?.notification_preferences?.push || false}
                      onCheckedChange={(checked) => setSettings(prev => prev ? {
                        ...prev,
                        notification_preferences: {
                          ...prev.notification_preferences,
                          push: checked
                        }
                      } : null)}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveNotifications} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save changes"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="subscription">
            <Card>
              <CardHeader>
                <CardTitle>Subscription</CardTitle>
                <CardDescription>Manage your subscription and billing information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Current Plan</h3>
                      <p className="text-sm text-muted-foreground">Free Plan</p>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                <Separator />
                <div className="space-y-4">
                    <h3 className="font-medium">Available Plans</h3>
                    <div className="grid gap-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">Pro Plan</h4>
                          <p className="text-sm text-muted-foreground">$9.99/month</p>
                    </div>
                        <Button variant="outline">Upgrade</Button>
                    </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}