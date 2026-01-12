"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateAccount } from "@/app/dashboard/settings/actions"
import { toast } from "sonner"
import { useEffect } from "react"

interface AccountFormProps {
    user: {
        name?: string | null
        email?: string | null
    }
}

export function AccountForm({ user }: AccountFormProps) {
  const [state, formAction, isPending] = useActionState(updateAccount, null)

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success)
    } else if (state?.error) {
      toast.error(state.error)
    }
  }, [state])

  return (
    <form action={formAction}>
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Make changes to your account here. Click save when you're done.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={user.name || ""} placeholder="Your Name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" defaultValue={user.email || ""} placeholder="m@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input id="currentPassword" name="currentPassword" type="password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input id="newPassword" name="newPassword" type="password" />
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
