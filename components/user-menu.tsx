'use client'

import { signOut, useSession } from 'next-auth/react'
import { LogOut, User } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

export function UserMenu() {
  const { data: session } = useSession()
  const label = session?.user?.name || session?.user?.email || 'Cuenta'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <User className="size-4" />
        <span className="max-w-28 truncate">{label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {session?.user?.email && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">{session.user.email}</div>
        )}
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/login' })}>
          <LogOut className="size-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
