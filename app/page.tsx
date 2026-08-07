import { redirect } from 'next/navigation'

import { auth } from '@/auth'
import { WorkTracker } from '@/components/work-tracker'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  return <WorkTracker />
}
