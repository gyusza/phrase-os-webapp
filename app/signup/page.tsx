"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Mic } from 'lucide-react'
import { MultiSelect } from "@/components/ui/multi-select"
import { GoogleButton } from "@/components/ui/google-button"

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="container flex h-14 items-center py-4">
        <Link href="/" className="flex items-center gap-2">
          <Mic className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">PhraseOS</span>
        </Link>
      </div>
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Join the Beta</CardTitle>
            <CardDescription>Create an account to start learning a language the smart way.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GoogleButton text="Sign up with Google" href="#" />
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first-name">First name</Label>
                <Input id="first-name" placeholder="John" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">Last name</Label>
                <Input id="last-name" placeholder="Doe" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="john.doe@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="native-language">Native language (select up to 2)</Label>
              <MultiSelect 
                id="native-language"
                maxSelections={2}
                defaultValue={["danish"]}
                options={[
                  { value: "danish", label: "Danish" },
                  { value: "english", label: "English" },
                  { value: "spanish", label: "Spanish" },
                  { value: "french", label: "French" },
                  { value: "german", label: "German" },
                  { value: "italian", label: "Italian" },
                  { value: "japanese", label: "Japanese" }
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-language">Language you want to learn</Label>
              <Select defaultValue="danish">
                <SelectTrigger id="target-language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="danish">Danish</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="spanish">Spanish</SelectItem>
                  <SelectItem value="french">French</SelectItem>
                  <SelectItem value="german">German</SelectItem>
                  <SelectItem value="italian">Italian</SelectItem>
                  <SelectItem value="japanese">Japanese</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full">Create Account</Button>
            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Log in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}